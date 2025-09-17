from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import requests
import re
from typing import Dict, List, Optional
from pydantic import BaseModel

app = FastAPI()

# Enable CORS for frontend-backend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # Your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data models
class Ingredient(BaseModel):
    name: str
    percentage: Optional[float]
    is_harmful: bool
    category: str  # good, moderate, harmful

class HealthAlert(BaseModel):
    type: str
    message: str
    severity: str  # low, medium, high

class ProductAnalysis(BaseModel):
    product_name: str
    brand: str
    health_score: int
    ingredients: List[Ingredient]
    alerts: List[HealthAlert]
    nutri_score: str
    processing_level: str
    personalized_recommendations: List[str]

# Hidden sugars and harmful ingredients database
HIDDEN_SUGARS = ['maltodextrin', 'dextrose', 'fructose', 'sucrose', 'corn syrup', 'high fructose corn syrup', 
                 'fruit juice concentrate', 'honey', 'agave nectar', 'maple syrup', 'molasses']

HARMFUL_ADDITIVES = ['sodium nitrate', 'sodium nitrite', 'potassium bromate', 'propyl paraben', 'butylated hydroxyanisole',
                     'butylated hydroxytoluene', 'potassium iodate', 'azodicarbonamide', 'brominated vegetable oil']

# Fetch product data from Open Food Facts
def get_product_data(barcode: str) -> Optional[Dict]:
    url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 1:
                return data['product']
        return None
    except Exception:
        return None

# Parse ingredients text and extract percentages
def parse_ingredients(ingredients_text: str) -> List[Ingredient]:
    ingredients = []
    if not ingredients_text:
        return ingredients
    
    # Split ingredients by commas or other separators
    lines = re.split(r',|\s*\(', ingredients_text)
    
    for line in lines:
        line = line.strip().lower()
        if not line:
            continue
            
        # Extract percentage if available
        percentage = None
        percentage_match = re.search(r'(\d+(\.\d+)?)%', line)
        if percentage_match:
            percentage = float(percentage_match.group(1))
            line = re.sub(r'(\d+(\.\d+)?)%', '', line).strip()
        
        # Check if ingredient is harmful
        is_harmful = False
        category = "moderate"
        
        # Check for hidden sugars
        if any(sugar in line for sugar in HIDDEN_SUGARS):
            is_harmful = True
            category = "harmful"
        # Check for harmful additives
        elif any(additive in line for additive in HARMFUL_ADDITIVES):
            is_harmful = True
            category = "harmful"
        # Check for generally healthy ingredients
        elif any(healthy in line for healthy in ['whole grain', 'olive oil', 'vegetable', 'fruit', 'nut', 'seed']):
            category = "good"
        
        ingredients.append(Ingredient(
            name=line,
            percentage=percentage,
            is_harmful=is_harmful,
            category=category
        ))
    
    return ingredients

# Generate health alerts based on product data
def generate_alerts(product_data: Dict, ingredients: List[Ingredient]) -> List[HealthAlert]:
    alerts = []
    
    # Check for high sugar
    if 'nutriments' in product_data and 'sugars_100g' in product_data['nutriments']:
        sugars = product_data['nutriments']['sugars_100g']
        if sugars > 10:  # More than 10g per 100g is considered high
            alerts.append(HealthAlert(
                type="High Sugar",
                message=f"This product is high in sugar ({sugars}g per 100g). Consider limiting consumption.",
                severity="high"
            ))
    
    # Check for high salt/sodium
    if 'nutriments' in product_data and 'salt_100g' in product_data['nutriments']:
        salt = product_data['nutriments']['salt_100g']
        if salt > 1.5:  # More than 1.5g per 100g is considered high
            alerts.append(HealthAlert(
                type="High Salt",
                message=f"This product is high in salt ({salt}g per 100g). Consider limiting consumption.",
                severity="high"
            ))
    
    # Check for harmful ingredients
    harmful_ingredients = [ing for ing in ingredients if ing.is_harmful]
    if harmful_ingredients:
        harmful_names = ", ".join([ing.name for ing in harmful_ingredients[:3]])
        alerts.append(HealthAlert(
            type="Harmful Ingredients",
            message=f"This product contains potentially harmful ingredients: {harmful_names}.",
            severity="medium"
        ))
    
    # Check if ultra-processed
    if product_data.get('nova_group', 0) == 4:
        alerts.append(HealthAlert(
            type="Ultra-Processed",
            message="This product is classified as ultra-processed food. Consider limiting consumption.",
            severity="medium"
        ))
    
    return alerts

