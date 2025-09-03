import { useState, useEffect } from "react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Heart, AlertTriangle, Baby, Wheat, Beef, Apple, Milk, Egg, Fish, User as UserIcon, Save, Edit3, LogOut, Loader2, Calculator, Plus, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { profileService } from "@/services/profileService";
import type { User } from '@supabase/supabase-js';

interface ProfileProps {
  onNavigate: (page: string) => void;
  user: User;
}

const healthConditions = [
  { value: "diabetes", label: "Diabetes", icon: Heart },
  { value: "hypertension", label: "High Blood Pressure", icon: Heart },
  { value: "celiac", label: "Celiac Disease", icon: Wheat },
  { value: "lactose", label: "Lactose Intolerance", icon: Milk },
  { value: "pregnancy", label: "Pregnancy", icon: Baby },
  { value: "elderly", label: "Elderly (65+)", icon: UserIcon }
];

const allergens = [
  { value: "nuts", label: "Tree Nuts", icon: Apple },
  { value: "peanuts", label: "Peanuts", icon: Apple },
  { value: "dairy", label: "Dairy", icon: Milk },
  { value: "eggs", label: "Eggs", icon: Egg },
  { value: "soy", label: "Soy", icon: Wheat },
  { value: "gluten", label: "Gluten", icon: Wheat },
  { value: "shellfish", label: "Shellfish", icon: Fish },
  { value: "fish", label: "Fish", icon: Fish }
];

const dietaryPreferences = [
  { value: "vegetarian", label: "Vegetarian", icon: Apple },
  { value: "vegan", label: "Vegan", icon: Apple },
  { value: "halal", label: "Halal", icon: Beef },
  { value: "kosher", label: "Kosher", icon: Beef },
  { value: "keto", label: "Keto", icon: Beef },
  { value: "low_sodium", label: "Low Sodium", icon: Heart },
  { value: "low_sugar", label: "Low Sugar", icon: Heart }
];

