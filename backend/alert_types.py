from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class HealthProfile(BaseModel):
    age: int
    conditions: List[str]  # ['diabetes', 'hypertension', 'heart_disease']
    allergies: List[str]   # ['nuts', 'dairy', 'gluten']
    dietary_preferences: List[str]  # ['vegetarian', 'vegan', 'gluten_free']
    restrictions: List[str]  # ['low_sugar', 'low_salt', 'low_fat']

class ProductAnalysis(BaseModel):
    sugar: float
    salt: float
    saturated_fat: float
    additives: List[str]
    ingredients: List[str]
    nova_group: Optional[int] = None

class Alert(BaseModel):
    level: str  # 'low', 'medium', 'high'
    message: str
    alert_type: str  # 'sugar', 'salt', 'fat', 'additive', 'allergy'