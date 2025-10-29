# Label Insight Pro - Backend API

This is the Python backend for Label Insight Pro that provides OCR analysis using PaddleOCR and product analysis via Open Food Facts.

## Features

- **PaddleOCR Integration**: Extract text from product package images
- **Intelligent Text Categorization**: Automatically categorizes detected text into:
  - Brand Name
  - Marketing Slogans
  - Marketing Claims
  - Nutrition Facts
  - Miscellaneous Text
- **Ingredient Extraction**: Identifies and extracts ingredient lists
- **Product Analysis**: Analyzes products by barcode using Open Food Facts API

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Run the Server

```bash
python main.py
```

The server will start on `http://localhost:8000`

### 3. Test the API

Visit `http://localhost:8000` to see the health check message.

## API Endpoints

### OCR Analysis

**POST /analyze-image**
- Upload an image file for OCR analysis
- Content-Type: multipart/form-data
- Body: file (image file)

**POST /analyze-image-base64**
- Analyze image from base64 string
- Content-Type: application/json
- Body: `{ "image": "base64_string_here" }`

Response:
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

### Product Analysis

**POST /analyze-product**
- Analyze product by barcode
- Body: `{ "barcode": "123456789", "health_conditions": [] }`

## Technical Details

### PaddleOCR Configuration
- Language: English
- Angle Classification: Enabled
- Logging: Disabled (for cleaner output)

### Text Categorization Logic

The backend uses keyword matching and pattern recognition to categorize text:

1. **Brand Name**: Uppercase text with high confidence at the top of the image
2. **Slogans**: Text containing exclamation marks or marketing phrases
3. **Marketing Text**: Contains words like "natural", "organic", "premium", etc.
4. **Nutrition Facts**: Contains nutrition keywords like "calories", "protein", etc.
5. **Miscellaneous**: Everything else

### Ingredient Extraction

The system looks for patterns like:
- "Ingredients:" followed by comma-separated list
- Removes percentages and cleans up text
- Capitalizes ingredient names for consistency

## CORS Configuration

The backend allows all origins (`*`) for development. For production, update the CORS settings in `main.py` to restrict to your frontend domain.

## Requirements

- Python 3.8+
- FastAPI
- PaddleOCR
- PaddlePaddle
- PIL (Pillow)
- NumPy

## Troubleshooting

### PaddleOCR Installation Issues

If you encounter issues installing PaddlePaddle:
1. Make sure you have Python 3.8 or newer
2. Try installing with: `pip install paddlepaddle==2.6.0`
3. For GPU support, install: `pip install paddlepaddle-gpu`

### Port Already in Use

If port 8000 is already in use, modify the port in `main.py`:
```python
uvicorn.run(app, host="0.0.0.0", port=8001)
```

## Development

### Running with npm scripts (Recommended)

From the project root directory:

```bash
# Install Python dependencies
npm run backend:install

# Start the backend server
npm run backend:start

# Run both frontend and backend together
npm run dev:all
```

### Running with shell scripts

**Unix/Mac:**
```bash
cd backend
./start.sh
```

**Windows:**
```batch
cd backend
start.bat
```

The backend automatically reloads when code changes are detected (when run with `uvicorn --reload`).

## Production Deployment

### Environment Configuration

1. Update frontend `.env` file with production backend URL:
```
VITE_BACKEND_URL=https://your-backend-server.com
```

2. Update CORS settings in `main.py`:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://your-frontend-domain.com"],  # Replace with actual domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Deployment Checklist

- [ ] Set production backend URL in frontend `.env`
- [ ] Update CORS origins in `backend/main.py`
- [ ] Install Python dependencies: `pip install -r requirements.txt`
- [ ] Test backend health endpoint: `curl https://your-backend-server.com/`
- [ ] Verify OCR endpoint is accessible from frontend
- [ ] Configure SSL/TLS certificates for HTTPS
- [ ] Set up process manager (PM2, systemd, or supervisor)
- [ ] Configure reverse proxy (nginx or similar)

### Production Server

For production deployment, use a production-ready server:

```bash
# Using uvicorn with multiple workers
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4

# Or using gunicorn with uvicorn workers
gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### Recommended Hosting Options

- **VPS/Cloud**: AWS EC2, Google Cloud Compute, DigitalOcean Droplets
- **Platform as a Service**: Railway, Render, Heroku
- **Serverless**: AWS Lambda with API Gateway (requires modifications)

### Health Check

The root endpoint `/` returns a simple health check message:
```json
{"message": "NutriLabel Analyzer API is running"}
```

Use this endpoint to verify the backend is running and accessible.
