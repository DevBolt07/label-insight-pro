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
import { Heart, AlertTriangle, Baby, Wheat, Beef, Apple, Milk, Egg, Fish, User as UserIcon, Save, Edit3, LogOut, Loader2 } from "lucide-react";
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
  const [name, setName] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [userHealthConditions, setUserHealthConditions] = useState<string[]>([]);
  const [userAllergies, setUserAllergies] = useState<string[]>([]);
  const [userDietaryPreferences, setUserDietaryPreferences] = useState<string[]>([]);
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
        setName(profile.display_name || "");
        setUserHealthConditions(profile.health_conditions || []);
        setUserAllergies(profile.allergies || []);
        setUserDietaryPreferences(profile.dietary_restrictions || []);
        
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
      
      await profileService.upsertProfile({
        user_id: user.id,
        display_name: name || user.email?.split('@')[0] || "User",
        health_conditions: userHealthConditions,
        allergies: userAllergies,
        dietary_restrictions: userDietaryPreferences,
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
        subtitle={name || user.email?.split('@')[0] || "User"}
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
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl"
                  disabled={!isEditing}
                />
              </div>

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