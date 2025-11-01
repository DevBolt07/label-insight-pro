from typing import List, Dict
from alert_types import HealthProfile, ProductAnalysis, Alert

class AlertEngine:
    
    @staticmethod
    def generate_alerts(health_profile: HealthProfile, product: ProductAnalysis) -> List[Alert]:
        alerts = []
        
        # Diabetes - Sugar alerts
        if 'diabetes' in health_profile.conditions:
            alerts.extend(AlertEngine.check_diabetes_alerts(product.sugar, health_profile))
        
        # Hypertension - Salt alerts
        if 'hypertension' in health_profile.conditions:
            alerts.extend(AlertEngine.check_hypertension_alerts(product.salt, health_profile))
        
        # Heart disease - Fat alerts
        if 'heart_disease' in health_profile.conditions:
            alerts.extend(AlertEngine.check_heart_disease_alerts(product.saturated_fat, health_profile))
        
        # Allergy checks
        alerts.extend(AlertEngine.check_allergy_alerts(health_profile.allergies, product.ingredients))
        
        # Dietary preference checks
        alerts.extend(AlertEngine.check_dietary_preference_alerts(health_profile.dietary_preferences, product.ingredients))
        
        return alerts
    
    @staticmethod
    def check_diabetes_alerts(sugar: float, profile: HealthProfile) -> List[Alert]:
        alerts = []
        
        # Different thresholds for diabetics vs normal users
        high_threshold = 2.5 if 'diabetes' in profile.conditions else 5.0
        medium_threshold = 1.5 if 'diabetes' in profile.conditions else 3.0
        
        if sugar > high_threshold:
            alerts.append(Alert(
                level='high',
                message=f"🚨 High sugar content ({sugar:.1f}g) - {'Not recommended for diabetics' if 'diabetes' in profile.conditions else 'Consider moderation'}",
                alert_type='sugar'
            ))
        elif sugar > medium_threshold:
            alerts.append(Alert(
                level='medium',
                message=f"⚠️ Moderate sugar content ({sugar:.1f}g) - {'Consume with caution' if 'diabetes' in profile.conditions else 'Within acceptable limits'}",
                alert_type='sugar'
            ))
        
        return alerts
    
    @staticmethod
    def check_hypertension_alerts(salt: float, profile: HealthProfile) -> List[Alert]:
        alerts = []
        
        high_threshold = 0.5 if 'hypertension' in profile.conditions else 1.5
        medium_threshold = 0.3 if 'hypertension' in profile.conditions else 1.0
        
        if salt > high_threshold:
            alerts.append(Alert(
                level='high',
                message=f"🚨 High salt content ({salt:.1f}g) - {'Not recommended for hypertension' if 'hypertension' in profile.conditions else 'Consider moderation'}",
                alert_type='salt'
            ))
        elif salt > medium_threshold:
            alerts.append(Alert(
                level='medium',
                message=f"⚠️ Moderate salt content ({salt:.1f}g) - {'Consume with caution' if 'hypertension' in profile.conditions else 'Within acceptable limits'}",
                alert_type='salt'
            ))
        
        return alerts
    
    @staticmethod
    def check_heart_disease_alerts(fat: float, profile: HealthProfile) -> List[Alert]:
        alerts = []
        
        high_threshold = 1.0 if 'heart_disease' in profile.conditions else 3.0
        medium_threshold = 0.5 if 'heart_disease' in profile.conditions else 1.5
        
        if fat > high_threshold:
            alerts.append(Alert(
                level='high',
                message=f"🚨 High saturated fat ({fat:.1f}g) - {'Not recommended for heart conditions' if 'heart_disease' in profile.conditions else 'Consider moderation'}",
                alert_type='fat'
            ))
        elif fat > medium_threshold:
            alerts.append(Alert(
                level='medium',
                message=f"⚠️ Moderate saturated fat ({fat:.1f}g) - {'Consume with caution' if 'heart_disease' in profile.conditions else 'Within acceptable limits'}",
                alert_type='fat'
            ))
        
        return alerts
    
    @staticmethod
    def check_allergy_alerts(allergies: List[str], ingredients: List[str]) -> List[Alert]:
        alerts = []
        
        allergy_map = {
            'nuts': ['nut', 'almond', 'walnut', 'peanut', 'cashew', 'pistachio', 'hazelnut'],
            'dairy': ['milk', 'cheese', 'butter', 'yogurt', 'cream', 'whey', 'casein'],
            'gluten': ['wheat', 'barley', 'rye', 'gluten', 'bread', 'pasta'],
            'soy': ['soy', 'soya', 'tofu', 'soybean'],
            'eggs': ['egg', 'albumin', 'mayonnaise']
        }
        
        for allergy in allergies:
            allergy_keywords = allergy_map.get(allergy, [allergy])
            
            for ingredient in ingredients:
                ingredient_lower = ingredient.lower()
                if any(keyword in ingredient_lower for keyword in allergy_keywords):
                    alerts.append(Alert(
                        level='high',
                        message=f"🚨 CONTAINS {allergy.upper()} - Potential allergen detected! Avoid this product.",
                        alert_type='allergy'
                    ))
                    break  # Only one alert per allergy type
        
        return alerts
    
    @staticmethod
    def check_dietary_preference_alerts(preferences: List[str], ingredients: List[str]) -> List[Alert]:
        alerts = []
        ingredients_lower = [ingredient.lower() for ingredient in ingredients]
        
        # Vegetarian/Vegan checks
        if 'vegetarian' in preferences or 'vegan' in preferences:
            non_veg_ingredients = ['meat', 'chicken', 'fish', 'pork', 'beef', 'gelatin', 'rennet']
            if any(any(item in ing for item in non_veg_ingredients) for ing in ingredients_lower):
                alerts.append(Alert(
                    level='high',
                    message="🚨 Contains non-vegetarian ingredients - Not suitable for vegetarians",
                    alert_type='general'
                ))
        
        # Vegan specific checks
        if 'vegan' in preferences:
            non_vegan_ingredients = ['milk', 'cheese', 'butter', 'honey', 'egg', 'yogurt', 'whey']
            if any(any(item in ing for item in non_vegan_ingredients) for ing in ingredients_lower):
                alerts.append(Alert(
                    level='high',
                    message="🚨 Contains animal products - Not suitable for vegans",
                    alert_type='general'
                ))
        
        # Gluten-free checks
        if 'gluten_free' in preferences:
            gluten_ingredients = ['wheat', 'barley', 'rye', 'gluten']
            if any(any(item in ing for item in gluten_ingredients) for ing in ingredients_lower):
                alerts.append(Alert(
                    level='high',
                    message="🚨 Contains gluten - Not suitable for gluten-free diet",
                    alert_type='general'
                ))
        
        return alerts