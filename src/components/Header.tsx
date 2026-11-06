import React from 'react';
import { Sun, Moon, Download, Upload, BookOpen, Clock, CheckCircle2, Cloud, LogOut, User as UserIcon } from 'lucide-react';
import { User } from 'firebase/auth';

interface HeaderProps {
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  stats: {
    activeCourses: number;
    pendingTasks: number;
    dueReviews: number;
    studiedMinutesToday: number;
  };
  onExportData: () => void;
  onImportData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onOpenFirebaseModal: () => void;
  firebaseUser: User | null;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  darkMode,
  setDarkMode,
  stats,
  onExportData,
  onImportData,
  onOpenFirebaseModal,
  firebaseUser,
  onLogout,
}) => {
  return (
    <header className="relative w-full border-b border-[#e9e9e8] dark:border-[#2f2f2f] bg-white dark:bg-[#1f1f1f]">
      {/* Notion Cover Banner */}
      <div className="h-44 md:h-52 w-full bg-gradient-to-r from-slate-800 via-indigo-950 to-stone-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
        <div className="absolute right-4 top-4 flex items-center gap-2 flex-wrap justify-end">
          {firebaseUser && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-black/50 text-white text-xs font-medium rounded-md backdrop-blur border border-white/10">
              {firebaseUser.photoURL ? (
                <img
                  src={firebaseUser.photoURL}
                  alt={firebaseUser.displayName || 'Avatar'}
                  className="w-4 h-4 rounded-full object-cover"
                />
              ) : (
                <UserIcon className="w-3.5 h-3.5 text-indigo-300" />
              )}
              <span className="max-w-[120px] md:max-w-[160px] truncate">
                {firebaseUser.displayName || firebaseUser.email?.split('@')[0]}
              </span>
            </div>
          )}

          <button
            onClick={onOpenFirebaseModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md backdrop-blur transition-all border bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border-emerald-500/40"
            title="Sincronização com Google Firebase em Tempo Real"
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Nuvem Ativa</span>
          </button>

          <label className="cursor-pointer flex items-center gap-1.5 px-3 py-1.5 bg-black/40 hover:bg-black/60 text-white text-xs font-medium rounded-md backdrop-blur transition-all border border-white/10">
            <Upload className="w-3.5 h-3.5" />
            <span>Restaurar Backup</span>
            <input type="file" accept=".json" onChange={onImportData} className="hidden" />
          </label>
          <button
            onClick={onExportData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-black/40 hover:bg-black/60 text-white text-xs font-medium rounded-md backdrop-blur transition-all border border-white/10"
            title="Exportar dados locais em JSON"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Backup</span>
          </button>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-1.5 bg-black/40 hover:bg-black/60 text-white rounded-md backdrop-blur transition-all border border-white/10"
            title={darkMode ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-200" />}
          </button>

          {onLogout && firebaseUser && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-medium rounded-md backdrop-blur transition-all border border-rose-500/30 cursor-pointer"
              title="Sair da Conta"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          )}
        </div>
      </div>

      {/* Page Title & Notion Icon */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 pb-6">
        <div className="relative -mt-10 mb-4 flex items-end justify-between">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-white dark:bg-[#202020] border-2 border-white dark:border-[#2f2f2f] rounded-2xl shadow-lg flex items-center justify-center text-3xl md:text-4xl select-none">
              📚
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#37352f] dark:text-[#f3f3f2]">
                Painel do Estudante
              </h1>
              <p className="text-xs md:text-sm text-[#787774] dark:text-[#9b9a97] mt-0.5">
                Organização semestral, controle de disciplinas, tarefas e repetição espaçada
              </p>
            </div>
          </div>
        </div>

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          <div className="p-3 bg-[#f7f6f3] dark:bg-[#262626] rounded-lg border border-[#e9e9e8] dark:border-[#333333] flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-md">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-[#787774] dark:text-[#9b9a97]">Disciplinas Ativas</div>
              <div className="text-base font-semibold">{stats.activeCourses}</div>
            </div>
          </div>

          <div className="p-3 bg-[#f7f6f3] dark:bg-[#262626] rounded-lg border border-[#e9e9e8] dark:border-[#333333] flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-md">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-[#787774] dark:text-[#9b9a97]">Tarefas Pendentes</div>
              <div className="text-base font-semibold">{stats.pendingTasks}</div>
            </div>
          </div>

          <div className="p-3 bg-[#f7f6f3] dark:bg-[#262626] rounded-lg border border-[#e9e9e8] dark:border-[#333333] flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-md">
              <span className="font-bold text-xs">🧠</span>
            </div>
            <div>
              <div className="text-xs text-[#787774] dark:text-[#9b9a97]">Revisões p/ Hoje</div>
              <div className={`text-base font-semibold ${stats.dueReviews > 0 ? 'text-purple-600 dark:text-purple-400' : ''}`}>
                {stats.dueReviews}
              </div>
            </div>
          </div>

          <div className="p-3 bg-[#f7f6f3] dark:bg-[#262626] rounded-lg border border-[#e9e9e8] dark:border-[#333333] flex items-center gap-3">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-md">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-[#787774] dark:text-[#9b9a97]">Estudo Hoje</div>
              <div className="text-base font-semibold">{stats.studiedMinutesToday} min</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
