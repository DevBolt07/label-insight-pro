import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];

export const profileService = {
  async getProfile(userId: string): Promise<Profile | null> {
    console.log('Fetching profile for user:', userId);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      throw new Error(`Failed to fetch profile: ${error.message}`);
    }

    console.log('Profile fetched:', data);
    return data;
  },

  async upsertProfile(profile: ProfileInsert): Promise<Profile> {
    console.log('Upserting profile:', profile);
    
    // First, check if profile exists
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', profile.user_id)
      .maybeSingle();

    if (existingProfile) {
      // Update existing profile
      console.log('Updating existing profile with ID:', existingProfile.id);
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...profile,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', profile.user_id)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        throw new Error(`Failed to update profile: ${error.message}`);
      }

      console.log('Profile updated:', data);
      return data;
    } else {
      // Create new profile - let Supabase generate the ID
      console.log('Creating new profile for user:', profile.user_id);
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: profile.user_id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          display_name: profile.display_name,
          age: profile.age,
          height_cm: profile.height_cm,
          weight_kg: profile.weight_kg,
          bmi: profile.bmi,
          health_conditions: profile.health_conditions,
          allergies: profile.allergies,
          dietary_restrictions: profile.dietary_restrictions,
          dietary_preferences: profile.dietary_preferences,
          custom_health_conditions: profile.custom_health_conditions,
          custom_allergies: profile.custom_allergies,
          custom_dietary_preferences: profile.custom_dietary_preferences,
          age_group: profile.age_group,
          nutrition_goals: profile.nutrition_goals,
          onboarding_completed: profile.onboarding_completed,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        throw new Error(`Failed to create profile: ${error.message}`);
      }

      console.log('Profile created:', data);
      return data;
    }
  },

  // Alternative simpler approach - just use update
  async updateProfile(userId: string, updates: ProfileUpdate): Promise<Profile> {
    console.log('Updating profile for user:', userId, 'with:', updates);
    
    const { data, error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    console.log('Profile updated:', data);
    return data;
  },

  // Test function to check connection
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase.from('profiles').select('count').limit(1);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
  }
};