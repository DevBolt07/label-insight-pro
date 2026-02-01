# NutriSense
Personalized AI-powered food label understanding for healthier choices at the moment of purchase.

## Introduction 📖
NutriSense is an intelligent dietary assistant designed to help consumers make smarter food choices instantly. By combining OCR technology with advanced LLMs, it deciphers complex food labels and provides personalized insights based on your specific health goals and dietary restrictions. It is designed for health-conscious individuals, people with dietary restrictions (allergies, diabetes, veganism), and anyone who finds food packaging confusing. It provides critical clarity at the exact moment of purchase, helping users avoid harmful ingredients before they buy.

## Problem Statement ⚠️
Reading and understanding food labels is a real-world challenge.
- **Complex Jargon:** Ingredients lists are full of chemical names, numbers, and hidden sugars that confuse the average consumer.
- **Time Constraints:** Shoppers do not have time to research every ingredient in the aisle.
- **Health Constraints:** For people with severe allergies or conditions like hypertension, missing one small line of text can have serious health consequences.
- **Physical Readability:** Labels are often printed in tiny fonts on curved or reflective surfaces, making them physically hard to read.

## Solution Overview 💡
NutriSense solves these problems with a responsive web application optimized for mobile usage:
- **Dual Scanning Flow:** We support both Barcode scanning (for instant database lookup) and visual OCR scanning (for extracting text from raw images of packaging).
- **Personalized Analysis:** Unlike generic scanners, we analyze the data against *your* unique profile.
- **Actionable Insights:** We provide a clear proprietary health score (0-100), concise summaries, and immediate alerts (e.g., "Contains Gluten").
- **Graceful Fallback:** If one method fails (e.g. unknown barcode), the system automatically attempts visual recognition, ensuring the user is never left without an answer.

## Key Features ✨
- **Barcode Scanning**: Rapid retrieval of product data using the Open Food Facts database.
- **OCR Based Label Scanning**: Advanced text extraction for products without barcodes or with unreadable codes.
- **Intelligent Product Identification**: AI-driven matching of OCR text to known products to enrich data.
- **Personalized Health Analysis**: Insights are tailored to the user's specific age, gender, allergies, and health goals.
- **Alerts & Warnings**: Prominent red flags for detected allergens or incompatible ingredients.
- **Health Score & Explanation**: A simple, color-coded score accompanied by a natural language explanation of *why* the score was given.
- **Alternative Suggestions**: Smart recommendations for healthier product alternatives when a scanned item scores poorly.
- **Graceful Fallback**: A robust multi-layer system that ensures analysis is provided even when data is incomplete.

## System Architecture 🏗️
The platform is built on a modern, scalable architecture:
- **Frontend**: A high-performance React application using Vite and Tailwind CSS for a responsive user interface.
- **Backend Services**: A dedicated Python FastAPI service handles CPU-intensive OCR tasks (PaddleOCR).
- **LLM Layer**: Google Gemini acts as the reasoning engine to interpret ingredients and generate health insights.
- **Data Integrations**: Seamless integration with Open Food Facts for global product data.
- **Validation Layers**: Multiple validation steps, including RapidFuzz for string matching, ensure data accuracy and reduce hallucinations.

## How It Works (Step-by-Step Flow) 🔄
1. **User Scan**: Users scan a barcode or capture a photo of the nutrition label.
2. **OCR / Product Detection**: The system first checks the barcode; if missing, it processes the image through PaddleOCR/OCR.space.
3. **Validation**: Extracted text is validated against known product databases to ensure accuracy.
4. **Enrichment**: Additional nutritional data is fetched if the product is identified.
5. **Health Analysis**: Gemini analyzes the combined data against the user's health profile.
6. **UI Rendering**: The result is displayed as an easy-to-read scorecard with actionable advice.

## Tech Stack 💻

**Frontend:**
- React
- TypeScript
- Tailwind CSS
- shadcn/ui

**Backend & APIs:**
- FastAPI (Python)
- Supabase Edge Functions (Deno + TypeScript)

**AI & OCR:**
- Google Gemini APIs
- PaddleOCR
- OCR.space

**Data & Utilities:**
- Supabase (PostgreSQL + Auth)
- Open Food Facts API
- RapidFuzz

## Project Structure 🗂️

label-insight-pro/
 ├─ src/                # React frontend
 ├─ backend/            # FastAPI OCR service
 ├─ supabase/functions/ # Edge functions (LLM & analysis)
 └─ README.md

## Setup & Local Development ⚙️

### Frontend
```bash
# Clone the repository
git clone <repository_url>
cd label-insight-pro

# Install dependencies
npm install

# Run development server
npm run dev
```

### Backend OCR service
Requires **Python 3.11**.

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# Run FastAPI server
uvicorn main:app --reload
```

## Environment Variables
To run the project, you must check the `.env` file and configure the necessary keys, specifically for **Google Gemini** and **Supabase**.

## Live Application 🌐
- Web App: <https://label-insight-pro.web.app/>

## Demo Credentials 🔐

In case sign-up/login fails during evaluation, you can use the following demo account:

- **Email:** lakhanehemant@gmail.com  
- **Password:** Pass123

## Demo 🎥
- **Demo Video:** <https://youtu.be/ep9D7by4MW0?si=tIRFDuc4y9d8Mve0>

## Screenshots 📸
![alt text](<home page hack.jpeg>)
![alt text](<maggy barcode scan hack.jpeg>)
![alt text](<personal info hack.jpeg>)
![alt text](<ingredients hack.jpeg>) ![alt text](<energy hack.jpeg>) ![alt text](<additives hack.jpeg>)  ![alt text](<ocr hack rice noodle.jpeg>)    ![alt text](<history hack.jpeg>)



## Challenges & Learnings 🧠
- **OCR on real packaging:** Identifying text on curved, shiny, or crinkled packaging was significantly harder than digital documents. We implemented hybrid OCR engines to solve this.
- **Inconsistent public product data:** Open databases often have missing fields. We built fallback layers to ensure potential analysis even with partial data.
- **LLM rate limits:** We optimized our prompt engineering and token usage to stay within API limits while maintaining accuracy.
- **Invalid JSON from LLM:** We implemented strict output parsing and retry mechanisms to handle cases where the AI returned malformed data.
- **Reliable fallback systems:** Creating a user experience that feels seamless even when the primary data source fails was a key architectural learning.

## Why This Project Is Valuable 🌍
NutriSense empowers consumers to take control of their health in a confusing marketplace. It shifts the power balance from marketing teams to the consumer, enabling safer choices for people with allergies and healthier lifestyles for everyone. It turns the complex chore of label reading into a simple, instant verification.

## Disclaimer ⚠️
NutriSense is an informational and decision-support tool only.  
It does not provide medical advice or diagnosis.  
Users are encouraged to consult qualified healthcare professionals for medical decisions.

## Team 👥
- Hemantkumar Lakhane
- Tanmay Kumbhare
- Rushikesh Shinde
- Ira Khandelwal