# NutriSense - OCR & Text Extraction Service

This is the dedicated OCR backend for **NutriSense**, responsible exclusively for extracting and structuring text from food label images. It utilizes **PaddleOCR** to perform high-accuracy text detection on product packaging.

## 🔗 Integration

This OCR service is used by NutriSense’s **Supabase Edge Functions** to:
- Perform reasoning via LLMs (Gemini).
- Validate and post-process structured OCR output.
- Enrich product data using Open Food Facts.
- Generate user-specific health insights.

---

## 🚀 Features

- **PaddleOCR Integration**: Robust text extraction from complex, curved, or shiny packaging.
- **Rule-based Text Structuring**: Automatically categorizes raw OCR output into:
  - Brand Name
  - Marketing Slogans
  - Nutrition Facts
  - Ingredient Lists
  - Miscellaneous Text
- **Ingredient Parsing**: Specialized logic to identify, clean, and extract ingredient blocks from raw text.

---

## ⚙️ Setup Instructions

### 1. Prerequisites
- **Python 3.11** (Required)
- **PaddleOCR** requirements

### 2. Install Dependencies

```bash
cd backend
python -m venv venv
# Activate venv (Windows: .\venv\Scripts\activate, Mac/Linux: source venv/bin/activate)
pip install -r requirements.txt
```

**Sample `requirements.txt` for Python 3.11:**

```text
fastapi==0.104.1
uvicorn==0.24.0
requests==2.31.0
rapidfuzz==3.5.2
python-multipart==0.0.6
pydantic>=2.6.0
pillow==11.0.0
pytesseract==0.3.13
opencv-python<=4.6.0.66
paddleocr==2.7.3
paddlepaddle==2.6.0
```

### 3. Run the Server

```bash
uvicorn main:app --reload
```
The server will start at `http://localhost:8000`.

### 4. Health Check

Visit `http://localhost:8000/` to verify:
```json
{"message": "NutriLabel Analyzer API is running"}
```

---

## 📡 API Endpoints

### OCR Analysis

#### `POST /analyze-image`
- **Description**: Upload a raw image file for text extraction and structuring.
- **Content-Type**: `multipart/form-data`
- **Body**: `file` (image binary)

#### `POST /analyze-image-base64`
- **Description**: Analyze an image provided as a base64 string.
- **Content-Type**: `application/json`
- **Body**:
  ```json
  { "image": "base64_string_here" }
  ```

**Response Format:**
```json
{
  "success": true,
  "ingredients": ["Water", "Sugar", "..."],
  "categorized_text": {
    "brand_name": "Brand Name",
    "slogans": ["Tagline here"],
    "marketing_text": ["Natural", "Organic"],
    "nutrition_facts": {"Calories": "100", "Protein": "5g"},
    "miscellaneous": ["Other text"]
  },
  "raw_text": "Full extracted text",
  "confidence": 95.5 // OCR engine confidence score
}
```

---

## 🧠 Technical Details

### PaddleOCR Configuration
- **Language**: English (`en`)
- **Angle Classification**: Enabled for rotated labels.
- **Heuristics**: Optimized for packaging text density.

### Text Categorization Logic
The backend applies heuristic rules to structure the unstructured OCR output:
- **Brand Name**: Detected via position (top) and confidence/size.
- **Ingredients**: Extracted using regex patterns scanning for "Ingredients:" markers.
- **Nutrition Facts**: Identified by keywords like "Calories", "Total Fat", "Protein".

---

## 🛠️ Troubleshooting

### PaddleOCR & OpenCV
If you encounter errors related to `libgl` or `opencv`:
- Ensure you are using `opencv-python<=4.6.0.66` as newer versions may conflict with PaddleOCR dependencies in some environments.

### Port Conflicts
If port 8000 is busy, run on a different port:
```bash
uvicorn main:app --host 0.0.0.0 --port 8001
```
