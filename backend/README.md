

# Label Insight Pro – Backend API

This is the Python backend for **Label Insight Pro**, providing OCR analysis using PaddleOCR and product analysis via Open Food Facts.

---

## 🚀 Features

- **PaddleOCR Integration**  
  Extract text from product package images.

- **Intelligent Text Categorization**  
  Automatically categorizes detected text into:
  - Brand Name
  - Marketing Slogans
  - Marketing Claims
  - Nutrition Facts
  - Miscellaneous Text

- **Ingredient Extraction**  
  Identifies and extracts ingredient lists.

- **Product Analysis**  
  Analyze products by barcode using Open Food Facts API.

- **User Personalization**  
  Optional user profile integration for allergies and medical conditions.

---

## ⚙️ Setup Instructions

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

> **Note:**
> - `opencv-python` version must be compatible with PaddleOCR (`<=4.6.0`)
> - Supabase client version should be `supabase-py==2.23.0` or the latest stable release

**Sample `requirements.txt` for Python 3.13:**

```
fastapi==0.104.1
uvicorn==0.24.0
requests==2.31.0
rapidfuzz==3.5.2
python-multipart==0.0.6
pydantic>=2.6.0
pillow==11.0.0
pytesseract==0.3.13
opencv-python<=4.6.0.66
supabase-py==2.23.0
paddleocr==2.7.3
paddlepaddle==2.6.0
```

---

### 2. Run the Server

```bash
uvicorn main:app --reload
```

Server will start at:

```
http://localhost:8000
```

---

### 3. Test the API

Visit:

```
http://localhost:8000/
```

You should see:

```json
{"message": "NutriLabel Analyzer API is running"}
```

---

## 📡 API Endpoints

### 1. OCR Analysis

#### `POST /analyze-image`

- Upload an image file for OCR analysis  
- Content-Type: `multipart/form-data`  
- Body: `file` (image file)

#### `POST /analyze-image-base64`

- Analyze image from a base64 string  
- Content-Type: `application/json`  
- Body:

```json
{ "image": "base64_string_here" }
```

**Sample Response:**

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
  "confidence": 95.5
}
```

---

### 2. Product Analysis

#### `POST /analyze-product`

Analyze product by barcode.

**Body:**

```json
{
  "barcode": "123456789",
  "user_id": "optional_user_id"
}
```

> If `user_id` is provided, personalized recommendations based on allergies/medical conditions are returned.

---

### 3. Product Search

#### `GET /search-product/{product_name}`

Search Open Food Facts database by product name.  
Returns top 10 matches.

---

## 🧠 Technical Details

### PaddleOCR Configuration

- Language: English (`en`)
- Angle Classification: Enabled
- Logging: Disabled (for cleaner output)

---

### Text Categorization Logic

- **Brand Name**: Uppercase text with high confidence at top of image  
- **Slogans**: Text containing exclamation marks or marketing phrases  
- **Marketing Text**: Contains words like "natural", "organic", "premium"  
- **Nutrition Facts**: Contains nutrition keywords like "calories", "protein", etc.  
- **Miscellaneous**: Everything else

---

### Ingredient Extraction

- Looks for patterns like `Ingredients:` followed by comma-separated list  
- Removes percentages, cleans text, and capitalizes ingredient names

---

### CORS Configuration

For development, all origins are allowed:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

For production, restrict `allow_origins` to your frontend domain.

---

## 📦 Requirements

- Python 3.8+ (Python 3.13 confirmed)
- FastAPI
- PaddleOCR
- PaddlePaddle
- PIL (Pillow)
- NumPy
- pytesseract
- OpenCV (compatible version)
- supabase-py

---

## 🛠️ Troubleshooting

### PaddleOCR Installation Issues

- Ensure Python 3.8+
- Install CPU version:

```bash
pip install paddlepaddle==2.6.0
```

- For GPU support:

```bash
pip install paddlepaddle-gpu
```

---

### Port Already in Use

```python
uvicorn.run(app, host="0.0.0.0", port=8001)
```

---

## 🧪 Development

### Using uvicorn

```bash
uvicorn main:app --reload
```

Auto-reloads on code changes.

---

### Using Shell Scripts

**Unix/Mac:**

```bash
cd backend
./start.sh
```

**Windows:**

```bash
cd backend
start.bat
```

---

## 🚀 Production Deployment

### Environment Configuration

Update frontend `.env` with backend URL:

```
VITE_BACKEND_URL=https://your-backend-server.com
```

Restrict CORS in `main.py`:

```python
allow_origins=["https://your-frontend-domain.com"]
```

---

### Deployment Commands

```bash
# Uvicorn with multiple workers
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4

# Or gunicorn with uvicorn workers
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

---

### Recommended Hosting Options

- **VPS/Cloud**: AWS EC2, Google Cloud, DigitalOcean  
- **PaaS**: Railway, Render, Heroku  
- **Serverless**: AWS Lambda + API Gateway (requires modifications)

---

## ✅ Health Check

Root endpoint `/` returns:

```json
{"message": "NutriLabel Analyzer API is running"}
```

