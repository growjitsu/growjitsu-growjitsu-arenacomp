import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { isProfileComplete } from '../utils/profileValidation';

interface ProfileContextType {
  isProfileValid: boolean | null;
  isLoggedIn: boolean;
  checkProfile: () => Promise<boolean>;
  isLoading: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isProfileValid, setIsProfileValid] = useState<boolean | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const checkProfile = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('[PROFILE CONTEXT] No user found');
        setIsProfileValid(null);
        setIsLoggedIn(false);
        setIsLoading(false);
        return false;
      }

      setIsLoggedIn(true);
      console.log('[PROFILE CONTEXT] Checking profile for user:', user.id);

      // Fetch profile from Supabase
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        console.log('[PROFILE CONTEXT] Profile not found or error:', profileError);
        setIsProfileValid(false);
        setIsLoading(false);
        return false;
      }

      // Fetch modalities from Supabase
      const { data: modalities, error: modalitiesError } = await supabase
        .from('user_modalities')
        .select('*')
        .eq('user_id', user.id);

      const isValid = isProfileComplete({
        ...profile,
        modalidades: modalities || []
      });

      console.log('[PROFILE CONTEXT] Profile validity:', isValid);
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
    <ProfileContext.Provider value={{ isProfileValid, isLoggedIn, checkProfile, isLoading }}>
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
