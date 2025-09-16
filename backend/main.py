# main.py 
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
import re
from rapidfuzz import process, fuzz 
import json
from typing import List, Dict, Optional
import os

app = FastAPI(title="Label Insight Pro API")

# CORS middleware to allow frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
) 
 
# User profile model  
class UserProfile(BaseModel):
    age: int
    hasDiabetes: bool = False
    hasHighBP: bool = False
    isChild: bool = False
    hasHeartDisease: bool = False
    isPregnant: bool = False
    allergies: List[str] = []

# Request model
class AnalysisRequest(BaseModel):
    barcode: str
    user_profile: UserProfile

# Response model
class IngredientAnalysis(BaseModel):
    original: str
    normalized: str
    category: str  # safe, moderate, harmful
    description: str
    risk_level: int  # 0-10 scale

class AnalysisResponse(BaseModel):
    product_name: str
    ingredients: List[IngredientAnalysis]
    health_risk_score: float
    alerts: List[str]
    suggestions: List[str]
    nutritional_info: Optional[Dict]

# Initialize these as empty, we'll load them when needed
ingredient_mapping = {}
risk_categories = {}

# Load ingredient alias mapping - with error handling
def load_ingredient_mapping():
    try:
        with open('ingredient_mapping.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print("Warning: ingredient_mapping.json not found")
        return {}
    except json.JSONDecodeError as e:
        print(f"Error parsing ingredient_mapping.json: {e}")
        return {}

# Load risk categories - with error handling
def load_risk_categories():
    try:
        with open('risk_categories.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print("Warning: risk_categories.json not found")
        return {"harmful": [], "moderate": [], "allergens": []}
    except json.JSONDecodeError as e:
        print(f"Error parsing risk_categories.json: {e}")
        return {"harmful": [], "moderate": [], "allergens": []}

# Simple health endpoint that doesn't depend on JSON files
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "Server is running"}

@app.get("/")
async def root():
    return {"message": "Label Insight Pro API", "version": "1.0"}

@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze_product(request: AnalysisRequest):
    try:
        # Load JSON files if not already loaded
        global ingredient_mapping, risk_categories
        if not ingredient_mapping:
            ingredient_mapping = load_ingredient_mapping()
        if not risk_categories:
            risk_categories = load_risk_categories()
        
        # For testing, return a simple response first
        # Once this works, we can implement the full analysis
        
        return AnalysisResponse(
            product_name="Test Product",
            ingredients=[],
            health_risk_score=42.5,
            alerts=["Test alert: High sugar content"],
            suggestions=["Test suggestion: Choose low-sugar alternative"],
            nutritional_info={}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# The rest of your functions remain the same but won't be called yet
def fetch_product_data(barcode):
    url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
    response = requests.get(url)
    return response.json()

def analyze_ingredients(ingredients_text):
    # [Your existing implementation]
    pass

def clean_and_split_ingredients(text):
    # [Your existing implementation]
    pass

def normalize_ingredient(ingredient):
    # [Your existing implementation]
    pass

def categorize_ingredient(ingredient):
    # [Your existing implementation]
    pass

def calculate_risk_score(ingredients, user_profile, nutriments):
    # [Your existing implementation]
    pass

def generate_alerts(ingredients, user_profile, nutriments):
    # [Your existing implementation]
    pass

def generate_suggestions(ingredients, user_profile, risk_score):
    # [Your existing implementation]
    pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)