import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

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

    // Clean base64 for APIs
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

    // --- 3. PREPARE LLM PAYLOAD ---
    // If we have proper rows, we format them nicely
    const tableStructure = ocrResult.grouped_rows.length > 0
      ? JSON.stringify(ocrResult.grouped_rows)
      : ocrResult.raw_text;

    const inputDescription = ocrResult.grouped_rows.length > 0
      ? "OCR OUTPUT (STRUCTURED ROWS - PRE-GROUPED BY LAYOUT):"
      : "OCR OUTPUT (RAW TEXT - NO LAYOUT DETECTED):";

    console.log("Sending to Gemini...");

    // --- 4. CALL GEMINI ---
    if (!GEMINI_API_KEY) throw new Error("No Gemini API Key provided");

    const systemPrompt = `You are a nutrition expert extracting data from OCR results.
You are receiving PRE-PROCESSED OCR DATA. 
If the data is provided as a JSON array of rows (e.g., [["Energy", "100kcal"], ...]), TRUST THE ROW GROUPING.

CRITICAL RULES:
1. PRESERVE STRUCTURE: The input rows represent physical alignment. Do NOT hallucinate values that are not in the same row.
2. EXTRACT EXACT VALUES: Map keys (like "Protein", "Sugars") to their values in the SAME row.
3. INGREDIENTS: Extract the full ingredients list. Join multiple lines if they are part of the ingredients block.
4. DO NOT GUESS: If a value is missing or ambiguous, return null or empty string. Do not invent numbers.
5. SCHEMA: Return the EXACT JSON schema requested.

JSON Schema:
{
  "product_name": "Product Name",
  "ingredients": ["Ingredient 1", "Ingredient 2", ...],
  "allergens": ["Allergen 1", ...],
  "nutritional_info": {
    "energy_kj": "value",
    "energy_kcal": "value", 
    "protein": "value",
    "total_fat": "value",
    "saturated_fat": "value",
    "trans_fat": "value",
    "carbohydrate": "value",
    "sugars": "value",
    "dietary_fiber": "value",
    "sodium": "value",
    "cholesterol": "value"
  },
  "health_analysis": "Summary",
  "health_score": "1-10",
  "alerts": [],
  "suggestions": []
}`;

    const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: `${inputDescription}\n\n${tableStructure}` }]
        }],
        system_instruction: { parts: [{ text: systemPrompt }] },
        generation_config: {
          max_output_tokens: 1500,
          temperature: 0.1,
          response_mime_type: "application/json"
        }
      }),
    });

    if (!geminiResponse.ok) {
      const err = await geminiResponse.json();
      throw new Error(`Gemini Error: ${JSON.stringify(err)}`);
    }

    const geminiData = await geminiResponse.json();
    const resultText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!resultText) throw new Error("Empty response from Gemini");

    const finalJson = JSON.parse(resultText.replace(/```json/g, '').replace(/```/g, '').trim());

    // Attach debug info
    finalJson.meta = {
      ocr_source: ocrResult.source,
      ocr_lines_count: ocrResult.lines.length
    };
    finalJson.raw_text = ocrResult.raw_text; // Backward compatibility

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