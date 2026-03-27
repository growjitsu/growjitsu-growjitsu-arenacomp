import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { isProfileComplete } from '../utils/profileValidation';

interface ProfileContextType {
  isProfileValid: boolean | null;
  checkProfile: () => Promise<boolean>;
  isLoading: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isProfileValid, setIsProfileValid] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkProfile = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) {
      setIsProfileValid(null);
      setIsLoading(false);
      return false;
    }

    try {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const profileData = docSnap.data();
        const isValid = isProfileComplete(profileData);
        setIsProfileValid(isValid);
        setIsLoading(false);
        return isValid;
      } else {
        setIsProfileValid(false);
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('[PROFILE CONTEXT] Error checking profile:', error);
      setIsLoading(false);
      return false;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        checkProfile();
      } else {
        setIsProfileValid(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, [checkProfile]);

  return (
    <ProfileContext.Provider value={{ isProfileValid, checkProfile, isLoading }}>
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