export function Profile({ onNavigate, user }: ProfileProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [bmi, setBmi] = useState<number | null>(null);
  const [ageGroup, setAgeGroup] = useState("");
  const [userHealthConditions, setUserHealthConditions] = useState<string[]>([]);
  const [userAllergies, setUserAllergies] = useState<string[]>([]);
  const [userDietaryPreferences, setUserDietaryPreferences] = useState<string[]>([]);
  const [customHealthConditions, setCustomHealthConditions] = useState<string[]>([]);
  const [customAllergies, setCustomAllergies] = useState<string[]>([]);
  const [customDietaryPreferences, setCustomDietaryPreferences] = useState<string[]>([]);
  const [newCustomHealth, setNewCustomHealth] = useState("");
  const [newCustomAllergy, setNewCustomAllergy] = useState("");
  const [newCustomDietary, setNewCustomDietary] = useState("");
  const [childMode, setChildMode] = useState(false);
  
  const { signOut } = useAuth();
  const { toast } = useToast();

  // Load profile data on component mount
  useEffect(() => {
    loadProfile();
  }, [user.id]);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const profile = await profileService.getProfile(user.id);
      
      if (profile) {
        setFirstName(profile.first_name || "");
        setLastName(profile.last_name || "");
        setAge(profile.age ? profile.age.toString() : "");
        setHeight(profile.height_cm ? profile.height_cm.toString() : "");
        setWeight(profile.weight_kg ? profile.weight_kg.toString() : "");
        setBmi(profile.bmi || null);
        setUserHealthConditions(profile.health_conditions || []);
        setUserAllergies(profile.allergies || []);
        setUserDietaryPreferences(profile.dietary_restrictions || []);
        setCustomHealthConditions(profile.custom_health_conditions || []);
        setCustomAllergies(profile.custom_allergies || []);
        setCustomDietaryPreferences(profile.custom_dietary_preferences || []);
        
        // Load nutrition goals data
        if (profile.nutrition_goals) {
          const goals = profile.nutrition_goals as any;
          setAgeGroup(goals.age_group || "");
          setChildMode(goals.child_mode || false);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate BMI
  const calculateBMI = () => {
    const heightNum = parseFloat(height);
    const weightNum = parseFloat(weight);
    
    if (heightNum > 0 && weightNum > 0) {
      const heightInMeters = heightNum / 100;
      const calculatedBMI = weightNum / (heightInMeters * heightInMeters);
      setBmi(Math.round(calculatedBMI * 10) / 10);
      return calculatedBMI;
    }
    return null;
  };

  // Get BMI category
  const getBMICategory = (bmiValue: number): string => {
    if (bmiValue < 18.5) return "Underweight";
    if (bmiValue < 25) return "Normal";
    if (bmiValue < 30) return "Overweight";
    return "Obese";
  };

  // Get BMI color
  const getBMIColor = (bmiValue: number): string => {
    if (bmiValue < 18.5) return "text-warning";
    if (bmiValue < 25) return "text-healthy";
    if (bmiValue < 30) return "text-warning";
    return "text-danger";
  };

  const handleConditionChange = (conditionValue: string, checked: boolean) => {
    if (checked) {
      setUserHealthConditions(prev => [...prev, conditionValue]);
    } else {
      setUserHealthConditions(prev => prev.filter(c => c !== conditionValue));
    }
  };

  const handleAllergyToggle = (allergyValue: string) => {
    if (userAllergies.includes(allergyValue)) {
      setUserAllergies(prev => prev.filter(a => a !== allergyValue));
    } else {
      setUserAllergies(prev => [...prev, allergyValue]);
    }
  };

  const handleDietaryToggle = (preferenceValue: string) => {
    if (userDietaryPreferences.includes(preferenceValue)) {
      setUserDietaryPreferences(prev => prev.filter(p => p !== preferenceValue));
    } else {
      setUserDietaryPreferences(prev => [...prev, preferenceValue]);
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      // Calculate BMI before saving
      const calculatedBMI = calculateBMI();
      
      const displayName = `${firstName} ${lastName}`.trim() || 
                          user.email?.split('@')[0] || "User";
      
      await profileService.upsertProfile({
        user_id: user.id,
        first_name: firstName,
        last_name: lastName,
        display_name: displayName,
        age: age ? parseInt(age) : null,
        height_cm: height ? parseFloat(height) : null,
        weight_kg: weight ? parseFloat(weight) : null,
        bmi: calculatedBMI,
        health_conditions: userHealthConditions,
        allergies: userAllergies,
        dietary_restrictions: userDietaryPreferences,
        custom_health_conditions: customHealthConditions,
        custom_allergies: customAllergies,
        custom_dietary_preferences: customDietaryPreferences,
        // Store nutrition goals as JSON for age group and child mode
        nutrition_goals: {
          age_group: ageGroup,
          child_mode: childMode
        }
      });

      toast({
        title: "Profile Saved",
        description: "Your profile has been updated successfully."
      });
      
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Custom preference handlers
  const addCustomHealth = () => {
    if (newCustomHealth.trim() && !customHealthConditions.includes(newCustomHealth.trim())) {
      setCustomHealthConditions([...customHealthConditions, newCustomHealth.trim()]);
      setNewCustomHealth("");
    }
  };

  const removeCustomHealth = (condition: string) => {
    setCustomHealthConditions(customHealthConditions.filter(c => c !== condition));
  };

  const addCustomAllergy = () => {
    if (newCustomAllergy.trim() && !customAllergies.includes(newCustomAllergy.trim())) {
      setCustomAllergies([...customAllergies, newCustomAllergy.trim()]);
      setNewCustomAllergy("");
    }
  };

  const removeCustomAllergy = (allergy: string) => {
    setCustomAllergies(customAllergies.filter(a => a !== allergy));
  };

  const addCustomDietary = () => {
    if (newCustomDietary.trim() && !customDietaryPreferences.includes(newCustomDietary.trim())) {
      setCustomDietaryPreferences([...customDietaryPreferences, newCustomDietary.trim()]);
      setNewCustomDietary("");
    }
  };

  const removeCustomDietary = (preference: string) => {
    setCustomDietaryPreferences(customDietaryPreferences.filter(p => p !== preference));
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader 
        title="User Profile"
        subtitle={`${firstName} ${lastName}`.trim() || user.email?.split('@')[0] || "User"}
        rightAction={
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-10 w-10 p-0 rounded-full"
              onClick={() => setIsEditing(!isEditing)}
            >
              <Edit3 className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-10 w-10 p-0 rounded-full text-destructive hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        }
      />

      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Personal Information */}
        <Card className="card-material">
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <UserIcon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-title-large font-semibold text-foreground">Personal Information</h3>
                <p className="text-sm text-muted-foreground">Basic details for personalized insights</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="Enter first name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="rounded-xl"
                    disabled={!isEditing}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Enter last name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="rounded-xl"
                    disabled={!isEditing}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    placeholder="25"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="rounded-xl"
                    disabled={!isEditing}
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    placeholder="170"
                    value={height}
                    onChange={(e) => {
                      setHeight(e.target.value);
                      if (weight) calculateBMI();
                    }}
                    className="rounded-xl"
                    disabled={!isEditing}
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    placeholder="70"
                    value={weight}
                    onChange={(e) => {
                      setWeight(e.target.value);
                      if (height) calculateBMI();
                    }}
                    className="rounded-xl"
                    disabled={!isEditing}
                    type="number"
                  />
                </div>
              </div>

              {bmi && (
                <Card className="bg-muted/30 p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Calculator className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">BMI:</span>
                        <span className={`font-bold ${getBMIColor(bmi)}`}>{bmi}</span>
                        <span className={`text-sm ${getBMIColor(bmi)}`}>({getBMICategory(bmi)})</span>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              <div className="space-y-2">
                <Label htmlFor="age-group">Age Group</Label>
                <Select value={ageGroup} onValueChange={setAgeGroup} disabled={!isEditing}>
                  <SelectTrigger id="age-group" className="rounded-xl">
                    <SelectValue placeholder="Select age group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="child">Child (0-12)</SelectItem>
                    <SelectItem value="teen">Teen (13-17)</SelectItem>
                    <SelectItem value="adult">Adult (18-59)</SelectItem>
                    <SelectItem value="senior">Senior (60+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </Card>

        {/* Health Conditions */}
        <Card className="card-material">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-danger/10">
                <Heart className="h-6 w-6 text-danger" />
              </div>
              <div>
                <h3 className="text-title-large font-semibold text-foreground">Health Conditions</h3>
                <p className="text-sm text-muted-foreground">Help us provide better warnings</p>
              </div>
            </div>
            
            <div className="space-y-3">
              {healthConditions.map((condition) => {
                const Icon = condition.icon;
                return (
                  <div key={condition.value} className="flex items-center space-x-3">
                    <Checkbox
                      id={condition.value}
                      checked={userHealthConditions.includes(condition.value)}
                      onCheckedChange={(checked) => 
                        handleConditionChange(condition.value, checked as boolean)
                      }
                      disabled={!isEditing}
                    />
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor={condition.value} className="text-sm font-medium">
                        {condition.label}
                      </Label>
                    </div>
                  </div>
                );
              })}
              
              {/* Custom Health Conditions */}
              <div className="space-y-2">
                {customHealthConditions.map((condition) => (
                  <div key={condition} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{condition}</span>
                    </div>
                    {isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCustomHealth(condition)}
                        className="h-6 w-6 p-0 rounded-full"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                
                {isEditing && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add custom condition"
                      value={newCustomHealth}
                      onChange={(e) => setNewCustomHealth(e.target.value)}
                      className="rounded-xl text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && addCustomHealth()}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addCustomHealth}
                      className="shrink-0 rounded-xl"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Allergies */}
        <Card className="card-material">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-warning/10">
                <AlertTriangle className="h-6 w-6 text-warning" />
              </div>
              <div>
                <h3 className="text-title-large font-semibold text-foreground">Allergies & Intolerances</h3>
                <p className="text-sm text-muted-foreground">We'll alert you about these ingredients</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {allergens.map((allergen) => {
                  const Icon = allergen.icon;
                  return (
                    <Badge
                      key={allergen.value}
                      variant={userAllergies.includes(allergen.value) ? "default" : "outline"}
                      className={`cursor-pointer transition-all hover:scale-105 ${!isEditing ? 'pointer-events-none opacity-70' : ''}`}
                      onClick={() => isEditing && handleAllergyToggle(allergen.value)}
                    >
                      <Icon className="h-3 w-3 mr-1" />
                      {allergen.label}
                    </Badge>
                  );
                })}
              </div>
              
              {/* Custom Allergies */}
              <div className="space-y-2">
                {customAllergies.map((allergy) => (
                  <div key={allergy} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-warning" />
                      <span className="text-sm font-medium">{allergy}</span>
                    </div>
                    {isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCustomAllergy(allergy)}
                        className="h-6 w-6 p-0 rounded-full"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                
                {isEditing && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add custom allergy"
                      value={newCustomAllergy}
                      onChange={(e) => setNewCustomAllergy(e.target.value)}
                      className="rounded-xl text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && addCustomAllergy()}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addCustomAllergy}
                      className="shrink-0 rounded-xl"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Dietary Preferences */}
        <Card className="card-material">
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-healthy/10">
                <Apple className="h-6 w-6 text-healthy" />
              </div>
              <div>
                <h3 className="text-title-large font-semibold text-foreground">Dietary Preferences</h3>
                <p className="text-sm text-muted-foreground">Your lifestyle and dietary choices</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {dietaryPreferences.map((preference) => {
                  const Icon = preference.icon;
                  return (
                    <Badge
                      key={preference.value}
                      variant={userDietaryPreferences.includes(preference.value) ? "default" : "outline"}
                      className={`cursor-pointer transition-all hover:scale-105 ${!isEditing ? 'pointer-events-none opacity-70' : ''}`}
                      onClick={() => isEditing && handleDietaryToggle(preference.value)}
                    >
                      <Icon className="h-3 w-3 mr-1" />
                      {preference.label}
                    </Badge>
                  );
                })}
              </div>
              
              {/* Custom Dietary Preferences */}
              <div className="space-y-2">
                {customDietaryPreferences.map((preference) => (
                  <div key={preference} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Apple className="h-4 w-4 text-healthy" />
                      <span className="text-sm font-medium">{preference}</span>
                    </div>
                    {isEditing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCustomDietary(preference)}
                        className="h-6 w-6 p-0 rounded-full"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                
                {isEditing && (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add custom preference"
                      value={newCustomDietary}
                      onChange={(e) => setNewCustomDietary(e.target.value)}
                      className="rounded-xl text-sm"
                      onKeyPress={(e) => e.key === 'Enter' && addCustomDietary()}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addCustomDietary}
                      className="shrink-0 rounded-xl"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Child Mode */}
        <Card className="card-material">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-primary/10">
                  <Baby className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-title-large font-semibold text-foreground">Child Mode</h3>
                  <p className="text-sm text-muted-foreground">Kid-friendly interface with safety focus</p>
                </div>
              </div>
              <Switch
                id="child-mode"
                checked={childMode}
                onCheckedChange={setChildMode}
                disabled={!isEditing}
              />
            </div>
          </div>
        </Card>

        {/* Save Button */}
        {isEditing && (
          <div className="pt-4 space-y-3">
            <Button 
              onClick={handleSave}
              disabled={isLoading}
              className="w-full bg-gradient-primary text-primary-foreground rounded-2xl py-6 text-lg font-semibold"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Save className="h-5 w-5 mr-2" />
              )}
              {isLoading ? 'Saving...' : 'Save Profile'}
            </Button>
            <Button 
              onClick={() => {
                setIsEditing(false);
                loadProfile(); // Reset changes
              }}
              variant="outline"
              className="w-full rounded-2xl py-6 text-lg font-semibold"
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}