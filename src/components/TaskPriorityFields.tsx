import React from 'react';
import { LayoutGrid, X } from 'lucide-react';
import { PriorityLevel } from '../types';
import { getQuadrantConfig, getTaskQuadrant } from '../priorityUtils';

interface TaskPriorityFieldsProps {
  urgency: PriorityLevel | '';
  importance: PriorityLevel | '';
  onChangeUrgency: (val: PriorityLevel | '') => void;
  onChangeImportance: (val: PriorityLevel | '') => void;
}

export const TaskPriorityFields: React.FC<TaskPriorityFieldsProps> = ({
  urgency,
  importance,
  onChangeUrgency,
  onChangeImportance,
}) => {
  const quadrant = getTaskQuadrant({
    urgency: urgency || undefined,
    importance: importance || undefined,
  });
  const quadrantCfg = quadrant ? getQuadrantConfig(quadrant) : null;

  const toggleUrgency = (val: PriorityLevel) => {
    onChangeUrgency(urgency === val ? '' : val);
  };

  const toggleImportance = (val: PriorityLevel) => {
    onChangeImportance(importance === val ? '' : val);
  };

  return (
    <div className="rounded-xl border border-[#e9e9e8] dark:border-[#333] bg-[#faf9f6] dark:bg-[#1a1a1a] p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[#37352f] dark:text-[#f3f3f2] flex items-center gap-1.5">
          <LayoutGrid className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Priorização (Matriz de Eisenhower)</span>
        </span>
        {(urgency !== '' || importance !== '') && (
          <button
            type="button"
            onClick={() => {
              onChangeUrgency('');
              onChangeImportance('');
            }}
            className="text-[11px] text-[#787774] hover:text-[#37352f] dark:text-[#9b9a97] dark:hover:text-white inline-flex items-center gap-0.5 transition-colors"
          >
            <X className="w-3 h-3" />
            <span>Limpar</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Urgência */}
        <div className="space-y-1">
          <span className="block text-[11px] font-medium text-[#787774] dark:text-[#9b9a97]">
            Urgência
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => toggleUrgency('high')}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                urgency === 'high'
                  ? 'bg-red-600 text-white border-red-600 shadow-xs'
                  : 'bg-white dark:bg-[#242424] text-[#37352f] dark:text-[#d4d4d4] border-[#e9e9e8] dark:border-[#333] hover:border-red-300 dark:hover:border-red-800'
              }`}
            >
              Urgente
            </button>
            <button
              type="button"
              onClick={() => toggleUrgency('low')}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                urgency === 'low'
                  ? 'bg-stone-700 dark:bg-stone-600 text-white border-stone-700 dark:border-stone-600 shadow-xs'
                  : 'bg-white dark:bg-[#242424] text-[#37352f] dark:text-[#d4d4d4] border-[#e9e9e8] dark:border-[#333] hover:border-stone-400 dark:hover:border-stone-600'
              }`}
            >
              Não Urgente
            </button>
          </div>
        </div>

        {/* Importância */}
        <div className="space-y-1">
          <span className="block text-[11px] font-medium text-[#787774] dark:text-[#9b9a97]">
            Importância
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => toggleImportance('high')}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                importance === 'high'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white dark:bg-[#242424] text-[#37352f] dark:text-[#d4d4d4] border-[#e9e9e8] dark:border-[#333] hover:border-blue-300 dark:hover:border-blue-800'
              }`}
            >
              Importante
            </button>
            <button
              type="button"
              onClick={() => toggleImportance('low')}
              className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border transition-all ${
                importance === 'low'
                  ? 'bg-stone-700 dark:bg-stone-600 text-white border-stone-700 dark:border-stone-600 shadow-xs'
                  : 'bg-white dark:bg-[#242424] text-[#37352f] dark:text-[#d4d4d4] border-[#e9e9e8] dark:border-[#333] hover:border-stone-400 dark:hover:border-stone-600'
              }`}
            >
              Não Importante
            </button>
          </div>
        </div>
      </div>

      {/* Indicador do quadrante resultante */}
      <div className="pt-0.5 text-[11px]">
        {quadrantCfg ? (
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold ${quadrantCfg.badgeClass}`}>
              Quadrante: {quadrantCfg.shortLabel} — {quadrantCfg.subtitle}
            </span>
          </div>
        ) : urgency !== '' || importance !== '' ? (
          <span className="text-amber-700 dark:text-amber-400 font-medium">
            {urgency === ''
              ? 'Preencha também Urgência para posicionar na matriz.'
              : 'Preencha também Importância para posicionar na matriz.'}
          </span>
        ) : (
          <span className="text-[#787774] dark:text-[#9b9a97]">
            Opcional — sem classificação até preencher ambos os campos.
          </span>
        )}
      </div>
    </div>
  );
};
