import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { 
  Scan, 
  Shield, 
  Heart, 
  ChevronRight, 
  User, 
  Activity,
  AlertTriangle,
  Apple,
  Leaf,
  Sparkles,
  Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface OnboardingProps {
  onComplete: () => void;
}

const healthConditions = [
  { id: 'diabetes', label: 'Diabetes' },
  { id: 'high_blood_pressure', label: 'High Blood Pressure' },
  { id: 'celiac_disease', label: 'Celiac Disease' },
  { id: 'lactose_intolerance', label: 'Lactose Intolerance' },
  { id: 'pregnancy', label: 'Pregnancy' },
  { id: 'elderly', label: 'Elderly (65+)' }
];

const allergies = [
  { id: 'tree_nuts', label: 'Tree Nuts' },
  { id: 'peanuts', label: 'Peanuts' },
  { id: 'dairy', label: 'Dairy' },
  { id: 'eggs', label: 'Eggs' },
  { id: 'soy', label: 'Soy' },
  { id: 'gluten', label: 'Gluten' },
  { id: 'shellfish', label: 'Shellfish' },
  { id: 'fish', label: 'Fish' }
];

const dietaryPreferences = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'halal', label: 'Halal' },
  { id: 'kosher', label: 'Kosher' },
  { id: 'keto', label: 'Keto' },
  { id: 'low_sodium', label: 'Low Sodium' },
  { id: 'low_sugar', label: 'Low Sugar' },
  { id: 'child_mode', label: 'Child Mode' }
];

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    age: '',
    heightCm: '',
    weightKg: '',
    ageGroup: '',
    healthConditions: [] as string[],
    allergies: [] as string[],
    dietaryPreferences: [] as string[]
  });

  const slides = [
    {
      icon: Scan,
      title: 'Scan. Eat. Stay Healthy.',
      description: 'Simply scan any food product to get instant health insights and personalized warnings',
      gradient: 'from-primary to-primary-glow'
    },
    {
      icon: Shield,
      title: 'Track Allergens & Get Insights',
      description: 'We alert you about ingredients that matter to your health and dietary needs',
      gradient: 'from-accent to-secondary'
    },
    {
      icon: Heart,
      title: 'Your Health, Your Way',
      description: 'Personalized recommendations based on your unique health profile and goals',
      gradient: 'from-healthy to-primary'
    }
  ];

  const totalSteps = 6; // 3 intro slides + 3 form steps
  const progress = ((step + 1) / totalSteps) * 100;

  const handleToggleSelection = (field: 'healthConditions' | 'allergies' | 'dietaryPreferences', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  const handleNext = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "Please sign in to complete setup",
          variant: "destructive"
        });
        return;
      }

      // Calculate BMI if height and weight provided
      let bmi = null;
      if (formData.heightCm && formData.weightKg) {
        const heightM = parseFloat(formData.heightCm) / 100;
        bmi = parseFloat(formData.weightKg) / (heightM * heightM);
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          age: formData.age ? parseInt(formData.age) : null,
          height_cm: formData.heightCm ? parseFloat(formData.heightCm) : null,
          weight_kg: formData.weightKg ? parseFloat(formData.weightKg) : null,
          bmi: bmi,
          age_group: formData.ageGroup || null,
          health_conditions: formData.healthConditions,
          allergies: formData.allergies,
          dietary_preferences: formData.dietaryPreferences,
          onboarding_completed: true
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Setup Complete!",
        description: "Your profile has been created successfully"
      });

      onComplete();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to save your profile. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Intro slides (steps 0-2)
  if (step < 3) {
    const slide = slides[step];
    const Icon = slide.icon;

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
        <Progress value={progress} className="h-1.5 rounded-none" />
        
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full p-8 space-y-8 card-material animate-scale-in">
            <div className="space-y-6 text-center">
              <div className={cn(
                "mx-auto w-28 h-28 rounded-3xl flex items-center justify-center bg-gradient-to-br shadow-lg animate-float",
                slide.gradient
              )}>
                <Icon className="h-14 w-14 text-white" />
              </div>

              <div className="space-y-3">
                <h2 className="text-3xl font-bold text-foreground tracking-tight">
                  {slide.title}
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {slide.description}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              {step > 0 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(step - 1)}
                  className="flex-1 h-12 rounded-xl border-border/50"
                >
                  Back
                </Button>
              )}
              <Button
                onClick={handleNext}
                className="flex-1 h-12 bg-gradient-primary text-primary-foreground rounded-xl font-semibold shadow-lg hover:shadow-xl hover-lift"
              >
                {step === 2 ? 'Get Started' : 'Next'}
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            <div className="flex justify-center gap-2">
              {slides.map((_, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    idx === step ? "w-8 bg-primary" : "w-2 bg-border"
                  )}
                />
              ))}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // Form steps (steps 3-5)
  const formStep = step - 3;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-safe">
      <Progress value={progress} className="h-1.5 rounded-none" />
      
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        <div className="text-center space-y-2 animate-fade-in">
          <h2 className="text-2xl font-bold text-foreground">
            {formStep === 0 && 'Basic Details for Personalized Insights'}
            {formStep === 1 && 'Help Us Provide Better Warnings'}
            {formStep === 2 && 'Almost Done! Final Preferences'}
          </h2>
          <p className="text-muted-foreground">
            {formStep === 0 && 'Tell us a bit about yourself'}
            {formStep === 1 && 'Select your health conditions and allergies'}
            {formStep === 2 && 'Choose your dietary preferences'}
          </p>
        </div>

        <Card className="p-6 space-y-6 card-material animate-slide-up">
          {/* Step 3: Personal Info */}
          {formStep === 0 && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-border/50">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">Personal Information</h3>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ageGroup">Age Group</Label>
                <Select value={formData.ageGroup} onValueChange={(value) => setFormData({ ...formData, ageGroup: value })}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Select your age group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="child">Child (0-12)</SelectItem>
                    <SelectItem value="teen">Teen (13-17)</SelectItem>
                    <SelectItem value="adult">Adult (18-64)</SelectItem>
                    <SelectItem value="senior">Senior (65+)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3 pt-4 pb-2 border-t border-border/50">
                <div className="w-10 h-10 rounded-xl bg-healthy/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-healthy" />
                </div>
                <h3 className="text-lg font-semibold">Health Metrics (Optional)</h3>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="25"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder="170"
                    value={formData.heightCm}
                    onChange={(e) => setFormData({ ...formData, heightCm: e.target.value })}
                    className="h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    placeholder="70"
                    value={formData.weightKg}
                    onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
                    className="h-11 rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Health Conditions & Allergies */}
          {formStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  </div>
                  <h3 className="text-lg font-semibold">Health Conditions</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {healthConditions.map((condition) => (
                    <div
                      key={condition.id}
                      onClick={() => handleToggleSelection('healthConditions', condition.id)}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover-lift",
                        formData.healthConditions.includes(condition.id)
                          ? "border-primary bg-primary/5"
                          : "border-border/50 hover:border-border"
                      )}
                    >
                      <Checkbox
                        checked={formData.healthConditions.includes(condition.id)}
                        className="pointer-events-none"
                      />
                      <span className="text-sm font-medium">{condition.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-danger" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Allergies & Intolerances</h3>
                    <p className="text-sm text-muted-foreground">We'll alert you about these ingredients</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {allergies.map((allergy) => (
                    <div
                      key={allergy.id}
                      onClick={() => handleToggleSelection('allergies', allergy.id)}
                      className={cn(
                        "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover-lift",
                        formData.allergies.includes(allergy.id)
                          ? "border-danger bg-danger/5"
                          : "border-border/50 hover:border-border"
                      )}
                    >
                      <Checkbox
                        checked={formData.allergies.includes(allergy.id)}
                        className="pointer-events-none"
                      />
                      <span className="text-sm font-medium">{allergy.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Dietary Preferences */}
          {formStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-healthy/10 flex items-center justify-center">
                  <Leaf className="h-5 w-5 text-healthy" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Dietary Preferences</h3>
                  <p className="text-sm text-muted-foreground">Your lifestyle and dietary choices</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {dietaryPreferences.map((pref) => (
                  <div
                    key={pref.id}
                    onClick={() => handleToggleSelection('dietaryPreferences', pref.id)}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 hover-lift",
                      formData.dietaryPreferences.includes(pref.id)
                        ? "border-healthy bg-healthy/5"
                        : "border-border/50 hover:border-border"
                    )}
                  >
                    <Checkbox
                      checked={formData.dietaryPreferences.includes(pref.id)}
                      className="pointer-events-none"
                    />
                    <span className="text-sm font-medium">{pref.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setStep(step - 1)}
            className="flex-1 h-12 rounded-xl border-border/50"
          >
            Back
          </Button>
          <Button
            onClick={formStep === 2 ? handleSubmit : handleNext}
            disabled={isLoading}
            className="flex-1 h-12 bg-gradient-primary text-primary-foreground rounded-xl font-semibold shadow-lg hover:shadow-xl hover-lift"
          >
            {isLoading ? (
              <>
                <Sparkles className="mr-2 h-5 w-5 animate-spin" />
                Saving...
              </>
            ) : formStep === 2 ? (
              <>
                <Check className="mr-2 h-5 w-5" />
                Complete Setup
              </>
            ) : (
              <>
                Continue
                <ChevronRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}