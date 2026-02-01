# NutriSense - Devfolio Submission Content

## 🚀 The Problem it Solves
We've all stood in a supermarket aisle, turning over a packet of chips or a "healthy" health drink, staring at the nutrition label and wondering, *"Is this actually good for me?"*

Nutrition labels are cryptic. They list "E-numbers," hidden sugars under scientific names (like Maltodextrin or Dextrose), and standard serving sizes that don't match reality. For people with specific health conditions—like **Diabetes, Hypertension, or Gluten Intolerance**—this confusion isn't just annoying; it's dangerous.

**NutriSense** is an AI-powered personal nutritionist in your pocket that bridges this gap at the **moment of purchase**.

Instead of just performing OCR (Optical Character Recognition), NutriSense:
1.  **Decodes the Data**: Instantly extracts and structures messy text from curved packaging.
2.  **Contextualizes for YOU**: Cross-references the ingredients with **your specific health profile** (age, allergies, health goals).
3.  **Visualizes Impact**: Assigns a custom **Health Score** and grades the product based on processing levels (NOVA group) and nutritional density.
4.  **Suggests Better Options**: If a product is unhealthy, it doesn't just judge—it suggests **Healthier Alternatives** that are actually available.

It empowers users to make informed, data-driven food choices instantly, turning a complex chemical list into a simple "Yes/No" breakdown.

---

## 💡 Challenges we ran into

### 1. The "Hallucinating" LLM & JSON Reliability
One of the biggest hurdles was getting the AI (Gemini) to consistently return VALID JSON.
*   **The Bug**: The LLM would often add conversational filler ("Here is the JSON you asked for...") or wrap code in markdown blocks with trailing text, which caused our frontend to crash with `SyntaxError`.
*   **The Fix**: We implemented a robust **"JSON Extraction Strategy"** in our Edge Functions. Instead of trusting `JSON.parse` blindly, we added a pre-processing layer that regex-matches the first `{` and last `}` to isolate the payload, and we implemented a retry mechanism that falls back to rule-based generation if the syntax is irretrievably broken.

### 2. Rate Limiting at Scale (The "429" Nightmare)
Deep learning models are expensive and rate-limited. During testing, we hit the Gemini API rate limits (`429 Too Many Requests`) constantly, which caused the entire app to error out.
*   **The Fix**: We engineered a **Smart Fallback Chain** in our backend.
    *   **Layer 1**: Try `Gemini 2.5 Flash` (Fastest).
    *   **Layer 2**: If rate-limited, auto-switch to `Gemini 2.5 Flash-Lite`.
    *   **Layer 3**: If still blocked, try `Gemini 3 Flash` (Newer/Lower traffic).
    *   **Layer 4 (Safety Net)**: If *all* AI models fail, the system degrades gracefully to a **Rule-Based Fallback Mode** (using Regex to detect sugar/allergens) so the user *never* sees a crash, just a "basic" analysis.

### 3. OCR Accuracy on Curved Surfaces
Reading text from crinkled wrappers (like chips packets) is notoriously difficult. Standard OCR libraries often output garbage strings like `Sug@r` or `Pr0tein`.
*   **The Fix**: We built a **Dual-Engine OCR Pipeline** + **LLM Correction**.
    *   First, we attempt **PaddleOCR** (optimized for density).
    *   If confidence is low, we fall back to **OCR.space**.
    *   Finally, we feed the raw, messy text into an LLM with the prompt *"Repair this nutrition label list,"* which uses context to infer that "Sodlum" is "Sodium" and "C@rb" is "Carbohydrates."

---

## 🛠 Technologies Used
*   **Frontend**: React, Vite, Tailwind CSS, Shadcn UI, Lucid React
*   **Backend / Edge**: Supabase Edge Functions (Deno/TypeScript)
*   **AI Models**: Google Gemini 2.5 Flash (Multimodal), Gemini 3.0
*   **OCR**: PaddleOCR (Python Microservice), OCR.space API
*   **Database**: Supabase (PostgreSQL)
*   **External Data**: Open Food Facts API (for product verification)

## 🛤 Tracks Applied
*(Select the ones relevant to the hackathon)*
*   **AI & LLM**: (Core utilization of Gemini and RAG-like verification)
*   **Health & Wellness**: (Primary domain)
*   **Mobile / Web App**: (Responsive PWA implementation)
