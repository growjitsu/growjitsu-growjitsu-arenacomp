import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { isProfileComplete, getMissingProfileFields } from '../utils/profileValidation';
import { ArenaProfile } from '../types';

interface ProfileContextType {
  isProfileValid: boolean | null;
  isLoggedIn: boolean;
  checkProfile: () => Promise<boolean>;
  isLoading: boolean;
  profile: (ArenaProfile & { email_confirmed_at?: string }) | null;
  user: any | null;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<ArenaProfile | null>(() => {
    try {
      const saved = localStorage.getItem('arenacomp_profile_cache');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isProfileValid, setIsProfileValid] = useState<boolean | null>(() => {
    try {
      const saved = localStorage.getItem('arenacomp_profile_cache');
      if (!saved) return null;
      return isProfileComplete(JSON.parse(saved));
    } catch {
      return null;
    }
  });
  const [isLoggedIn, setIsLoggedIn] = useState(() => !!localStorage.getItem('arenacomp_profile_cache'));
  const [isLoading, setIsLoading] = useState(() => !localStorage.getItem('arenacomp_profile_cache'));
  const [user, setUser] = useState<any | null>(null);

  const checkProfile = useCallback(async () => {
    try {
      // Only show full-screen loading if we don't have a profile yet
      if (!profile) {
        setIsLoading(true);
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('[PROFILE CONTEXT] No user found');
        setIsProfileValid(null);
        setIsLoggedIn(false);
        setIsLoading(false);
        localStorage.removeItem('arenacomp_profile_cache');
        return false;
      }

      setIsLoggedIn(true);
      setUser(user);
      console.log('[PROFILE CONTEXT] Checking profile for user:', user.id);

      // Fetch profile from Supabase
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError || !profileData) {
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

      const missingFields = getMissingProfileFields({
        ...profileData,
        modalidades: modalities || []
      });

      const isValid = missingFields.length === 0;
      const completeProfile = {
        ...profileData,
        modalities: modalities || [],
        email_confirmed_at: user.email_confirmed_at
      };

      // Update cache
      localStorage.setItem('arenacomp_profile_cache', JSON.stringify(completeProfile));

      setProfile(completeProfile);
      setIsProfileValid(isValid);
      setIsLoading(false);
      return isValid;
    } catch (error) {
      console.error('[PROFILE CONTEXT] Error checking profile:', error);
      setIsLoading(false);
      return false;
    }
  }, [profile]);

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
    <ProfileContext.Provider value={{ isProfileValid, isLoggedIn, checkProfile, isLoading, profile, user }}>
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
