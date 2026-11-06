import React, { useState } from 'react';
import {
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  resetPassword,
  logoutFirebase,
  getFriendlyAuthErrorMessage,
  isEmailAllowed,
} from '../firebase';
import { User } from 'firebase/auth';
import {
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  Sun,
  Moon,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  LogOut,
  Sparkles,
} from 'lucide-react';

interface LoginScreenProps {
  currentUser: User | null;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
}

type AuthMode = 'login' | 'register' | 'forgot';

export const LoginScreen: React.FC<LoginScreenProps> = ({
  currentUser,
  darkMode,
  setDarkMode,
}) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Se o usuário já está logado, mas NÃO está autorizado na whitelist
  const isUnauthorized = currentUser && !isEmailAllowed(currentUser.email);

  const handleGoogleLogin = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(getFriendlyAuthErrorMessage(err.code || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim()) {
      setErrorMsg('Por favor, informe seu endereço de e-mail.');
      return;
    }

    if (mode === 'forgot') {
      setIsLoading(true);
      try {
        await resetPassword(email);
        setSuccessMsg(
          'Enviamos um link de redefinição de senha para o seu e-mail. Verifique sua caixa de entrada e o spam.'
        );
      } catch (err: any) {
        setErrorMsg(getFriendlyAuthErrorMessage(err.code || err.message));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    if (!password) {
      setErrorMsg('Por favor, digite sua senha.');
      return;
    }

    if (mode === 'register') {
      if (password.length < 6) {
        setErrorMsg('A senha precisa ter pelo menos 6 caracteres.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('As senhas digitadas não coincidem.');
        return;
      }

      setIsLoading(true);
      try {
        await registerWithEmail(email, password, name);
      } catch (err: any) {
        setErrorMsg(getFriendlyAuthErrorMessage(err.code || err.message));
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Modo Login
    setIsLoading(true);
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      setErrorMsg(getFriendlyAuthErrorMessage(err.code || err.message));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logoutFirebase();
      setErrorMsg(null);
      setSuccessMsg(null);
    } finally {
      setIsLoading(false);
    }
  };

  // TELA DE ACESSO RESTRITO (quando logado com e-mail não autorizado)
  if (isUnauthorized) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[#fbfbfa] dark:bg-[#191919] text-[#37352f] dark:text-[#ececed] transition-colors">
        <div className="absolute top-4 right-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-lg border border-[#e9e9e8] dark:border-[#333333] bg-white dark:bg-[#202020] text-[#787774] hover:text-[#37352f] dark:hover:text-[#f3f3f2] shadow-sm transition-all"
            title={darkMode ? 'Modo Claro' : 'Modo Escuro'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>

        <div className="w-full max-w-md bg-white dark:bg-[#202020] border border-[#e9e9e8] dark:border-[#2e2e2e] rounded-2xl shadow-xl p-8 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-500">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-[#37352f] dark:text-[#f3f3f2]">
            Acesso Restrito
          </h2>
          <p className="text-sm text-[#787774] dark:text-[#9b9a97] mt-2 leading-relaxed">
            A conta autenticada não possui permissão para acessar este painel.
          </p>

          <div className="my-5 p-3 rounded-lg bg-[#f7f6f3] dark:bg-[#262626] border border-[#e9e9e8] dark:border-[#333333] text-xs font-mono break-all text-[#37352f] dark:text-[#d3d3d3]">
            {currentUser?.email || 'Usuário autenticado'}
          </div>

          <p className="text-xs text-[#787774] dark:text-[#9b9a97] mb-6">
            Este site é privado e restrito ao proprietário. Se você possui a conta autorizada, saia e entre com o e-mail correto.
          </p>

          <button
            onClick={handleLogout}
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            <span>Sair e Trocar de Conta</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[#fbfbfa] dark:bg-[#191919] text-[#37352f] dark:text-[#ececed] transition-colors relative overflow-hidden">
      {/* Background ambient pattern */}
      <div className="absolute inset-0 opacity-30 dark:opacity-15 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

      {/* Dark mode toggle */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2 rounded-lg border border-[#e9e9e8] dark:border-[#333333] bg-white dark:bg-[#202020] text-[#787774] hover:text-[#37352f] dark:hover:text-[#f3f3f2] shadow-sm transition-all cursor-pointer"
          title={darkMode ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
        >
          {darkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand Card Header */}
        <div className="text-center mb-6">
          <div className="inline-flex w-16 h-16 bg-white dark:bg-[#242424] border border-[#e9e9e8] dark:border-[#333333] rounded-2xl shadow-md items-center justify-center text-3xl select-none mb-3">
            📚
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#37352f] dark:text-[#f3f3f2]">
            Painel do Estudante
          </h1>
          <p className="text-xs md:text-sm text-[#787774] dark:text-[#9b9a97] mt-1">
            {mode === 'login' && 'Faça login para acessar seu painel de estudos'}
            {mode === 'register' && 'Crie sua conta para organizar seus estudos'}
            {mode === 'forgot' && 'Recupere o acesso à sua conta'}
          </p>
        </div>

        {/* Main Box */}
        <div className="bg-white dark:bg-[#202020] border border-[#e9e9e8] dark:border-[#2e2e2e] rounded-2xl shadow-xl p-6 sm:p-8 backdrop-blur-sm">
          {/* Messages */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-300 animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Google Button (quando login ou register) */}
          {mode !== 'forgot' && (
            <>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-white dark:bg-[#262626] hover:bg-[#f7f6f3] dark:hover:bg-[#2e2e2e] text-[#37352f] dark:text-[#ececed] border border-[#d3d2cf] dark:border-[#383838] font-medium rounded-lg text-sm shadow-sm transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Entrar com o Google</span>
              </button>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#e9e9e8] dark:border-[#2f2f2f]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white dark:bg-[#202020] text-[#9b9a97] uppercase tracking-wider font-medium">
                    ou continue com e-mail
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-[#787774] dark:text-[#9b9a97] mb-1.5">
                  Seu Nome
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#9b9a97] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Nicolas Coelho"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[#e9e9e8] dark:border-[#333333] bg-[#fbfbfa] dark:bg-[#191919] text-[#37352f] dark:text-[#ececed] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#787774] dark:text-[#9b9a97] mb-1.5">
                Endereço de E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#9b9a97] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[#e9e9e8] dark:border-[#333333] bg-[#fbfbfa] dark:bg-[#191919] text-[#37352f] dark:text-[#ececed] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#787774] dark:text-[#9b9a97]">
                    Senha
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setErrorMsg(null);
                        setSuccessMsg(null);
                      }}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#9b9a97] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 text-sm rounded-lg border border-[#e9e9e8] dark:border-[#333333] bg-[#fbfbfa] dark:bg-[#191919] text-[#37352f] dark:text-[#ececed] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9b9a97] hover:text-[#37352f] dark:hover:text-[#ececed] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === 'register' && (
              <div>
                <label className="block text-xs font-semibold text-[#787774] dark:text-[#9b9a97] mb-1.5">
                  Confirmar Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#9b9a97] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-[#e9e9e8] dark:border-[#333333] bg-[#fbfbfa] dark:bg-[#191919] text-[#37352f] dark:text-[#ececed] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === 'login' && 'Entrar no Painel'}
                    {mode === 'register' && 'Concluir Cadastro'}
                    {mode === 'forgot' && 'Enviar link de recuperação'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle modes footer */}
          <div className="mt-6 pt-4 border-t border-[#e9e9e8] dark:border-[#2e2e2e] text-center text-xs text-[#787774] dark:text-[#9b9a97]">
            {mode === 'login' && (
              <p>
                Não possui conta ainda?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Cadastre-se
                </button>
              </p>
            )}

            {mode === 'register' && (
              <p>
                Já tem uma conta cadastrada?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Fazer login
                </button>
              </p>
            )}

            {mode === 'forgot' && (
              <p>
                Lembrou sua senha?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Voltar ao login
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Security badge footer */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[#9b9a97]">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Acesso protegido por autenticação segura Google Firebase</span>
        </div>
      </div>
    </div>
  );
};
