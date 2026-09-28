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
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);

    const isDesignatedAdmin = user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    if (snap.exists()) {
      const existing = snap.data() as UserProfile;
      // Ensure designated admin always keeps admin role
      if (isDesignatedAdmin && existing.role !== 'admin') {
        existing.role = 'admin';
        await updateDoc(userRef, { role: 'admin' });
      }
      setProfile(existing);
      return existing;
    }

    // New profile creation
    const newProfile: UserProfile = {
      id: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email?.split('@')[0] || 'BotCloud User',
      role: isDesignatedAdmin ? 'admin' : 'user',
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    await setDoc(userRef, newProfile);
    // Initialize subscription & single bot record
    await getUserSubscription(user.uid);
    await getOrCreateUserBot(user.uid, user.email || '', newProfile.displayName);

    setProfile(newProfile);
    return newProfile;
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          await syncUserProfile(user);
        } catch (err) {
          console.error('Error syncing profile:', err);
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
    } catch (err: any) {
      let msg = 'Failed to sign in. Please check your credentials.';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = 'Invalid email address or password.';
      } else if (err.code === 'auth/user-disabled') {
        msg = 'This account has been disabled. Contact support.';
      } else if (err.code === 'auth/too-many-requests') {
        msg = 'Too many failed login attempts. Please try again in a few minutes.';
      }
      return { success: false, error: msg };
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
        return { success: false, error: 'Password must be at least 6 characters.' };
      }

      const res = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      await syncUserProfile(res.user);
      return { success: true };
    } catch (err: any) {
      let msg = 'Failed to register account.';
      if (err.code === 'auth/email-already-in-use') {
        msg = 'This email is already registered. Please sign in instead.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Invalid email address format.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password is too weak (minimum 6 characters).';
      }
      return { success: false, error: msg };
    }
  };

  const loginWithGoogle = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      await syncUserProfile(res.user);
      return { success: true };
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        return { success: false, error: 'Sign-in window was closed.' };
      }
      if (err.code === 'auth/unauthorized-domain') {
        return {
          success: false,
          error: 'النطاق الحالي غير مضاف في Firebase Authentication. يرجى إضافة bot-aternos.vercel.app في قائمة Authorized Domains في لوحة تحكم Firebase.',
        };
      }
      return { success: false, error: err.message || 'Google sign-in failed.' };
    }
  };

  const resetPassword = async (email: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { success: true, message: 'Password reset link sent to your email.' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Could not send reset email.' };
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
