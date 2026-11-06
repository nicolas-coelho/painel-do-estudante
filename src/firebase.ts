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
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
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

// Autenticação com E-mail e Senha
export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) {
    throw new Error('Firebase não inicializado. Configure seu projeto primeiro.');
  }
  const result = await signInWithEmailAndPassword(firebaseAuth, email.trim(), pass);
  return result.user;
}

// Cadastro com E-mail e Senha
export async function registerWithEmail(email: string, pass: string, displayName?: string): Promise<User> {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) {
    throw new Error('Firebase não inicializado. Configure seu projeto primeiro.');
  }
  const result = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), pass);
  if (displayName && displayName.trim() && result.user) {
    try {
      await updateProfile(result.user, { displayName: displayName.trim() });
    } catch {
      // ignorar se falhar atualizar nome
    }
  }
  return result.user;
}

// Recuperação de Senha por E-mail
export async function resetPassword(email: string): Promise<void> {
  const firebaseAuth = getFirebaseAuth();
  if (!firebaseAuth) {
    throw new Error('Firebase não inicializado. Configure seu projeto primeiro.');
  }
  await sendPasswordResetEmail(firebaseAuth, email.trim());
}

// Whitelist de e-mails autorizados
export function getAllowedEmails(): string[] {
  const envEmails = import.meta.env.VITE_ALLOWED_EMAILS;
  if (!envEmails) return [];
  return envEmails
    .split(',')
    .map((e: string) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(email: string | null | undefined): boolean {
  const allowed = getAllowedEmails();
  // Se nenhuma whitelist foi configurada, permite qualquer usuário autenticado
  if (allowed.length === 0) return true;
  if (!email) return false;
  return allowed.includes(email.trim().toLowerCase());
}

// Mensagens amigáveis em português para erros do Firebase Auth
export function getFriendlyAuthErrorMessage(errorCodeOrMessage: string): string {
  const code = errorCodeOrMessage.toLowerCase();
  if (code.includes('auth/invalid-credential') || code.includes('auth/wrong-password') || code.includes('invalid-credential')) {
    return 'E-mail ou senha incorretos. Verifique suas credenciais.';
  }
  if (code.includes('auth/user-not-found')) {
    return 'Nenhuma conta encontrada com este e-mail.';
  }
  if (code.includes('auth/email-already-in-use')) {
    return 'Este e-mail já está em uso por outra conta. Faça login ou recupere a senha.';
  }
  if (code.includes('auth/weak-password')) {
    return 'A senha deve conter no mínimo 6 caracteres.';
  }
  if (code.includes('auth/invalid-email')) {
    return 'O formato do e-mail é inválido.';
  }
  if (code.includes('auth/popup-closed-by-user')) {
    return 'A janela de autenticação foi fechada antes de concluir.';
  }
  if (code.includes('auth/popup-blocked')) {
    return 'O popup de autenticação foi bloqueado pelo seu navegador.';
  }
  if (code.includes('auth/too-many-requests')) {
    return 'Muitas tentativas sem sucesso. Aguarde alguns minutos e tente novamente.';
  }
  if (code.includes('auth/network-request-failed')) {
    return 'Erro de conexão com a internet. Verifique sua rede.';
  }
  if (code.includes('auth/operation-not-allowed')) {
    return 'Este método de login (E-mail/Senha ou Google) ainda não foi ativado no Firebase Console -> Authentication -> Sign-in method.';
  }
  return 'Ocorreu um erro ao processar. Tente novamente.';
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
): Promise<{ success: boolean; error?: string }> {
  try {
    const firestore = getFirebaseDb();
    if (!firestore) return { success: false, error: 'Firestore não inicializado' };

    const docId = userId || DEFAULT_DASHBOARD_ID;
    const userDocRef = doc(firestore, 'student_dashboards', docId);
    await setDoc(
      userDocRef,
      {
        ...dashboardData,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return { success: true };
  } catch (err: any) {
    console.error(`Erro ao salvar no Firestore (doc: ${userId}):`, err);
    return { success: false, error: err.message || 'Erro ao gravar' };
  }
}

// Ouvir alterações em tempo real no Firestore (modo direto ou por usuário)
export function subscribeToFirestore(
  userId: string = DEFAULT_DASHBOARD_ID,
  onData: (data: any, metadata?: any) => void,
  onError?: (err: Error) => void
) {
  const firestore = getFirebaseDb();
  if (!firestore) return () => {};

  const docId = userId || DEFAULT_DASHBOARD_ID;
  const userDocRef = doc(firestore, 'student_dashboards', docId);
  return onSnapshot(
    userDocRef,
    (snapshot: any) => {
      if (snapshot.exists()) {
        onData(snapshot.data(), snapshot.metadata);
      }
    },
    (err: any) => {
      console.error('Erro no listener do Firestore:', err);
      if (onError) onError(err);
    }
  );
}
