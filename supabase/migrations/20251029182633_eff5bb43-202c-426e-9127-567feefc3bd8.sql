-- Add new columns to profiles table for onboarding
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS age_group text,
ADD COLUMN IF NOT EXISTS dietary_preferences text[],
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.age_group IS 'User age category: Child, Teen, Adult, Senior';
COMMENT ON COLUMN public.profiles.dietary_preferences IS 'Array of dietary preference choices';
COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Whether user has completed onboarding flow';