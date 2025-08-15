import { useState } from "react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Save, User, Heart, Baby, Utensils, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileProps {
  onNavigate: (page: string) => void;
}

const healthConditions = [
  { id: "diabetes", label: "Diabetes", icon: Heart },
  { id: "hypertension", label: "High Blood Pressure", icon: Heart },
  { id: "celiac", label: "Celiac Disease", icon: Utensils },
  { id: "lactose", label: "Lactose Intolerance", icon: Utensils },
  { id: "pregnancy", label: "Pregnancy", icon: Baby },
  { id: "elderly", label: "Elderly (65+)", icon: User }
];

const allergens = [
  "Nuts", "Peanuts", "Dairy", "Eggs", "Soy", "Gluten", "Shellfish", "Fish", "Sesame"
];

const dietaryPreferences = [
  "Vegetarian", "Vegan", "Halal", "Kosher", "Keto", "Low Sodium", "Low Sugar"
];

export function Profile({ onNavigate }: ProfileProps) {
  const [profile, setProfile] = useState({
    name: "",
    age: "",
    healthConditions: [] as string[],
    allergies: [] as string[],
    dietaryPreferences: [] as string[],
    childMode: false
  });

  const handleConditionChange = (conditionId: string, checked: boolean) => {
    setProfile(prev => ({
      ...prev,
      healthConditions: checked 
        ? [...prev.healthConditions, conditionId]
        : prev.healthConditions.filter(id => id !== conditionId)
    }));
  };

  const handleAllergyToggle = (allergy: string) => {
    setProfile(prev => ({
      ...prev,
      allergies: prev.allergies.includes(allergy)
        ? prev.allergies.filter(a => a !== allergy)
        : [...prev.allergies, allergy]
    }));
  };

  const handleDietaryToggle = (preference: string) => {
    setProfile(prev => ({
      ...prev,
      dietaryPreferences: prev.dietaryPreferences.includes(preference)
        ? prev.dietaryPreferences.filter(p => p !== preference)
        : [...prev.dietaryPreferences, preference]
    }));
  };

  const handleSave = () => {
    // Save profile logic here
    console.log("Saving profile:", profile);
    onNavigate("home");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader 
        title="Health Profile"
        subtitle="Personalize your nutrition analysis"
        showBack
        onBack={() => onNavigate("home")}
      />

      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Basic Info */}
        <Card className="card-material">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-primary" />
              <h3 className="text-title-large text-foreground">Basic Information</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={profile.name}
                  onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="age">Age Group</Label>
                <Select value={profile.age} onValueChange={(value) => setProfile(prev => ({ ...prev, age: value }))}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select age group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="child">Child (0-12)</SelectItem>
                    <SelectItem value="teen">Teen (13-17)</SelectItem>
                    <SelectItem value="adult">Adult (18-64)</SelectItem>
                    <SelectItem value="elderly">Elderly (65+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        {/* Health Conditions */}
        <Card className="card-material">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="h-5 w-5 text-primary" />
              <h3 className="text-title-large text-foreground">Health Conditions</h3>
            </div>
            
            <div className="space-y-3">
              {healthConditions.map((condition) => {
                const Icon = condition.icon;
                return (
                  <div key={condition.id} className="flex items-center space-x-3">
                    <Checkbox
                      id={condition.id}
                      checked={profile.healthConditions.includes(condition.id)}
                      onCheckedChange={(checked) => handleConditionChange(condition.id, checked as boolean)}
                    />
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor={condition.id} className="text-sm">{condition.label}</Label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        {/* Allergies */}
        <Card className="card-material">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <h3 className="text-title-large text-foreground">Allergies & Intolerances</h3>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {allergens.map((allergy) => (
                <Badge
                  key={allergy}
                  variant={profile.allergies.includes(allergy) ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all duration-200",
                    profile.allergies.includes(allergy) 
                      ? "bg-gradient-danger text-danger-foreground" 
                      : "hover:bg-muted"
                  )}
                  onClick={() => handleAllergyToggle(allergy)}
                >
                  {allergy}
                </Badge>
              ))}
            </div>
          </div>
        </Card>

        {/* Dietary Preferences */}
        <Card className="card-material">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Utensils className="h-5 w-5 text-primary" />
              <h3 className="text-title-large text-foreground">Dietary Preferences</h3>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {dietaryPreferences.map((preference) => (
                <Badge
                  key={preference}
                  variant={profile.dietaryPreferences.includes(preference) ? "default" : "outline"}
                  className={cn(
                    "cursor-pointer transition-all duration-200",
                    profile.dietaryPreferences.includes(preference) 
                      ? "bg-gradient-healthy text-healthy-foreground" 
                      : "hover:bg-muted"
                  )}
                  onClick={() => handleDietaryToggle(preference)}
                >
                  {preference}
                </Badge>
              ))}
            </div>
          </div>
        </Card>

        {/* Child Mode */}
        <Card className="card-material">
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Baby className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="text-title-large text-foreground">Child Mode</h3>
                  <p className="text-sm text-muted-foreground">Cartoon interface with kid-friendly warnings</p>
                </div>
              </div>
              <Checkbox
                checked={profile.childMode}
                onCheckedChange={(checked) => setProfile(prev => ({ ...prev, childMode: checked as boolean }))}
              />
            </div>
          </div>
        </Card>

        {/* Save Button */}
        <Button 
          onClick={handleSave}
          className="w-full bg-gradient-primary text-primary-foreground h-12 rounded-2xl"
        >
          <Save className="h-5 w-5 mr-2" />
          Save Profile
        </Button>
      </div>
    </div>
  );
}