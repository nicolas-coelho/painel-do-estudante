import React, { useState, useEffect } from 'react';
import {
  getStoredFirebaseConfig,
  saveStoredFirebaseConfig,
  initFirebase,
  loginWithGoogle,
  logoutFirebase,
  onUserChanged,
  saveToFirestore,
} from '../firebase';
import { FirebaseConfig } from '../types';
import { User } from 'firebase/auth';
import { Cloud, Check, AlertCircle, LogIn, LogOut, Key, ShieldCheck, X, RefreshCw, Mail, Send } from 'lucide-react';

interface FirebaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardData: any;
  onDataLoadedFromCloud?: (data: any) => void;
}

export const FirebaseModal: React.FC<FirebaseModalProps> = ({
  isOpen,
  onClose,
  dashboardData,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isConfiguringKeys, setIsConfiguringKeys] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSendingDigest, setIsSendingDigest] = useState(false);
  const [resendApiKey, setResendApiKey] = useState<string>(() => {
    return localStorage.getItem('painel_resend_api_key') || '';
  });

  const existingConfig = getStoredFirebaseConfig();
  const [apiKey, setApiKey] = useState(existingConfig?.apiKey || '');
  const [authDomain, setAuthDomain] = useState(existingConfig?.authDomain || '');
  const [projectId, setProjectId] = useState(existingConfig?.projectId || '');
  const [storageBucket, setStorageBucket] = useState(existingConfig?.storageBucket || '');
  const [messagingSenderId, setMessagingSenderId] = useState(existingConfig?.messagingSenderId || '');
  const [appId, setAppId] = useState(existingConfig?.appId || '');

  useEffect(() => {
    const unsub = onUserChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const handleTriggerDailyDigest = async () => {
    setIsSendingDigest(true);
    setStatusMessage(null);
    try {
      if (resendApiKey.trim()) {
        localStorage.setItem('painel_resend_api_key', resendApiKey.trim());
      }
      const res = await fetch('/api/daily-digest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-resend-api-key': resendApiKey.trim(),
        },
        body: JSON.stringify({ resendApiKey: resendApiKey.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setStatusMessage({
          text: data.message || `Resumo gerado com sucesso para ${data.targetEmail}!`,
          type: 'success',
        });
      } else {
        setStatusMessage({
          text: data.error || 'Erro ao processar resumo diário.',
          type: 'error',
        });
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Erro ao disparar resumo', type: 'error' });
    } finally {
      setIsSendingDigest(false);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const newConfig: FirebaseConfig = {
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim(),
      projectId: projectId.trim(),
      storageBucket: storageBucket.trim(),
      messagingSenderId: messagingSenderId.trim(),
      appId: appId.trim(),
    };

    saveStoredFirebaseConfig(newConfig);
    const result = initFirebase(newConfig);
    if (result.success) {
      setStatusMessage({ text: 'Configuração do Firebase salva com sucesso!', type: 'success' });
      setIsConfiguringKeys(false);
    } else {
      setStatusMessage({ text: result.error || 'Erro ao inicializar Firebase', type: 'error' });
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setStatusMessage(null);
      const user = await loginWithGoogle();
      if (user) {
        setStatusMessage({ text: `Conectado como ${user.displayName || user.email}!`, type: 'success' });
        // Sincroniza dados atuais
        setIsSyncing(true);
        await saveToFirestore(user.uid, dashboardData);
        setIsSyncing(false);
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Erro ao autenticar com Google', type: 'error' });
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    await logoutFirebase();
    setCurrentUser(null);
    setStatusMessage({ text: 'Desconectado do Firebase', type: 'success' });
  };

  const handleManualSync = async () => {
    if (!currentUser) return;
    try {
      setIsSyncing(true);
      await saveToFirestore(currentUser.uid, dashboardData);
      setStatusMessage({ text: 'Dados sincronizados com o Cloud Firestore!', type: 'success' });
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Erro ao sincronizar', type: 'error' });
    } finally {
      setIsSyncing(false);
    }
  };

  const isConfigured = !!(existingConfig && existingConfig.apiKey && existingConfig.projectId);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#202020] rounded-2xl border border-[#e9e9e8] dark:border-[#2f2f2f] w-full max-w-lg shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-xl">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-[#37352f] dark:text-[#f3f3f2]">
                Sincronização com Google Firebase
              </h3>
              <p className="text-xs text-[#787774] dark:text-[#9b9a97]">
                Guarde suas disciplinas, tarefas e revisões na nuvem do Google
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40'
                : 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-900/40'
            }`}
          >
            {statusMessage.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Main Connection State */}
        <div className="p-4 bg-[#fcfbf9] dark:bg-[#252525] rounded-xl border border-[#e9e9e8] dark:border-[#2f2f2f] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[#787774] dark:text-[#9b9a97]">Estado do Firebase:</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                currentUser
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                  : isConfigured
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                  : 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${currentUser ? 'bg-emerald-500' : isConfigured ? 'bg-blue-500' : 'bg-stone-400'}`} />
              {currentUser ? 'Conectado e Autenticado' : isConfigured ? 'Pronto para Login' : 'Modo Local (LocalStorage)'}
            </span>
          </div>

          {currentUser ? (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3">
                {currentUser.photoURL ? (
                  <img src={currentUser.photoURL} alt="Foto" className="w-9 h-9 rounded-full border border-stone-200" />
                ) : (
                  <div className="w-9 h-9 bg-blue-600 text-white font-bold text-xs rounded-full flex items-center justify-center">
                    {currentUser.displayName?.[0] || 'U'}
                  </div>
                )}
                <div className="overflow-hidden">
                  <div className="font-semibold text-xs text-[#37352f] dark:text-[#f3f3f2] truncate">
                    {currentUser.displayName || 'Usuário Google'}
                  </div>
                  <div className="text-[11px] text-[#787774] dark:text-[#9b9a97] truncate">{currentUser.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-all shadow-sm disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Nuvem Agora'}</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 border border-[#e9e9e8] dark:border-[#333] hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-xs text-red-500 font-medium flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sair</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="pt-2 space-y-2">
              {isConfigured ? (
                <button
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-medium shadow-sm transition-all"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Entrar com Conta Google</span>
                </button>
              ) : (
                <p className="text-xs text-[#787774] dark:text-[#9b9a97]">
                  Configure as credenciais do seu projeto Firebase abaixo para ativar a sincronização na nuvem com o Cloud Firestore.
                </p>
              )}
            </div>
          )}
        </div>

        {/* Card: Automação de E-mail Diário (Vercel Cron) */}
        <div className="p-4 bg-[#fcfbf9] dark:bg-[#252525] rounded-xl border border-[#e9e9e8] dark:border-[#2f2f2f] space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#37352f] dark:text-[#f3f3f2]">
              <Mail className="w-4 h-4 text-blue-500" />
              <span>Resumo Diário por E-mail (Vercel Cron)</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 font-medium">
              Todo dia às 08h00
            </span>
          </div>

          <p className="text-[11px] text-[#787774] dark:text-[#9b9a97] leading-relaxed">
            Uma automação na Vercel verifica suas tarefas atrasadas, provas próximas e revisões do dia e envia um relatório consolidado para <b>nicolasplcoelho@gmail.com</b>.
          </p>

          <div className="space-y-1 pt-1">
            <label className="block text-[11px] font-medium text-[#787774] dark:text-[#9b9a97]">
              Chave API do Resend (opcional se configurada na Vercel):
            </label>
            <input
              type="password"
              placeholder="re_123456789..."
              value={resendApiKey}
              onChange={(e) => setResendApiKey(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-white dark:bg-[#1e1e1e] focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="pt-1 flex items-center justify-between gap-2">
            <span className="text-[10px] text-[#9b9a97]">Agendado: <code>0 11 * * *</code> (08h BRT)</span>
            <button
              onClick={handleTriggerDailyDigest}
              disabled={isSendingDigest}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-sm transition-all disabled:opacity-50"
            >
              <Send className={`w-3.5 h-3.5 ${isSendingDigest ? 'animate-pulse' : ''}`} />
              <span>{isSendingDigest ? 'Enviando...' : 'Testar Envio de E-mail'}</span>
            </button>
          </div>
        </div>

        {/* Toggle Credentials Form */}
        <div className="pt-1">
          <button
            onClick={() => setIsConfiguringKeys(!isConfiguringKeys)}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
          >
            <Key className="w-3.5 h-3.5" />
            <span>{isConfiguringKeys ? 'Ocultar chaves do Firebase' : 'Configurar Chaves do Projeto Firebase'}</span>
          </button>
        </div>

        {isConfiguringKeys && (
          <form onSubmit={handleSaveConfig} className="space-y-3 border-t border-[#e9e9e8] dark:border-[#2f2f2f] pt-4 text-xs">
            <div>
              <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">API Key *</label>
              <input
                type="text"
                required
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Project ID *</label>
                <input
                  type="text"
                  required
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="painel-estudante-123"
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Auth Domain</label>
                <input
                  type="text"
                  value={authDomain}
                  onChange={(e) => setAuthDomain(e.target.value)}
                  placeholder="projeto.firebaseapp.com"
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">App ID</label>
                <input
                  type="text"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                  placeholder="1:1234:web:..."
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Storage Bucket</label>
                <input
                  type="text"
                  value={storageBucket}
                  onChange={(e) => setStorageBucket(e.target.value)}
                  placeholder="app.appspot.com"
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Sender ID</label>
                <input
                  type="text"
                  value={messagingSenderId}
                  onChange={(e) => setMessagingSenderId(e.target.value)}
                  placeholder="123456789"
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] text-[#9b9a97]">Você encontra esses dados no Console do Firebase → Configurações do Projeto.</span>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-sm transition-all"
              >
                Salvar Chaves
              </button>
            </div>
          </form>
        )}

        <div className="pt-2 border-t border-[#e9e9e8] dark:border-[#2f2f2f] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-[#37352f] dark:text-white rounded-lg text-xs font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
