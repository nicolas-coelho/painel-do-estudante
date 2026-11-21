import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  AlertTriangle,
  Bell,
  BookOpen,
  Brain,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Wallet,
} from 'lucide-react';
import {
  AdviceCategory,
  AdviceUrgency,
  AiAdvisoryReport,
  Course,
  PersonalAppointment,
  PersonalBill,
  StudySession,
  StudyTopic,
  Task,
} from '../types';
import { useNotification } from '../context/NotificationContext';
import { formatDateBR } from '../dateUtils';

interface AiAdvisorCardProps {
  courses: Course[];
  tasks: Task[];
  topics: StudyTopic[];
  sessions: StudySession[];
  personalBills: PersonalBill[];
  personalAppointments: PersonalAppointment[];
  firebaseUser: User | null;
  onNavigateTab?: (tab: string) => void;
}

const getLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStorageKey = (uid?: string) => `study_${uid || 'guest'}_ai_advisor_report`;

const loadCachedReport = (uid?: string): AiAdvisoryReport | null => {
  try {
    const raw = localStorage.getItem(getStorageKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.headline === 'string' && Array.isArray(parsed.topPriorities)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
};

const getTimeframeBadge = (tf: 'hoje' | 'proximos_dias' | 'semana') => {
  switch (tf) {
    case 'hoje':
      return {
        label: 'Hoje',
        cls: 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-900/50',
      };
    case 'proximos_dias':
      return {
        label: 'Próx. dias',
        cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-900/50',
      };
    default:
      return {
        label: 'Semana',
        cls: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-900/50',
      };
  }
};

const getCategoryMeta = (cat: AdviceCategory) => {
  switch (cat) {
    case 'financeiro':
      return { label: 'Finanças', Icon: Wallet, tab: 'personal' };
    case 'compromisso':
      return { label: 'Compromisso', Icon: Calendar, tab: 'personal' };
    case 'revisao':
      return { label: 'Revisão', Icon: Brain, tab: 'active_recall' };
    case 'prova':
      return { label: 'Prova', Icon: BookOpen, tab: 'courses' };
    case 'atividade':
      return { label: 'Atividade', Icon: CheckCircle2, tab: 'tasks' };
    default:
      return { label: 'Rotina', Icon: Sparkles, tab: undefined };
  }
};

const getUrgencyDot = (urgency: AdviceUrgency) => {
  if (urgency === 'critical') return 'bg-red-500';
  if (urgency === 'high') return 'bg-amber-500';
  return 'bg-blue-500';
};

export const AiAdvisorCard: React.FC<AiAdvisorCardProps> = ({
  courses,
  tasks,
  topics,
  sessions,
  personalBills,
  personalAppointments,
  firebaseUser,
  onNavigateTab,
}) => {
  const { showToast } = useNotification();
  const todayStr = getLocalDateStr();
  const uid = firebaseUser?.uid;

  const [report, setReport] = useState<AiAdvisoryReport | null>(() => loadCachedReport(uid));
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [errorState, setErrorState] = useState<{ message: string; missingKey?: boolean } | null>(null);
  const autoAttemptedRef = React.useRef<string | null>(null);

  useEffect(() => {
    setReport(loadCachedReport(uid));
    setErrorState(null);
  }, [uid]);

  const pendingTasksCount = tasks.filter((t) => t.status !== 'done').length;
  const urgentTasksCount = tasks.filter(
    (t) => t.status !== 'done' && Boolean(t.dueDate) && t.dueDate <= todayStr
  ).length;
  const in7Days = getLocalDateStr(new Date(Date.now() + 7 * 86400000));
  const relevantBillsCount = personalBills.filter(
    (b) => b.status !== 'paid' && (!b.dueDate || b.dueDate <= in7Days)
  ).length;
  const dueReviewsCount = topics.filter(
    (t) => Boolean(t.nextReviewDate) && t.nextReviewDate <= todayStr
  ).length;

  const handleGenerate = async (silent = false) => {
    if (!firebaseUser) {
      setErrorState({
        message: 'Faça login na sua conta Google para gerar a consultoria com segurança.',
      });
      return;
    }

    setIsLoading(true);
    setErrorState(null);

    try {
      const idToken = await firebaseUser.getIdToken();
      const res = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          todayStr,
          courses,
          tasks,
          topics,
          sessions,
          personalBills,
          personalAppointments,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success || !data?.report) {
        const missingKey = data?.code === 'MISSING_API_KEY';
        const msg =
          data?.error || `Não foi possível gerar a consultoria (HTTP ${res.status}).`;
        setErrorState({ message: msg, missingKey });
        if (!silent) {
          showToast('error', 'Consultoria IA', msg);
        }
        return;
      }

      const nextReport: AiAdvisoryReport = data.report;
      setReport(nextReport);
      setIsExpanded(true);
      try {
        localStorage.setItem(getStorageKey(uid), JSON.stringify(nextReport));
      } catch {
        // ignora se localStorage estiver cheio
      }
      if (!silent) {
        showToast('success', 'Consultoria IA Atualizada', 'Prioridades e lembretes gerados com sucesso.');
      }
    } catch (err: any) {
      const msg = err?.message || 'Erro de conexão ao consultar a IA.';
      setErrorState({ message: msg });
      if (!silent) {
        showToast('error', 'Consultoria IA', msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!firebaseUser || !uid || isLoading) return;
    const hasAnyData =
      courses.length > 0 || tasks.length > 0 || personalBills.length > 0;
    if (!hasAnyData) return;

    const cachedForUser = loadCachedReport(uid);
    if (report?.referenceDate === todayStr || cachedForUser?.referenceDate === todayStr) {
      return;
    }

    const attemptKey = `${uid}:${todayStr}`;
    if (autoAttemptedRef.current === attemptKey) return;
    autoAttemptedRef.current = attemptKey;

    void handleGenerate(true);
  }, [firebaseUser, uid, todayStr, courses.length, tasks.length, personalBills.length, report?.referenceDate, isLoading]);

  const formatTimestampBadge = (rep: AiAdvisoryReport) => {
    if (rep.referenceDate === todayStr) {
      const d = new Date(rep.generatedAt);
      if (!isNaN(d.getTime())) {
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `Atualizado hoje às ${hh}:${mm}`;
      }
      return 'Atualizado hoje';
    }
    const br = formatDateBR(rep.referenceDate);
    return `Análise de ${br.slice(0, 5)}`;
  };

  return (
    <section className="rounded-2xl border border-indigo-200/80 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 dark:from-[#1f1e2e] dark:via-[#202020] dark:to-[#1d1c26] p-4 shadow-sm space-y-3">
      {/* Cabeçalho compacto */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm md:text-base font-bold text-[#37352f] dark:text-[#f3f3f2] tracking-tight">
                Consultor IA · Prioridades & Lembretes
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                Gemini
              </span>
              {report && (
                <span className="text-[11px] text-[#787774] dark:text-[#9b9a97]">
                  {formatTimestampBadge(report)}
                </span>
              )}
            </div>
            {!report && (
              <p className="text-xs text-[#787774] dark:text-[#9b9a97] mt-0.5">
                {pendingTasksCount} atividade(s) pendente(s)
                {urgentTasksCount > 0 ? ` (${urgentTasksCount} hoje/atrasadas)` : ''} •{' '}
                {relevantBillsCount} conta(s) próxima(s)/atrasada(s) • {dueReviewsCount} revisão(ões)
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => handleGenerate(false)}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-medium shadow-xs transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>
              {isLoading
                ? 'Analisando...'
                : report
                ? 'Atualizar'
                : 'Gerar Resumo IA'}
            </span>
          </button>

          {report && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="p-1.5 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-white/80 dark:bg-[#252525] text-[#787774] hover:text-[#37352f] dark:hover:text-white transition-colors"
              title={isExpanded ? 'Recolher consultoria' : 'Expandir consultoria'}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Estado de carregamento inicial */}
      {isLoading && !report && (
        <div className="p-3 rounded-xl bg-white/80 dark:bg-[#252525]/80 border border-indigo-100 dark:border-indigo-900/40 text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
          <span>Gerando resumo diário com Gemini...</span>
        </div>
      )}

      {/* Erro / Orientação sobre GEMINI_API_KEY */}
      {errorState && (
        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold">{errorState.message}</div>
            {errorState.missingKey && (
              <div className="text-[11px] text-amber-800 dark:text-amber-300">
                Adicione a variável <code className="font-mono font-bold">GEMINI_API_KEY</code> em{' '}
                <b>Vercel → Project Settings → Environment Variables</b> e faça um redeploy.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conteúdo do relatório compacto */}
      {report && isExpanded && (
        <div className="space-y-3 pt-1">
          <div className="p-3 rounded-xl bg-white/90 dark:bg-[#252525]/90 border border-[#e9e9e8] dark:border-[#2f2f2f]">
            <div className="text-sm font-bold text-[#37352f] dark:text-[#f3f3f2]">
              {report.headline}
            </div>
            <p className="text-xs text-[#5b5954] dark:text-[#b5b4b0] mt-1 leading-relaxed">
              {report.summary}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Coluna 1: O que priorizar */}
            <div className="p-3 rounded-xl bg-white/90 dark:bg-[#252525]/90 border border-[#e9e9e8] dark:border-[#2f2f2f] space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>O que Priorizar</span>
              </div>

              {report.topPriorities.length > 0 ? (
                <div className="space-y-2">
                  {report.topPriorities.map((item, idx) => {
                    const tf = getTimeframeBadge(item.timeframe);
                    const cat = getCategoryMeta(item.category);
                    const CatIcon = cat.Icon;
                    const canNavigate = Boolean(cat.tab && onNavigateTab);

                    return (
                      <div
                        key={`${item.title}-${idx}`}
                        onClick={() => {
                          if (cat.tab && onNavigateTab) onNavigateTab(cat.tab);
                        }}
                        className={`p-2.5 rounded-lg border border-[#f0f0ee] dark:border-[#303030] bg-[#fcfbf9] dark:bg-[#1e1e1e] flex items-start gap-2.5 ${
                          canNavigate
                            ? 'cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors'
                            : ''
                        }`}
                      >
                        <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-[#37352f] dark:text-[#f3f3f2] flex items-center gap-1.5">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${getUrgencyDot(
                                  item.urgency
                                )}`}
                              />
                              <span>{item.title}</span>
                            </span>
                            <div className="flex items-center gap-1">
                              <span
                                className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${tf.cls}`}
                              >
                                {tf.label}
                              </span>
                              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-[#787774] dark:text-[#9b9a97] inline-flex items-center gap-1">
                                <CatIcon className="w-2.5 h-2.5" />
                                {cat.label}
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] text-[#787774] dark:text-[#9b9a97] leading-snug">
                            {item.reason}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-[#787774] dark:text-[#9b9a97]">
                  Nenhuma prioridade imediata destacada.
                </p>
              )}
            </div>

            {/* Coluna 2: Lembretes & Insight */}
            <div className="flex flex-col justify-between gap-3">
              <div className="p-3 rounded-xl bg-white/90 dark:bg-[#252525]/90 border border-[#e9e9e8] dark:border-[#2f2f2f] space-y-2 flex-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5" />
                  <span>Lembretes-Chave</span>
                </div>

                {report.reminders.length > 0 ? (
                  <div className="space-y-1.5">
                    {report.reminders.map((rem, idx) => {
                      const cat = getCategoryMeta(rem.category);
                      const CatIcon = cat.Icon;
                      const canNavigate = Boolean(cat.tab && onNavigateTab);
                      return (
                        <div
                          key={`${rem.title}-${idx}`}
                          onClick={() => {
                            if (cat.tab && onNavigateTab) onNavigateTab(cat.tab);
                          }}
                          className={`p-2 rounded-lg border border-[#f0f0ee] dark:border-[#303030] bg-[#fcfbf9] dark:bg-[#1e1e1e] flex items-start justify-between gap-2 ${
                            canNavigate
                              ? 'cursor-pointer hover:border-amber-300 dark:hover:border-amber-700 transition-colors'
                              : ''
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-[#37352f] dark:text-[#f3f3f2] flex items-center gap-1.5">
                              <CatIcon className="w-3 h-3 text-[#787774] shrink-0" />
                              <span className="truncate">{rem.title}</span>
                            </div>
                            {rem.detail && (
                              <p className="text-[11px] text-[#787774] dark:text-[#9b9a97] mt-0.5">
                                {rem.detail}
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 shrink-0">
                            {rem.dueLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-[#787774] dark:text-[#9b9a97]">
                    Nenhum alerta adicional para os próximos dias.
                  </p>
                )}
              </div>

              {report.insight && (
                <div className="p-3 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-900/50 flex items-start gap-2">
                  <Lightbulb className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-indigo-950 dark:text-indigo-200 leading-relaxed">
                    <span className="font-semibold">Dica do dia: </span>
                    {report.insight}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