# Calculate health score based on various factors
def calculate_health_score(product_data: Dict, ingredients: List[Ingredient], alerts: List[HealthAlert]) -> int:
    base_score = 100
    
    # Deduct points based on nutritional values
    nutriments = product_data.get('nutriments', {})
    
    # Sugar deduction (up to 25 points)
    sugars = nutriments.get('sugars_100g', 0)
    sugar_deduction = min(25, (sugars / 20) * 25)  # 20g sugar = max deduction
    base_score -= sugar_deduction
    
    # Salt deduction (up to 20 points)
    salt = nutriments.get('salt_100g', 0)
    salt_deduction = min(20, (salt / 3) * 20)  # 3g salt = max deduction
    base_score -= salt_deduction
    
    # Saturated fat deduction (up to 20 points)
    saturated_fat = nutriments.get('saturated-fat_100g', 0)
    fat_deduction = min(20, (saturated_fat / 10) * 20)  # 10g fat = max deduction
    base_score -= fat_deduction
    
    # Deduct for harmful ingredients (up to 15 points)
    harmful_count = sum(1 for ing in ingredients if ing.is_harmful)
    harmful_deduction = min(15, harmful_count * 3)
    base_score -= harmful_deduction
    
    # Deduct for processing level (up to 20 points)
    nova_group = product_data.get('nova_group', 1)
    processing_deduction = (nova_group - 1) * 7  # 7 points per processing level
    base_score -= min(20, processing_deduction)
    
    # Ensure score is between 0 and 100
    return max(0, min(100, round(base_score)))

# Generate personalized recommendations based on health conditions
def get_personalized_recommendations(product_data: Dict, ingredients: List[Ingredient], conditions: List[str]) -> List[str]:
    recommendations = []
    nutriments = product_data.get('nutriments', {})
    
    if 'diabetes' in conditions or 'sugar' in conditions:
        sugars = nutriments.get('sugars_100g', 0)
        if sugars > 5:
            recommendations.append(f"High sugar content ({sugars}g) - not recommended for diabetes")
        else:
            recommendations.append("Moderate sugar content - can be consumed in moderation")
    
    if 'high bp' in conditions or 'hypertension' in conditions:
        salt = nutriments.get('salt_100g', 0)
        if salt > 1.5:
            recommendations.append(f"High salt content ({salt}g) - not recommended for hypertension")
        else:
            recommendations.append("Moderate salt content - can be consumed in moderation")
    
    if 'heart disease' in conditions:
        saturated_fat = nutriments.get('saturated-fat_100g', 0)
        if saturated_fat > 5:
            recommendations.append(f"High saturated fat content ({saturated_fat}g) - not recommended for heart conditions")
        else:
            recommendations.append("Moderate fat content - can be consumed in moderation")
    
    return recommendations

# Main endpoint to analyze product
@app.post("/analyze-product", response_model=ProductAnalysis)
async def analyze_product(barcode: str, health_conditions: List[str] = []):
    # Fetch product data from Open Food Facts
    product_data = get_product_data(barcode)
    if not product_data:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Parse ingredients
    ingredients_text = product_data.get('ingredients_text', '')
    ingredients = parse_ingredients(ingredients_text)
    
    # Generate alerts
    alerts = generate_alerts(product_data, ingredients)
    
    # Calculate health score
    health_score = calculate_health_score(product_data, ingredients, alerts)
    
    # Get personalized recommendations
    personalized_recommendations = get_personalized_recommendations(product_data, ingredients, health_conditions)
    
    # Determine processing level
    nova_group = product_data.get('nova_group', 1)
    processing_levels = {
        1: "Unprocessed or minimally processed",
        2: "Processed culinary ingredients",
        3: "Processed foods",
        4: "Ultra-processed foods"
    }
    processing_level = processing_levels.get(nova_group, "Unknown")
    
    return ProductAnalysis(
        product_name=product_data.get('product_name', 'Unknown Product'),
        brand=product_data.get('brands', 'Unknown Brand'),
        health_score=health_score,
        ingredients=ingredients,
        alerts=alerts,
        nutri_score=product_data.get('nutriscore_grade', 'Unknown').upper(),
        processing_level=processing_level,
        personalized_recommendations=personalized_recommendations
    )

# Endpoint for product search by name
@app.get("/search-product/{product_name}")
async def search_product(product_name: str):
    url = f"https://world.openfoodfacts.org/cgi/search.pl?search_terms={product_name}&search_simple=1&json=1"
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            data = response.json()
            return data.get('products', [])[:10]  # Return top 10 results
        return []
    except Exception:
        return []

# Health check endpoint
@app.get("/")
async def root():
    return {"message": "NutriLabel Analyzer API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)