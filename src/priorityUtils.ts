import { EisenhowerQuadrant, PriorityLevel, Task } from './types';

export interface QuadrantConfig {
  id: EisenhowerQuadrant;
  urgency: PriorityLevel;
  importance: PriorityLevel;
  code: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  title: string;
  shortLabel: string;
  quickActionLabel: string;
  subtitle: string;
  description: string;
  containerClass: string;
  dragOverClass: string;
  badgeClass: string;
  accentClass: string;
  quickButtonClass: string;
}

export const QUADRANT_LIST: QuadrantConfig[] = [
  {
    id: 'do_now',
    urgency: 'high',
    importance: 'high',
    code: 'Q1',
    title: 'Fazer Agora',
    shortLabel: 'Q1 · Fazer Agora',
    quickActionLabel: 'Q1 Fazer',
    subtitle: 'Urgente e Importante',
    description: 'Prioridade máxima — execute imediatamente.',
    containerClass:
      'bg-red-50/70 dark:bg-red-950/20 border-red-200 dark:border-red-900/50',
    dragOverClass:
      'ring-2 ring-red-400/50 border-red-400 dark:border-red-500 bg-red-100/60 dark:bg-red-950/40',
    badgeClass:
      'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-900/60',
    accentClass: 'text-red-700 dark:text-red-300',
    quickButtonClass:
      'bg-red-50 hover:bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:hover:bg-red-950/70 dark:text-red-300 dark:border-red-900/60',
  },
  {
    id: 'schedule',
    urgency: 'low',
    importance: 'high',
    code: 'Q2',
    title: 'Agendar / Planejar',
    shortLabel: 'Q2 · Agendar',
    quickActionLabel: 'Q2 Agendar',
    subtitle: 'Importante, Não Urgente',
    description: 'Alto impacto — planeje e reserve tempo.',
    containerClass:
      'bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50',
    dragOverClass:
      'ring-2 ring-blue-400/50 border-blue-400 dark:border-blue-500 bg-blue-100/60 dark:bg-blue-950/40',
    badgeClass:
      'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60',
    accentClass: 'text-blue-700 dark:text-blue-300',
    quickButtonClass:
      'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:hover:bg-blue-950/70 dark:text-blue-300 dark:border-blue-900/60',
  },
  {
    id: 'delegate',
    urgency: 'high',
    importance: 'low',
    code: 'Q3',
    title: 'Delegar / Fazer Rápido',
    shortLabel: 'Q3 · Rápido',
    quickActionLabel: 'Q3 Rápido',
    subtitle: 'Urgente, Não Importante',
    description: 'Resolva rápido ou simplifique sem perder foco.',
    containerClass:
      'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50',
    dragOverClass:
      'ring-2 ring-amber-400/50 border-amber-400 dark:border-amber-500 bg-amber-100/60 dark:bg-amber-950/40',
    badgeClass:
      'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/60',
    accentClass: 'text-amber-700 dark:text-amber-300',
    quickButtonClass:
      'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:hover:bg-amber-950/70 dark:text-amber-300 dark:border-amber-900/60',
  },
  {
    id: 'eliminate',
    urgency: 'low',
    importance: 'low',
    code: 'Q4',
    title: 'Eliminar / Depois',
    shortLabel: 'Q4 · Depois',
    quickActionLabel: 'Q4 Depois',
    subtitle: 'Nem Urgente, Nem Importante',
    description: 'Baixa prioridade — deixe por último ou descarte.',
    containerClass:
      'bg-stone-50/90 dark:bg-[#1d1d1d] border-[#e9e9e8] dark:border-[#2f2f2f]',
    dragOverClass:
      'ring-2 ring-stone-400/50 border-stone-400 dark:border-stone-500 bg-stone-100/80 dark:bg-stone-800/50',
    badgeClass:
      'bg-stone-200/80 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border border-stone-300 dark:border-stone-700',
    accentClass: 'text-stone-700 dark:text-stone-300',
    quickButtonClass:
      'bg-stone-100 hover:bg-stone-200 text-stone-700 border-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 dark:text-stone-300 dark:border-stone-700',
  },
];

export function isValidPriorityLevel(val: unknown): val is PriorityLevel {
  return val === 'high' || val === 'low';
}

export function getTaskQuadrant(
  task: Pick<Task, 'urgency' | 'importance'>
): EisenhowerQuadrant | null {
  const { urgency, importance } = task;
  if (!isValidPriorityLevel(urgency) || !isValidPriorityLevel(importance)) {
    return null;
  }
  if (urgency === 'high' && importance === 'high') return 'do_now';
  if (urgency === 'low' && importance === 'high') return 'schedule';
  if (urgency === 'high' && importance === 'low') return 'delegate';
  return 'eliminate';
}

export function getQuadrantConfig(quadrant: EisenhowerQuadrant): QuadrantConfig {
  return QUADRANT_LIST.find((q) => q.id === quadrant) || QUADRANT_LIST[0];
}

export function getQuadrantAxes(quadrant: EisenhowerQuadrant): {
  urgency: PriorityLevel;
  importance: PriorityLevel;
} {
  const cfg = getQuadrantConfig(quadrant);
  return { urgency: cfg.urgency, importance: cfg.importance };
}

/**
 * Aplica urgência e importância a uma Task omitindo chaves vazias para evitar
 * valores `undefined` que o Firestore rejeita ao persistir documentos.
 */
export function applyTaskPriority(
  task: Task,
  urgency?: PriorityLevel | '' | null,
  importance?: PriorityLevel | '' | null
): Task {
  const { urgency: _u, importance: _i, ...base } = task;
  const result: Task = { ...base };

  if (isValidPriorityLevel(urgency)) {
    result.urgency = urgency;
  }
  if (isValidPriorityLevel(importance)) {
    result.importance = importance;
  }

  return result;
}
