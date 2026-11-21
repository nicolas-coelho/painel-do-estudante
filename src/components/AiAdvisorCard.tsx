import React, { useEffect, useRef, useState } from 'react';
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
  Clock,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Wallet,
} from 'lucide-react';
import {
  AdviceCategory,
  AdviceUrgency,
  AdvisoryPeriod,
  AiAdvisoryReport,
  Course,
  PersonalAppointment,
  PersonalBill,
  StudySession,
  StudyTopic,
  Task,
} from '../types';
import { formatDateBR } from '../dateUtils';

interface AiAdvisorCardProps {
  courses: Course[];
  tasks: Task[];
  topics: StudyTopic[];
  sessions: StudySession[];
  personalBills: PersonalBill[];
  personalAppointments: PersonalAppointment[];
  firebaseUser: User | null;
  isCloudHydrated?: boolean;
  onNavigateTab?: (tab: string) => void;
}

interface CachedAdvisorEntry {
  report: AiAdvisoryReport;
  slotKey?: string;
}

interface PeriodSlotInfo {
  todayStr: string;
  cycleDate: string;
  period: AdvisoryPeriod;
  label: string;
  nextLabel: string;
  slotKey: string;
}

const getLocalDateStr = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getCurrentPeriodSlot = (now = new Date()): PeriodSlotInfo => {
  const todayStr = getLocalDateStr(now);
  const hour = now.getHours();

  if (hour >= 5 && hour < 12) {
    return {
      todayStr,
      cycleDate: todayStr,
      period: 'morning',
      label: 'Manhã',
      nextLabel: 'Tarde (12h)',
      slotKey: `${todayStr}:morning`,
    };
  }

  if (hour >= 12 && hour < 18) {
    return {
      todayStr,
      cycleDate: todayStr,
      period: 'afternoon',
      label: 'Tarde',
      nextLabel: 'Noite (18h)',
      slotKey: `${todayStr}:afternoon`,
    };
  }

  const cycleDate =
    hour >= 18
      ? todayStr
      : getLocalDateStr(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));

  return {
    todayStr,
    cycleDate,
    period: 'night',
    label: 'Noite',
    nextLabel: 'Manhã (05h)',
    slotKey: `${cycleDate}:night`,
  };
};

const getLegacyStorageKey = (uid?: string) => `study_${uid || 'guest'}_ai_advisor_report`;
const getStorageKey = (uid?: string) => `study_${uid || 'guest'}_ai_advisor_report_v2`;

const loadCachedEntry = (uid?: string): CachedAdvisorEntry | null => {
  try {
    try {
      localStorage.removeItem(getLegacyStorageKey(uid));
    } catch {
      // ignora
    }

    const raw = localStorage.getItem(getStorageKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed?.report &&
      typeof parsed.report.headline === 'string' &&
      Array.isArray(parsed.report.topPriorities)
    ) {
      return {
        report: parsed.report,
        slotKey:
          typeof parsed.slotKey === 'string'
            ? parsed.slotKey
            : typeof parsed.report.slotKey === 'string'
            ? parsed.report.slotKey
            : undefined,
      };
    }
    if (parsed && typeof parsed.headline === 'string' && Array.isArray(parsed.topPriorities)) {
      return {
        report: parsed,
        slotKey: typeof parsed.slotKey === 'string' ? parsed.slotKey : undefined,
      };
    }
    return null;
  } catch {
    return null;
  }
};

