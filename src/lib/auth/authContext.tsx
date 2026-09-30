import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInWithPopup,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider, ADMIN_EMAIL } from '../firebase';
import { UserProfile, UserRole } from '../../types/saas';
import { getUserSubscription } from '../saas/subscriptionService';
import { getOrCreateUserBot } from '../saas/botService';

import { getFriendlyFirebaseErrorMessage } from '../firebaseErrors';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, pass: string, displayName?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  resetPassword: (email: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  logout: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync profile from Firestore or initialize if first time
  const syncUserProfile = async (user: FirebaseUser): Promise<UserProfile> => {
    const isDesignatedAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    const fallbackProfile: UserProfile = {
      id: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'BotCloud User',
      role: isDesignatedAdmin ? 'admin' : 'user',
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    try {
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const existing = snap.data() as UserProfile;
        // Ensure designated admin always keeps admin role
        if (isDesignatedAdmin && existing.role !== 'admin') {
          existing.role = 'admin';
          try {
            await updateDoc(userRef, { role: 'admin' });
          } catch (updateErr) {
            console.warn('[Auth] Could not update admin role in Firestore:', updateErr);
          }
        }
        setProfile(existing);
        return existing;
      }

      // New profile creation in Firestore
      try {
        await setDoc(userRef, fallbackProfile);
        await getUserSubscription(user.uid);
        await getOrCreateUserBot(user.uid, user.email || '', fallbackProfile.displayName);
      } catch (writeErr) {
        console.warn('[Auth] Initial Firestore record creation warning:', writeErr);
      }

      setProfile(fallbackProfile);
      return fallbackProfile;
    } catch (err) {
      console.warn('[Auth] Profile sync fallback to in-memory profile:', err);
      setProfile(fallbackProfile);
      return fallbackProfile;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          await syncUserProfile(user);
        } catch (err) {
          console.error('[Auth] Error syncing user on auth state change:', err);
        }
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await signInWithEmailAndPassword(auth, email.trim(), pass);
      await syncUserProfile(res.user);
      return { success: true };
    } catch (err: unknown) {
      const friendlyMsg = getFriendlyFirebaseErrorMessage(err);
      return { success: false, error: friendlyMsg };
    }
  };

  const register = async (
    email: string,
    pass: string,
    displayName?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanEmail = email.trim();
      if (!cleanEmail || !pass || pass.length < 6) {
        return { success: false, error: 'كلمة المرور يجب أن تتكون من 6 أحرف على الأقل.' };
      }

      const res = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      await syncUserProfile(res.user);
      return { success: true };
    } catch (err: unknown) {
      const friendlyMsg = getFriendlyFirebaseErrorMessage(err);
      return { success: false, error: friendlyMsg };
    }
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      await syncUserProfile(res.user);
      return { success: true };
    } catch (err: unknown) {
      const friendlyMsg = getFriendlyFirebaseErrorMessage(err);
      return { success: false, error: friendlyMsg };
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { success: true, message: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني.' };
    } catch (err: unknown) {
      const friendlyMsg = getFriendlyFirebaseErrorMessage(err);
      return { success: false, error: friendlyMsg };
    }
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (auth.currentUser) {
      await syncUserProfile(auth.currentUser);
    }
  };

  const isUserAdmin =
    profile?.role === 'admin' ||
    firebaseUser?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const hasRole = (role: UserRole): boolean => {
    if (isUserAdmin) return true;
    return profile?.role === role;
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        isAuthenticated: !!firebaseUser,
        isAdmin: isUserAdmin,
        isLoading,
        login,
        register,
        loginWithGoogle,
        resetPassword,
        logout,
        hasRole,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
