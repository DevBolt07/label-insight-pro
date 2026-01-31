import { useState } from 'react';
import { MobileHeader } from '@/components/layout/mobile-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff, LogIn, UserPlus, Shield, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface AuthProps {
  onNavigate: (page: string) => void;
}

export function Auth({ onNavigate }: AuthProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: ''
  });
  
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signIn(formData.email, formData.password);
      
      if (error) {
        toast({
          title: "Sign In Failed",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Welcome back!",
          description: "You've been successfully signed in."
        });
        onNavigate('home');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match. Please try again.",
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signUp(formData.email, formData.password, {
        display_name: formData.displayName || formData.email.split('@')[0]
      });
      
      if (error) {
        if (error.message.includes('already registered')) {
          toast({
            title: "Account Exists",
            description: "An account with this email already exists. Please sign in instead.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Sign Up Failed",
            description: error.message,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Account Created!",
          description: "Please check your email to verify your account, then sign in."
        });
        // Switch to sign in tab
        setFormData(prev => ({ ...prev, confirmPassword: '', displayName: '' }));
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <MobileHeader 
        title="NutriScanner"
        subtitle="Welcome! Please sign in to continue"
      />

      <div className="px-4 py-8 max-w-md mx-auto space-y-8 animate-fade-in">
        <div className="text-center space-y-6">
          <div className="mx-auto w-24 h-24 bg-gradient-primary rounded-3xl flex items-center justify-center shadow-lg hover-scale animate-float">
            <Shield className="h-12 w-12 text-primary-foreground" />
          </div>
          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl text-foreground font-bold tracking-tight">
              Smart Food Safety Scanner
            </h1>
            <p className="text-base text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Get instant health insights and personalized warnings for any food product
            </p>
          </div>
        </div>

        <Card className="card-material border border-border/30 shadow-lg backdrop-blur-sm overflow-hidden">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 p-1.5 bg-muted/50 rounded-xl">
              <TabsTrigger 
                value="signin" 
                className="flex items-center gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md transition-all duration-300"
              >
                <LogIn className="h-4 w-4" />
                <span className="font-medium">Sign In</span>
              </TabsTrigger>
              <TabsTrigger 
                value="signup" 
                className="flex items-center gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-md transition-all duration-300"
              >
                <UserPlus className="h-4 w-4" />
                <span className="font-medium">Sign Up</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-5 px-1">
              <form onSubmit={handleSignIn} className="space-y-5">
                <div className="space-y-2.5">
                  <Label htmlFor="signin-email" className="text-sm font-medium">Email Address</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                    className="h-12 rounded-xl border-border/50 focus:border-primary transition-all duration-300 text-base"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="signin-password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Input
                      id="signin-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      required
                      className="h-12 rounded-xl pr-12 border-border/50 focus:border-primary transition-all duration-300 text-base"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 hover:bg-accent/50 rounded-lg transition-all"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-primary text-primary-foreground rounded-xl font-semibold shadow-lg hover:shadow-xl hover-lift transition-all duration-300 mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-5 w-5 mr-2" />
                      Sign In
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="space-y-5 px-1">
              <form onSubmit={handleSignUp} className="space-y-5">
                <div className="space-y-2.5">
                  <Label htmlFor="signup-name" className="text-sm font-medium">Display Name (Optional)</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={formData.displayName}
                    onChange={(e) => handleInputChange('displayName', e.target.value)}
                    className="h-12 rounded-xl border-border/50 focus:border-primary transition-all duration-300 text-base"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="signup-email" className="text-sm font-medium">Email Address</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    required
                    className="h-12 rounded-xl border-border/50 focus:border-primary transition-all duration-300 text-base"
                  />
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="signup-password" className="text-sm font-medium">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Minimum 6 characters"
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      required
                      minLength={6}
                      className="h-12 rounded-xl pr-12 border-border/50 focus:border-primary transition-all duration-300 text-base"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 hover:bg-accent/50 rounded-lg transition-all"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <Label htmlFor="signup-confirm" className="text-sm font-medium">Confirm Password</Label>
                  <Input
                    id="signup-confirm"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    required
                    className="h-12 rounded-xl border-border/50 focus:border-primary transition-all duration-300 text-base"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-primary text-primary-foreground rounded-xl font-semibold shadow-lg hover:shadow-xl hover-lift transition-all duration-300 mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-5 w-5 mr-2" />
                      Create Account
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>

        <div className="text-center space-y-2 pb-safe">
          <p className="text-xs text-muted-foreground leading-relaxed">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}