const getPeriodDisplayLabel = (period?: AdvisoryPeriod, slotKey?: string): string => {
  const resolved =
    period ||
    (slotKey?.endsWith(':morning')
      ? 'morning'
      : slotKey?.endsWith(':afternoon')
      ? 'afternoon'
      : slotKey?.endsWith(':night')
      ? 'night'
      : undefined);

  if (resolved === 'morning') return 'Manhã';
  if (resolved === 'afternoon') return 'Tarde';
  if (resolved === 'night') return 'Noite';
  return '';
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
  isCloudHydrated = false,
  onNavigateTab,
}) => {
  const uid = firebaseUser?.uid;
  const [currentSlot, setCurrentSlot] = useState<PeriodSlotInfo>(() => getCurrentPeriodSlot());
  const [report, setReport] = useState<AiAdvisoryReport | null>(
    () => loadCachedEntry(uid)?.report || null
  );
  const [cachedSlotKey, setCachedSlotKey] = useState<string | null>(
    () => loadCachedEntry(uid)?.slotKey || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [errorState, setErrorState] = useState<{ message: string; missingKey?: boolean } | null>(
    null
  );
  const autoAttemptedRef = useRef<string | null>(null);

  // Atualiza o período ativo automaticamente ao virar de turno (05h, 12h, 18h)
  useEffect(() => {
    const timer = window.setInterval(() => {
      const next = getCurrentPeriodSlot();
      setCurrentSlot((prev) => (prev.slotKey === next.slotKey ? prev : next));
    }, 60000);
    return () => window.clearInterval(timer);
  }, []);

  // Recarrega o cache do usuário quando troca de conta
  useEffect(() => {
    const cached = loadCachedEntry(uid);
    setReport(cached?.report || null);
    setCachedSlotKey(cached?.slotKey || null);
    setErrorState(null);
  }, [uid]);

  const pendingTasksCount = tasks.filter((t) => t.status !== 'done').length;
  const urgentTasksCount = tasks.filter(
    (t) => t.status !== 'done' && Boolean(t.dueDate) && t.dueDate <= currentSlot.todayStr
  ).length;
  const in7Days = getLocalDateStr(new Date(Date.now() + 7 * 86400000));
  const relevantBillsCount = personalBills.filter(
    (b) => b.status !== 'paid' && (!b.dueDate || b.dueDate <= in7Days)
  ).length;
  const dueReviewsCount = topics.filter(
    (t) => Boolean(t.nextReviewDate) && t.nextReviewDate <= currentSlot.todayStr
  ).length;

  useEffect(() => {
    if (!isCloudHydrated || !firebaseUser || !uid || isLoading) return;
    const hasAnyData =
      courses.length > 0 || tasks.length > 0 || personalBills.length > 0;
    if (!hasAnyData) return;

    const activeSlotKey = currentSlot.slotKey;
    const cachedForUser = loadCachedEntry(uid);
    if (
      (report && (cachedSlotKey === activeSlotKey || report.slotKey === activeSlotKey)) ||
      cachedForUser?.slotKey === activeSlotKey ||
      cachedForUser?.report.slotKey === activeSlotKey
    ) {
      return;
    }

    const attemptKey = `${uid}:${activeSlotKey}`;
    if (autoAttemptedRef.current === attemptKey) return;
    autoAttemptedRef.current = attemptKey;

    let cancelled = false;

    const fetchPeriodAdvisory = async () => {
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
            todayStr: currentSlot.todayStr,
            courses,
            tasks,
            topics,
            sessions,
            personalBills,
            personalAppointments,
          }),
        });

        const data = await res.json().catch(() => null);
        if (cancelled) return;

        if (!res.ok || !data?.success || !data?.report) {
          const missingKey = data?.code === 'MISSING_API_KEY';
          const msg =
            data?.error || `Não foi possível gerar a consultoria (HTTP ${res.status}).`;
          setErrorState({ message: msg, missingKey });
          return;
        }

        const nextReport: AiAdvisoryReport = data.report;
        const resolvedSlotKey = nextReport.slotKey || activeSlotKey;
        setReport(nextReport);
        setCachedSlotKey(resolvedSlotKey);
        setIsExpanded(true);
        try {
          const entry: CachedAdvisorEntry = {
            report: nextReport,
            slotKey: resolvedSlotKey,
          };
          localStorage.setItem(getStorageKey(uid), JSON.stringify(entry));
        } catch {
          // ignora se localStorage estiver cheio
        }
      } catch (err: any) {
        if (!cancelled) {
          setErrorState({ message: err?.message || 'Erro de conexão ao consultar a IA.' });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void fetchPeriodAdvisory();

    return () => {
      cancelled = true;
    };
  }, [
    isCloudHydrated,
    firebaseUser,
    uid,
    currentSlot.slotKey,
    currentSlot.todayStr,
    courses,
    tasks,
    topics,
    sessions,
    personalBills,
    personalAppointments,
    report,
    cachedSlotKey,
    isLoading,
  ]);

  const formatTimestampBadge = (rep: AiAdvisoryReport) => {
    const periodLabel = getPeriodDisplayLabel(rep.period, rep.slotKey || cachedSlotKey || undefined);
    const prefix = periodLabel ? `${periodLabel} · ` : '';

    const d = new Date(rep.generatedAt);
    const timeStr = !isNaN(d.getTime())
      ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      : '';

    if (rep.referenceDate === currentSlot.todayStr) {
      return timeStr ? `${prefix}hoje às ${timeStr}` : `${prefix}hoje`;
    }
    if ((rep.slotKey || cachedSlotKey) === currentSlot.slotKey && timeStr) {
      return `${prefix}${timeStr}`;
    }
    const br = formatDateBR(rep.referenceDate);
    return `${prefix}${br.slice(0, 5)}`;
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
                {!isCloudHydrated
                  ? 'Sincronizando seus dados da nuvem...'
                  : `${pendingTasksCount} atividade(s) pendente(s)${
                      urgentTasksCount > 0 ? ` (${urgentTasksCount} hoje/atrasadas)` : ''
                    } • ${relevantBillsCount} conta(s) próxima(s)/atrasada(s) • ${dueReviewsCount} revisão(ões)`}
              </p>
            )}
          </div>
        </div>

        {/* Indicador automático de turno (sem botão manual) + botão recolher/expandir */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span
            title="Atualização automática 3x ao dia: Manhã (05h), Tarde (12h) e Noite (18h)"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-white/80 dark:bg-[#252525] text-[11px] font-medium text-[#787774] dark:text-[#9b9a97] select-none"
          >
            {!isCloudHydrated ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" />
                <span>Sincronizando...</span>
              </>
            ) : isLoading ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" />
                <span>Atualizando ({currentSlot.label})...</span>
              </>
            ) : (
              <>
                <Clock className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                <span>Próxima: {currentSlot.nextLabel}</span>
              </>
            )}
          </span>

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
          <span>Gerando resumo da {currentSlot.label.toLowerCase()} com Gemini...</span>
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
