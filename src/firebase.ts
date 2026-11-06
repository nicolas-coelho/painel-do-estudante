import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  Firestore,
} from 'firebase/firestore';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  Auth,
} from 'firebase/auth';
import { FirebaseConfig } from './types';

// Default config from Vite environment variables (if provided)
const envConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

const LOCAL_STORAGE_FIREBASE_CONFIG = 'painel_firebase_config';

export function getStoredFirebaseConfig(): FirebaseConfig | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_FIREBASE_CONFIG);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.apiKey && parsed.projectId) return parsed;
    }
  } catch {
    // fallback
  }

  if (envConfig.apiKey && envConfig.projectId) {
    return envConfig;
  }
  return null;
}

export function saveStoredFirebaseConfig(config: FirebaseConfig) {
  localStorage.setItem(LOCAL_STORAGE_FIREBASE_CONFIG, JSON.stringify(config));
}

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

export function initFirebase(customConfig?: FirebaseConfig): {
  success: boolean;
  error?: string;
} {
  try {
    const cfg = customConfig || getStoredFirebaseConfig();
    if (!cfg || !cfg.apiKey || !cfg.projectId) {
      return { success: false, error: 'Credenciais do Firebase incompletas' };
    }

    if (getApps().length === 0) {
      app = initializeApp(cfg);
    } else {
      app = getApp();
    }

    db = getFirestore(app);
    auth = getAuth(app);
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao inicializar Firebase:', err);
    return { success: false, error: err.message || 'Erro de inicialização' };
  }
}

// Inicializa na carga inicial caso exista configuração
initFirebase();

export function getFirebaseDb(): Firestore | null {
  if (!db) initFirebase();
  return db;
}

export function getFirebaseAuth(): Auth | null {
  if (!auth) initFirebase();
  return auth;
}

// Autenticação com Google
export async function loginWithGoogle(): Promise<User | null> {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) {
    throw new Error('Firebase não inicializado. Configure seu projeto primeiro.');
  }
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await signInWithPopup(firebaseAuth, provider);
  return result.user;
}

export async function logoutFirebase(): Promise<void> {
  const firebaseAuth = getFirebaseAuth();
  if (firebaseAuth) {
    await signOut(firebaseAuth);
  }
}

export function onUserChanged(callback: (user: User | null) => void) {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(firebaseAuth, callback);
}

// Salvar dados no Cloud Firestore
export async function saveToFirestore(
  userId: string,
  dashboardData: any
): Promise<void> {
  const firestore = getFirebaseDb();
  if (!firestore) return;

  const userDocRef = doc(firestore, 'student_dashboards', userId);
  await setDoc(userDocRef, {
    ...dashboardData,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

// Ouvir alterações em tempo real no Firestore
export function subscribeToFirestore(
  userId: string,
  onData: (data: any) => void,
  onError?: (err: Error) => void
) {
  const firestore = getFirebaseDb();
  if (!firestore) return () => {};

  const userDocRef = doc(firestore, 'student_dashboards', userId);
  return onSnapshot(
    userDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onData(snapshot.data());
      }
    },
    (err) => {
      console.error('Erro no listener do Firestore:', err);
      if (onError) onError(err);
    }
  );
}
