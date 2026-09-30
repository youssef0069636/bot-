import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId || 'ai-studio-minecraftcontrol-299e39a9-f721-40ad-b6bf-e0c2646c0b84',
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
};

// Initialize Firebase App exactly once
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Database ID resolution: checks environment variable first, then firestoreDatabaseId in config JSON
const resolvedDatabaseId =
  import.meta.env?.VITE_FIREBASE_DATABASE_ID !== undefined
    ? import.meta.env.VITE_FIREBASE_DATABASE_ID
    : firebaseConfigJson.firestoreDatabaseId;

// Initialize Firestore: Use named database if specified, or default if '(default)' or empty
export const db =
  resolvedDatabaseId && resolvedDatabaseId !== '(default)'
    ? getFirestore(app, resolvedDatabaseId)
    : getFirestore(app);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const ADMIN_EMAIL = 'jeuxapk6@gmail.com';
export { app };

/**
 * Diagnostics Health Check for Firebase and Firestore
 */
export async function checkFirebaseHealth(): Promise<{ ok: boolean; message: string; code?: string }> {
  try {
    await getDocFromServer(doc(db, '_system_health', 'ping'));
    return { ok: true, message: 'Firebase & Firestore are connected and fully operational.' };
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    const code = err.code || '';
    const message = err.message || '';

    if (message.includes('not found') && message.includes('Database')) {
      return {
        ok: false,
        code: 'DATABASE_NOT_FOUND',
        message: `قاعدة بيانات Firestore '${resolvedDatabaseId || '(default)'}' غير موجودة في مشروع Firebase '${firebaseConfig.projectId}'.`,
      };
    }
    if (code.includes('permission-denied') || message.includes('Missing or insufficient permissions')) {
      return { ok: true, message: 'Firestore is reachable and security rules are active.' };
    }
    return {
      ok: false,
      code,
      message: message || 'Firebase connectivity check returned an error.',
    };
  }
}
