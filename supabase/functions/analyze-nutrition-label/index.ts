import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { callGeminiWithFallback } from '../_shared/gemini.ts';

// Configuration
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const OCR_SPACE_API_KEY = Deno.env.get('OCR_SPACE_API_KEY') || 'K83414045188957';
// Use host.docker.internal for local Supabase -> Host communication
const PADDLE_OCR_URL = Deno.env.get('PADDLE_OCR_URL') || 'http://host.docker.internal:8000/ocr';

interface OCRLine {
  text: string;
  confidence: number;
  box: number[][]; // [[x,y], [x,y], [x,y], [x,y]]
}

interface ProcessedOCR {
  lines: OCRLine[];
  source: 'paddle' | 'ocr.space' | 'ocr.space-fallback';
  grouped_rows: string[][];
  raw_text: string;
}

const OPEN_FOOD_FACTS_API_URL = "https://world.openfoodfacts.org/cgi/search.pl";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- 1. PARSE INPUT ---
    let imageBase64: string;
    try {
      const body = await req.json();
      imageBase64 = body.image;
      if (!imageBase64) throw new Error('No image data found');
    } catch (e) {
      throw new Error('Failed to parse request body');
    }

    if (!imageBase64.startsWith('data:')) {
      imageBase64 = `data:image/jpeg;base64,${imageBase64}`;
    }

    const base64Clean = imageBase64.split(',')[1] || imageBase64;

    // --- 2. PERFORM DUAL-ENGINE OCR ---
    let ocrResult: ProcessedOCR;
    try {
      console.log("Attempting Primary OCR (PaddleOCR)...");
      ocrResult = await callPaddleOCR(base64Clean);
      console.log(`PaddleOCR Success! Lines: ${ocrResult.lines.length}`);
    } catch (paddleError) {
      console.error("PaddleOCR failed or unreachable:", paddleError);
      console.log("Falling back to OCR.space...");
      try {
        ocrResult = await callOCRSpace(base64Clean);
        console.log(`OCR.space Success! Source: ${ocrResult.source}, Lines: ${ocrResult.lines.length}`);
      } catch (ocrSpaceError) {
        console.error("OCR.space failed:", ocrSpaceError);
        throw new Error("Both OCR engines failed. Please ensure the image is clear and try again.");
      }
    }

    // --- 3. IDENTIFY PRODUCT & BRAND (New Step) ---
    console.log("Analyzing OCR for Product Identity...");

    // Prepare concise input for Identity LLM
    const identityInput = `OCR TEXT:\n${ocrResult.raw_text.substring(0, 1500)}`; // limit to first 1.5k chars for speed

    const identityPrompt = `Analyze the OCR text. Extract:
1. Product Name (most prominent)
2. Brand (if clear)
3. List of Ingredients (raw strings)
4. Confidence (0.0 to 1.0) of identification

Strict JSON:
{
  "predicted_product_name": "string" | null,
  "predicted_brand": "string" | null,
  "ingredients": ["string"],
  "confidence": number
}`;

    // Call Gemini for Identification (with Fallback)
    let identityResult = null;
    try {
      const identityBody = {
        contents: [{ role: 'user', parts: [{ text: `${identityInput}\n\n${identityPrompt}` }] }],
        generation_config: { response_mime_type: "application/json" }
      };

      const idResult = await callGeminiWithFallback(identityBody, "Identity", GEMINI_API_KEY);
      const idText = idResult.result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (idText) identityResult = JSON.parse(idText);
      console.log(`Identity Result (Model: ${idResult.usedModel}):`, identityResult);
    } catch (e) {
      console.warn("Identity Step Failed (All models or non-retriable error):", e);
    }

    // --- 4. DATA ENRICHMENT & VALIDATION ---
    let offData = null;
    let enrichmentLogs = [];

    if (identityResult && identityResult.confidence >= 0.6 && identityResult.predicted_product_name) {
      console.log(`Confidence High (${identityResult.confidence}). Searching Open Food Facts...`);

      try {
        // Search OFF
        const candidates = await searchOpenFoodFacts(identityResult.predicted_product_name);

        if (candidates && candidates.length > 0) {
          // We take the top candidate to validate
          const candidate = candidates[0];

          // VALIDATE using Backend Endpoint
          // We need to parse ingredients from OFF string to list for validation
          const offIngredientsList = candidate.ingredients_text
            ? candidate.ingredients_text.split(',').map((s: string) => s.trim())
            : [];

          if (identityResult.ingredients && identityResult.ingredients.length > 0 && offIngredientsList.length > 0) {
            console.log("Validating ingredients overlap...");
            const validation = await callValidationEndpoint({
              ocr_ingredients: identityResult.ingredients,
              off_ingredients: offIngredientsList
            });

            console.log("Validation Result:", validation);
            enrichmentLogs.push(`Validation Score: ${validation.overlap_score}`);

            if (validation.overlap_score >= 0.5) {
              console.log("VALIDATION PASSED! Enriched Data Accepted.");
              offData = candidate;
              enrichmentLogs.push("Enrichment ACCEPTED");
            } else {
              console.warn("VALIDATION FAILED. Ingredients mismatch.");
              enrichmentLogs.push("Enrichment REJECTED (Low Ingredient Match)");
            }
          } else {
            // If no ingredients to compare, we might skip enrichment or be conservative
            // For safety, we skip enrichment if we can't validate ingredients
            console.warn("Cannot validate (missing ingredients in OCR or OFF). Skipping enrichment.");
          }
        } else {
          console.log("No OFF results found.");
        }
      } catch (err) {
        console.error("Enrichment process error:", err);
      }
    } else {
      console.log("Skipping enrichment (Low confidence or missing name).");
    }

    // --- 5. PREPARE FINAL LLM PAYLOAD ---
    const inferredName = identityResult?.predicted_product_name || inferProductName(ocrResult.lines);

    const tableStructure = ocrResult.grouped_rows.length > 0
      ? JSON.stringify(ocrResult.grouped_rows)
      : ocrResult.raw_text;

    const inputDescription = ocrResult.grouped_rows.length > 0
      ? "OCR OUTPUT (STRUCTURED ROWS - PRE-GROUPED BY LAYOUT):"
      : "OCR OUTPUT (RAW TEXT - NO LAYOUT DETECTED):";

    const enrichmentContext = offData
      ? `\n\nOPEN FOOD FACTS ENRICHMENT (Use this ONLY to fill GAPS. OCR data takes priority): ${JSON.stringify(offData)}`
      : "";

    console.log("Sending to Gemini (Final Analysis)...");

    // --- 6. CALL GEMINI (Final) ---
    if (!GEMINI_API_KEY) throw new Error("No Gemini API Key provided");

    const systemPrompt = `You are a nutrition expert analyzing a product label via OCR.
You are receiving PRE-PROCESSED OCR DATA and optional ENRICHMENT DATA.

OBJECTIVE:
Extract structured nutrition info, ingredients, and calculate a 'Product Health Score'.

DATA SOURCE RULES:
1. PRIORITY: OCR Data > Open Food Facts (Enrichment) > Inference.
2. If OCR clearly shows a value, USE IT. Only uses Enrichment to fill missing gaps (e.g., missing category, missing allergen list).
3. If Enriched data is provided, it has essentially passed validation. You may use it for 'Product Name', 'Brand', and missing nutrients.
4. NO HALLUCINATION: If a nutrient is NOT in OCR and NOT in Enrichment, return null. DO NOT default to 0g.

OUTPUT SCHEMA:
{
  "product_name": "Verified Name",
  "brand_name": "Brand",
  "ingredients": ["Ingredient 1", ...],
  "nutritional_info": {
    "energy_kcal": 100 | null, 
    "fat": 10.5 | null,
    "saturated_fat": 1.2 | null,
    "carbohydrates": 20 | null,
    "sugar": 15 | null,
    "protein": 5 | null,
    "sodium_mg": 100 | null
  },
  "ocr_score": {
    "score": 0-100,
    "grade": "A"|"B"|"C"|"D"|"E",
    "explanation": "Short sentence explaining the score.",
    "breakdown": [
      { "label": "Reason", "points": "+10" or "-5", "type": "positive"|"negative" }
    ],
    "confidence_note": "Mention if score is conservative due to missing nutrition data."
  }
}

SCORING LOGIC (Custom OCR Score):
- Start at 50 points.
- +10 for short ingredient list (<5 items).
- -15 for 'High Sugar' (>22.5g) or 'sugar' in top 3 ingredients.
- -10 for each Ultra-Processed additive (e.g. E-numbers, HFC, preservatives).
- +10 for 'High Protein' (>10g).
- -20 if completely NO nutrition data is found (Uncertainty Penalty).
- Max 100, Min 0.`;

    let finalJson;
    try {
      const finalBody = {
        contents: [{
          role: 'user',
          parts: [{ text: `${inputDescription}\n${tableStructure}\n\nINFERRED PRODUCT NAME: ${inferredName || "Unknown"}${enrichmentContext}` }]
        }],
        system_instruction: { parts: [{ text: systemPrompt }] },
        generation_config: {
          max_output_tokens: 1500,
          temperature: 0.1,
          response_mime_type: "application/json"
        }
      };

      const finalResult = await callGeminiWithFallback(finalBody, "Final Analysis", GEMINI_API_KEY);
      const resultText = finalResult.result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!resultText) throw new Error("Empty response from Gemini");

      finalJson = JSON.parse(resultText.replace(/```json/g, '').replace(/```/g, '').trim());

      // Attach used model for debugging
      finalJson.meta = finalJson.meta || {};
      finalJson.meta.gemini_model = finalResult.usedModel;

    } catch (err: any) {
      console.error("Gemini Final Analysis Failed:", err);

      // 7. GRACEFUL FALLBACK (If Rate Limited)
      if (err.message && (err.message.includes("Rate limit") || err.message.includes("All Gemini models failed"))) {
        console.log("Triggering Graceful Fallback Response...");
        finalJson = {
          product_name: identityResult?.predicted_product_name || inferredName || "Detected Product",
          brand_name: identityResult?.predicted_brand || null,
          ingredients: identityResult?.ingredients || [],
          nutritional_info: {
            energy_kcal: null, fat: null, saturated_fat: null, carbohydrates: null,
            sugar: null, protein: null, sodium_mg: null
          },
          ocr_score: {
            score: 0,
            grade: "N/A",
            explanation: "Automated analysis temporarily unavailable due to high service load. Displaying raw data.",
            breakdown: [],
            confidence_note: "Fallback mode active due to API rate limits."
          },
          fallback_mode: true
        };
      } else {
        throw err; // Rethrow parsing errors or other non-rate-limit errors
      }
    }

    // Attach debug info
    finalJson.meta = {
      ocr_source: ocrResult.source,
      ocr_lines_count: ocrResult.lines.length,
      structured_text: tableStructure,
      inferred_name: inferredName,
      is_enriched: !!offData
    };
    finalJson.raw_text = ocrResult.raw_text;

    return new Response(JSON.stringify(finalJson), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Processing Error:', error);
    return new Response(JSON.stringify({
      error: error.message || 'An error occurred',
      details: error.toString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// --- HELPER FUNCTIONS ---

async function callPaddleOCR(base64Image: string): Promise<ProcessedOCR> {
  // Call the dedicated Python microservice
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const res = await fetch(PADDLE_OCR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_base64: base64Image }),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!res.ok) throw new Error(`PaddleOCR Service Error: ${res.statusText}`);

    const data = await res.json();
    const lines: OCRLine[] = data.lines || [];

    if (lines.length === 0) throw new Error("PaddleOCR returned no lines");

    // Group rows
    const grouped = groupLinesIntoRows(lines);
    const rawText = lines.map(l => l.text).join('\n');

    return {
      lines,
      source: 'paddle',
      grouped_rows: grouped,
      raw_text: rawText
    };
  } catch (e) {
    throw e;
  }
}

async function callOCRSpace(base64Image: string): Promise<ProcessedOCR> {
  const formData = new FormData();
  formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`);
  formData.append('apikey', OCR_SPACE_API_KEY);
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'true'); // Required for layout
  formData.append('OCREngine', '2');

  const res = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (data.IsErroredOnProcessing) throw new Error(data.ErrorMessage?.[0] || "Unknown OCR Error");

  const result = data.ParsedResults?.[0];
  if (!result) throw new Error("No OCR result");

  const overlay = result.TextOverlay;
  const rawText = result.ParsedText || "";

  // If overlay is available, we can reconstruct lines
  if (overlay && overlay.Lines && overlay.Lines.length > 0) {
    const lines: OCRLine[] = overlay.Lines.map((l: any) => {
      // OCR.space gives Words (Lines -> Words). We need to aggregate or take line text.
      // Actually overlay.Lines has 'LineText'. 
      // Box is tricky. Lines don't have a single box in their JSON usually, Words do.
      // But typically overlay.Lines is [{ LineText: "...", Words: [...] }]
      // We can approximate the box from the first and last word, or just use Words.
      // Let's iterate lines and aggregate words to get a bounding box.

      const words = l.Words || [];
      const text = l.LineText;
      let minTop = 99999, minLeft = 99999, maxBot = 0, maxRight = 0;

      words.forEach((w: any) => {
        if (w.Top < minTop) minTop = w.Top;
        if (w.Left < minLeft) minLeft = w.Left;
        if (w.Top + w.Height > maxBot) maxBot = w.Top + w.Height;
        if (w.Left + w.Width > maxRight) maxRight = w.Left + w.Width;
      });

      // If words are missing but text exists (rare), skip logic
      if (words.length === 0) return null;

      return {
        text: text,
        confidence: 0.9, // OCR.space doesn't give line conf merely word conf
        box: [[minLeft, minTop], [maxRight, minTop], [maxRight, maxBot], [minLeft, maxBot]]
      };
    }).filter((l: any) => l !== null);

    return {
      lines: lines,
      source: 'ocr.space',
      grouped_rows: groupLinesIntoRows(lines),
      raw_text: rawText
    };
  }

  // Fallback to flat text if no overlay
  return {
    lines: [],
    source: 'ocr.space-fallback',
    grouped_rows: [],
    raw_text: rawText
  };
}

function groupLinesIntoRows(lines: OCRLine[]): string[][] {
  if (lines.length === 0) return [];

  // simple clustering by Y center
  // 1. Calculate center Y for each line
  const withY = lines.map(line => {
    // Box is [[x,y], [x,y], [x,y], [x,y]]
    // cy = average of all ys
    const ys = line.box.map(p => p[1]);
    const cy = ys.reduce((a, b) => a + b, 0) / ys.length;
    const height = Math.max(...ys) - Math.min(...ys);
    return { ...line, cy, height, x: line.box[0][0] };
  });

  // 2. Sort by Y
  withY.sort((a, b) => a.cy - b.cy);

  // 3. Group
  const rows: typeof withY[] = [];
  let currentRow: typeof withY = [];

  // Adaptive threshold? usually 50% of text height
  const avgHeight = withY.reduce((sum, item) => sum + item.height, 0) / withY.length;
  const threshold = avgHeight * 0.6;

  withY.forEach((item) => {
    if (currentRow.length === 0) {
      currentRow.push(item);
    } else {
      // Compare with average Y of current row
      const rowY = currentRow.reduce((sum, i) => sum + i.cy, 0) / currentRow.length;
      if (Math.abs(item.cy - rowY) < threshold) {
        currentRow.push(item);
      } else {
        rows.push(currentRow);
        currentRow = [item];
      }
    }
  });
  if (currentRow.length > 0) rows.push(currentRow);

  // 4. Sort each row by X and extract text
  return rows.map(row => {
    row.sort((a, b) => a.x - b.x);
    return row.map(r => r.text);
  });
}

async function searchOpenFoodFacts(name: string): Promise<any[]> {
  try {
    const url = `${OPEN_FOOD_FACTS_API_URL}?search_terms=${encodeURIComponent(name)}&search_simple=1&action=process&json=1&page_size=5`;
    console.log(`Searching OFF: ${url}`);
    const res = await fetch(url);
    if (!res.ok) return [];

    const data = await res.json();
    return data.products || [];
  } catch (e) {
    console.error("OFF Fetch Error:", e);
    return [];
  }
}

async function callValidationEndpoint(payload: { ocr_ingredients: string[], off_ingredients: string[] }) {
  // Determine Backend URL
  const backendUrl = Deno.env.get('PADDLE_OCR_URL')?.replace('/ocr', '') || 'http://host.docker.internal:8000';
  const validateUrl = `${backendUrl}/validate-ingredients`;

  try {
    console.log(`Calling Validation Backend: ${validateUrl}`);
    const res = await fetch(validateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      console.error(`Validation Endpoint Error: ${res.status}`);
      return { overlap_score: 0, matches: [] };
    }

    return await res.json();
  } catch (e) {
    console.error("Validation Call Failed:", e);
    return { overlap_score: 0, matches: [] };
  }
}

function inferProductName(lines: OCRLine[]): string | null {
  if (!lines || lines.length === 0) return null;

  // 1. Calculate approximate font height for each line
  const linesWithHeight = lines.map(l => {
    // box is [[x,y], [x,y], [x,y], [x,y]]
    // height = max_y - min_y
    const ys = l.box.map(p => p[1]);
    const height = Math.max(...ys) - Math.min(...ys);
    return { text: l.text, height };
  });

  // 2. Sort by height (descending) - assume product name is largest text
  linesWithHeight.sort((a, b) => b.height - a.height);

  // 3. Take top 3 largest lines
  const candidates = linesWithHeight.slice(0, 3);

  // 4. Filter and cleanup
  const ignoreTerms = ["nutrition", "facts", "ingredients", "net weight", "net wt", "calories", "serving", "per"];

  const cleanName = candidates
    .filter(c => !ignoreTerms.some(term => c.text.toLowerCase().includes(term)))
    .map(c => c.text)
    .join(" ");

  return cleanName.length > 3 ? cleanName : null;
}

// Deprecated in favor of searchOpenFoodFacts
async function fetchOpenFoodFactsData(name: string): Promise<any | null> {
  const products = await searchOpenFoodFacts(name);
  if (products.length > 0) {
    const p = products[0];
    return {
      product_name: p.product_name,
      brands: p.brands,
      categories: p.categories,
      nutriscore: p.nutriscore_grade,
      ingredients_text: p.ingredients_text
    };
  }
  return null;
}

// --- FALLBACK ROUTING LOGIC MOVED TO _shared/gemini.ts ---
