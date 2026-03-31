import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { isProfileComplete, getMissingProfileFields } from '../utils/profileValidation';
import { ArenaProfile } from '../types';

interface ProfileContextType {
  isProfileValid: boolean | null;
  isLoggedIn: boolean;
  profile: ArenaProfile | null;
  checkProfile: (updatedProfile?: ArenaProfile) => Promise<boolean>;
  isLoading: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isProfileValid, setIsProfileValid] = useState<boolean | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [profile, setProfile] = useState<ArenaProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkProfile = useCallback(async (updatedProfile?: ArenaProfile) => {
    try {
      setIsLoading(true);
      
      // If we already have the updated profile, use it directly for validation
      if (updatedProfile) {
        console.log('[PROFILE CONTEXT] Using provided profile for validation:', updatedProfile.id);
        console.log('[PROFILE CONTEXT] Provided profile data:', updatedProfile);
        
        // Fetch modalities if they are not in the provided profile
        let modalities = updatedProfile.modalities || [];
        if (modalities.length === 0) {
          console.log('[PROFILE CONTEXT] Fetching modalities for provided profile...');
          const { data: modalitiesData } = await supabase
            .from('user_modalities')
            .select('*')
            .eq('user_id', updatedProfile.id);
          modalities = modalitiesData || [];
        }

        const validationData = {
          ...updatedProfile,
          modalidades: modalities
        };
        
        const missingFields = getMissingProfileFields(validationData);

        const isValid = missingFields.length === 0;
        
        console.log('[PROFILE CONTEXT] Validation result (immediate):', { isValid, missingFields });
        
        setProfile({ ...updatedProfile, modalities });
        setIsProfileValid(isValid);
        setIsLoggedIn(true);
        setIsLoading(false);
        return isValid;
      }

      // Standard fetch logic
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('[PROFILE CONTEXT] No user found');
        setProfile(null);
        setIsProfileValid(null);
        setIsLoggedIn(false);
        setIsLoading(false);
        return false;
      }

      setIsLoggedIn(true);
      console.log('[PROFILE CONTEXT] Fetching profile for user:', user.id);

      // Fetch profile from Supabase
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profileData) {
        console.log('[PROFILE CONTEXT] Profile not found or error:', profileError);
        setProfile(null);
        setIsProfileValid(false);
        setIsLoading(false);
        return false;
      }

      // Fetch modalities from Supabase
      const { data: modalities, error: modalitiesError } = await supabase
        .from('user_modalities')
        .select('*')
        .eq('user_id', user.id);

      const missingFields = getMissingProfileFields({
        ...profileData,
        modalidades: modalities || []
      });

      const isValid = missingFields.length === 0;

      if (!isValid) {
        console.warn('[PROFILE CONTEXT] Profile incomplete. Missing fields:', missingFields);
      } else {
        console.log('[PROFILE CONTEXT] Profile is complete!');
      }

      setProfile({ ...profileData, modalities: modalities || [] });
      setIsProfileValid(isValid);
      setIsLoading(false);
      return isValid;
    } catch (error) {
      console.error('[PROFILE CONTEXT] Error checking profile:', error);
      setIsLoading(false);
      return false;
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[PROFILE CONTEXT] Auth event:', event);
      if (session) {
        setIsLoggedIn(true);
        checkProfile();
      } else {
        setIsLoggedIn(false);
        setIsProfileValid(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [checkProfile]);

  return (
    <ProfileContext.Provider value={{ isProfileValid, isLoggedIn, profile, checkProfile, isLoading }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
