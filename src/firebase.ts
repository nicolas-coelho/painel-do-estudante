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

// Default project config for Painel do Estudante
const defaultFirebaseConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyD5uzbhpcINOZpH4w_aRBzitlKW7DErEI0',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'painel-estudante-8b2c.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'painel-estudante-8b2c',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'painel-estudante-8b2c.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '311806318624',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:311806318624:web:c703c752e0c10f8df50445',
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

  return defaultFirebaseConfig;
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

export const DEFAULT_DASHBOARD_ID = 'principal';

// Salvar dados no Cloud Firestore (modo direto ou por usuário)
export async function saveToFirestore(
  userId: string = DEFAULT_DASHBOARD_ID,
  dashboardData: any
): Promise<void> {
  const firestore = getFirebaseDb();
  if (!firestore) return;

  const docId = userId || DEFAULT_DASHBOARD_ID;
  const userDocRef = doc(firestore, 'student_dashboards', docId);
  await setDoc(userDocRef, {
    ...dashboardData,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

// Ouvir alterações em tempo real no Firestore (modo direto ou por usuário)
export function subscribeToFirestore(
  userId: string = DEFAULT_DASHBOARD_ID,
  onData: (data: any) => void,
  onError?: (err: Error) => void
) {
  const firestore = getFirebaseDb();
  if (!firestore) return () => {};

  const docId = userId || DEFAULT_DASHBOARD_ID;
  const userDocRef = doc(firestore, 'student_dashboards', docId);
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
