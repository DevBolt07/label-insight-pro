import { useState } from "react";
import { MobileHeader } from "@/components/layout/mobile-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { 
  Bell, 
  Moon, 
  Shield, 
  Download, 
  Upload, 
  Trash2, 
  Languages, 
  Eye,
  Volume2,
  Smartphone,
  Accessibility,
  Database,
  LogOut,
  Play
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { User } from '@supabase/supabase-js';
import { useSettings } from "@/context/settings";
import { useTranslation } from "@/i18n";
import { playScanSound, SCAN_SOUND_OPTIONS, type ScanSoundType } from "@/utils/scanSounds";

interface SettingsProps {
  onNavigate: (page: string) => void;
  user: User;
}

export function Settings({ onNavigate, user }: SettingsProps) {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState(true);
  const [autoScan, setAutoScan] = useState(false);
  const [alertSensitivity, setAlertSensitivity] = useState([75]);

  // Global settings from context
  const { 
    darkMode, setDarkMode, 
    highContrast, setHighContrast, 
    textSize, setTextSize, 
    language, setLanguage,
    scanSound, setScanSound,
    scanSoundType, setScanSoundType,
    hapticFeedback, setHapticFeedback
  } = useSettings();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleExportData = () => {
    toast({
      title: "Export Started",
      description: "Your data export will be ready shortly."
    });
  };

  const handleImportData = () => {
    toast({
      title: "Import Data",
      description: "Select a backup file to import."
    });
  };

  const handleClearCache = () => {
    toast({
      title: "Cache Cleared",
      description: "App cache has been cleared successfully."
    });
  };

  const playScanSoundPreview = (soundType?: ScanSoundType) => {
    playScanSound(soundType ?? scanSoundType);
    toast({
      title: "Scan Sound",
      description: `Playing "${SCAN_SOUND_OPTIONS.find(o => o.value === (soundType ?? scanSoundType))?.label}" sound`
    });
  };

  const triggerVibrationPreview = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate([50, 30, 50]);
      toast({
        title: "Vibration",
        description: "This is the vibration you'll feel on scan"
      });
    } else {
      toast({
        title: "Vibration Not Supported",
        description: "Your device doesn't support vibration",
        variant: "destructive"
      });
    }
  };

  const settingsSections = [
    {
      title: "Notifications",
      icon: Bell,
      items: [
        {
          id: "notifications",
          label: "Enable Notifications",
          description: "Receive health alerts and product updates",
          type: "switch",
          value: notifications,
          onChange: setNotifications
        }
      ]
    },
    {
      title: "Appearance",
      icon: Moon,
      items: [
        {
          id: "darkMode",
          label: "Dark Mode",
          description: "Use dark theme throughout the app",
          type: "switch",
          value: darkMode,
          onChange: setDarkMode
        },
        {
          id: "textSize",
          label: "Text Size",
          description: "Adjust text size for better readability",
          type: "select",
          value: textSize,
          onChange: setTextSize,
          options: [
            { value: "small", label: "Small" },
            { value: "medium", label: "Medium" },
            { value: "large", label: "Large" }
          ]
        }
      ]
    },
    {
      title: "Scanning",
      icon: Eye,
      items: [
        {
          id: "autoScan",
          label: "Auto-Scan",
          description: "Automatically scan when barcode is detected",
          type: "switch",
          value: autoScan,
          onChange: setAutoScan
        },
        {
          id: "scanSound",
          label: "Scan Sound",
          description: "Play sound on successful scan",
          type: "switch",
          value: scanSound,
          onChange: setScanSound,
          testAction: () => playScanSoundPreview()
        },
        {
          id: "scanSoundType",
          label: "Sound Type",
          description: "Choose scan sound style",
          type: "select",
          value: scanSoundType,
          onChange: setScanSoundType,
          options: SCAN_SOUND_OPTIONS,
          testAction: playScanSoundPreview
        },
        {
          id: "hapticFeedback",
          label: "Vibration",
          description: "Vibrate on successful scan (mobile)",
          type: "switch",
          value: hapticFeedback,
          onChange: setHapticFeedback,
          testAction: triggerVibrationPreview
        }
      ]
    },
    {
      title: "Health Alerts",
      icon: Shield,
      items: [
        {
          id: "sensitivity",
          label: "Alert Sensitivity",
          description: "Adjust threshold for health warnings",
          type: "slider",
          value: alertSensitivity,
          onChange: setAlertSensitivity,
          min: 0,
          max: 100,
          step: 5
        }
      ]
    },
    {
      title: "Accessibility",
      icon: Accessibility,
      items: [
        {
          id: "highContrast",
          label: "High Contrast",
          description: "Increase color contrast for better visibility",
          type: "switch",
          value: highContrast,
          onChange: setHighContrast
        }
      ]
    },
    {
      title: "Language",
      icon: Languages,
      items: [
        {
          id: "language",
          label: "App Language",
          description: "Choose your preferred language",
          type: "select",
          value: language,
          onChange: setLanguage,
          options: [
            { value: "en", label: "English" },
            { value: "hi", label: "हिंदी (Hindi)" },
            { value: "ta", label: "தமிழ் (Tamil)" },
            { value: "te", label: "తెలుగు (Telugu)" },
            { value: "bn", label: "বাংলা (Bengali)" }
          ]
        }
      ]
    }
  ];

  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background pb-20">
      <MobileHeader 
        title={t('settings_title')}
        subtitle="Label Insight Pro"
        showBack
        onBack={() => onNavigate("profile")}
      />

      <div className="px-4 py-6 max-w-md mx-auto space-y-6">
        {/* Settings Sections */}
        {settingsSections.map((section, sectionIndex) => {
          const Icon = section.icon;
          return (
            <Card 
              key={section.title} 
              className={cn(
                "card-material animate-scale-in",
                `animate-stagger-${sectionIndex + 1}`
              )}
            >
              <div className="p-6 space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-title-large font-semibold">{section.title}</h3>
                </div>

                <Separator />

                <div className="space-y-6">
                  {section.items.map((item) => (
                    <div key={item.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1 flex-1">
                          <Label htmlFor={item.id} className="text-foreground font-medium">
                            {item.label}
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                        {item.type === "switch" && (
                          <div className="flex items-center gap-2">
                            {item.testAction && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={item.testAction}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            <Switch
                              id={item.id}
                              checked={item.value as boolean}
                              onCheckedChange={item.onChange as (checked: boolean) => void}
                            />
                          </div>
                        )}
                      </div>
                      {item.type === "select" && (
                        <div className="flex items-center gap-2">
                          <Select 
                            value={item.value as string} 
                            onValueChange={item.onChange as (value: string) => void}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {item.options?.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {item.testAction && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 shrink-0"
                              onClick={() => item.testAction?.(item.value as ScanSoundType)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      )}
                      {item.type === "slider" && (
                        <div className="space-y-2">
                          <Slider
                            value={item.value as number[]}
                            onValueChange={item.onChange as (value: number[]) => void}
                            min={item.min}
                            max={item.max}
                            step={item.step}
                            className="w-full"
                          />
                          <p className="text-xs text-muted-foreground text-right">
                            {(item.value as number[])[0]}%
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}

        {/* Data Management */}
        <Card className="card-material animate-scale-in animate-stagger-5">
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10">
                <Database className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-title-large font-semibold">Data Management</h3>
            </div>

            <Separator />

            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3"
                onClick={handleExportData}
              >
                <Download className="h-4 w-4" />
                Export Profile Data
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3"
                onClick={handleImportData}
              >
                <Upload className="h-4 w-4" />
                Import Profile Data
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3"
                onClick={handleClearCache}
              >
                <Trash2 className="h-4 w-4" />
                Clear Cache
              </Button>
            </div>
          </div>
        </Card>

        {/* Logout */}
        <Card className="card-material animate-scale-in animate-stagger-6">
          <div className="p-6">
            <Button 
              variant="destructive" 
              className="w-full gap-3"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
