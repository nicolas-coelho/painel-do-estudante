import React, { useState } from 'react';
import { StudyTopic, Course, ExerciseAttempt } from '../types';
import {
  Brain,
  Target,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Calendar,
  Award,
  Sparkles,
  Plus,
  Trash2,
  History,
  TrendingUp,
  BookOpen,
  SlidersHorizontal,
  Layers,
  Search,
  FileText,
  X,
  ChevronRight,
  Eye,
  Check,
  Percent,
} from 'lucide-react';

interface ActiveRecallTabProps {
  topics: StudyTopic[];
  courses: Course[];
  onAddTopic: (t: StudyTopic) => void;
  onUpdateTopic: (t: StudyTopic) => void;
  onDeleteTopic: (id: string) => void;
}

// Fases de Repetição Espaçada Semanal
const PHASES = [
  { stage: 0, label: 'Fase 1 (1 semana)', days: 7, desc: 'Revisão inicial após a aula' },
  { stage: 1, label: 'Fase 2 (2 semanas)', days: 14, desc: 'Fixação intermediária' },
  { stage: 2, label: 'Fase 3 (4 semanas)', days: 28, desc: 'Consolidação de longo prazo' },
  { stage: 3, label: 'Fase 4 (Dominado)', days: 60, desc: 'Conteúdo dominado' },
];

const LOCAL_STORAGE_EXCELLENCE_TARGET = 'study_excellence_target';

export const ActiveRecallTab: React.FC<ActiveRecallTabProps> = ({
  topics,
  courses,
  onAddTopic,
  onUpdateTopic,
  onDeleteTopic,
}) => {
  // Meta Global de Excelência (padrão 80%)
  const [excellenceTarget, setExcellenceTarget] = useState<number>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_EXCELLENCE_TARGET);
    return saved ? Number(saved) : 80;
  });

  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState(excellenceTarget);

  // Filtros
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'due' | 'needs_reinforcement' | 'mastered'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modais
  const [isAddTopicModalOpen, setIsAddTopicModalOpen] = useState(false);
  const [isImportSyllabusOpen, setIsImportSyllabusOpen] = useState(false);
  const [topicToRegisterList, setTopicToRegisterList] = useState<StudyTopic | null>(null);
  const [topicForHistory, setTopicForHistory] = useState<StudyTopic | null>(null);
  const [topicForFlashcard, setTopicForFlashcard] = useState<StudyTopic | null>(null);
  const [showFlashcardAnswer, setShowFlashcardAnswer] = useState(false);

  // Form: Novo Assunto
  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicCourseId, setNewTopicCourseId] = useState(courses[0]?.id || '');
  const [newTopicQuestion, setNewTopicQuestion] = useState('');
  const [newTopicAnswer, setNewTopicAnswer] = useState('');

  // Form: Registro de Lista de Exercícios
  const [listTitle, setListTitle] = useState('');
  const [listDate, setListDate] = useState(new Date().toISOString().split('T')[0]);
  const [totalExercises, setTotalExercises] = useState<number | ''>(10);
  const [correctExercises, setCorrectExercises] = useState<number | ''>(8);
  const [listNotes, setListNotes] = useState('');

  const todayStr = new Date().toISOString().split('T')[0];

  const handleSaveTarget = () => {
    const val = Math.max(50, Math.min(100, Number(tempTarget) || 80));
    setExcellenceTarget(val);
    localStorage.setItem(LOCAL_STORAGE_EXCELLENCE_TARGET, String(val));
    setIsEditingTarget(false);
  };

  // Cálculos de Desempenho Global (Analytics)
  const allAttempts = topics.flatMap((t) => t.attempts || []);
  const totalExercisesDone = allAttempts.reduce((acc, curr) => acc + curr.totalExercises, 0);
  const totalExercisesCorrect = allAttempts.reduce((acc, curr) => acc + curr.correctExercises, 0);
  const globalScore =
    totalExercisesDone > 0 ? (totalExercisesCorrect / totalExercisesDone) * 100 : 0;

  const dueTopicsCount = topics.filter((t) => t.nextReviewDate <= todayStr).length;
  const masteredTopicsCount = topics.filter(
    (t) => t.stage >= 3 || ((t.attempts?.slice(-1)[0]?.scorePercentage || 0) >= excellenceTarget && t.stage >= 2)
  ).length;

  // Filtragem dos tópicos
  const filteredTopics = topics.filter((topic) => {
    // Filtro por Disciplina
    if (selectedCourseId !== 'all' && topic.courseId !== selectedCourseId) return false;

    // Filtro por Texto
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = topic.name.toLowerCase().includes(q);
      const course = courses.find((c) => c.id === topic.courseId);
      const matchCourse = course?.name.toLowerCase().includes(q) || course?.code.toLowerCase().includes(q);
      if (!matchName && !matchCourse) return false;
    }

    const lastAttempt = topic.attempts?.slice(-1)[0];
    const isDue = topic.nextReviewDate <= todayStr;
    const isMastered = topic.stage >= 3;
    const needsReinforcement = lastAttempt && !lastAttempt.passed;

    if (statusFilter === 'due') return isDue;
    if (statusFilter === 'needs_reinforcement') return needsReinforcement;
    if (statusFilter === 'mastered') return isMastered;

    return true;
  });

  // Criar Novo Assunto
  const handleCreateTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim()) return;

    const newTopic: StudyTopic = {
      id: `topic-${Date.now()}`,
      name: newTopicName.trim(),
      courseId: newTopicCourseId || courses[0]?.id || '',
      question: newTopicQuestion.trim() || undefined,
      answer: newTopicAnswer.trim() || undefined,
      stage: 0,
      adaptive: true,
      nextReviewDate: todayStr,
      attempts: [],
    };

    onAddTopic(newTopic);
    setIsAddTopicModalOpen(false);
    setNewTopicName('');
    setNewTopicQuestion('');
    setNewTopicAnswer('');
  };

  // Importar Assuntos da Ementa (Syllabus) das Disciplinas
  const handleImportFromSyllabus = (courseId: string, title: string) => {
    const alreadyExists = topics.some(
      (t) => t.courseId === courseId && t.name.toLowerCase() === title.toLowerCase()
    );
    if (alreadyExists) return;

    const newTopic: StudyTopic = {
      id: `topic-syl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: title,
      courseId,
      stage: 0,
      adaptive: true,
      nextReviewDate: todayStr,
      attempts: [],
    };

    onAddTopic(newTopic);
  };

  // Abrir Modal de Registro de Lista para um tópico específico
  const openRegisterModal = (topic: StudyTopic) => {
    setTopicToRegisterList(topic);
    const attemptCount = (topic.attempts?.length || 0) + 1;
    setListTitle(`Lista ${attemptCount} - ${topic.name.split(':')[0] || 'Fixação'}`);
    setListDate(todayStr);
    setTotalExercises(10);
    setCorrectExercises(8);
    setListNotes('');
  };

  // Submeter Registro de Lista de Exercícios
  const handleSubmitExerciseList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicToRegisterList) return;

    const total = Math.max(1, Number(totalExercises) || 1);
    const correct = Math.max(0, Math.min(total, Number(correctExercises) || 0));
    const scorePct = Number(((correct / total) * 100).toFixed(1));
    const target = topicToRegisterList.targetScore || excellenceTarget;
    const passed = scorePct >= target;

    const newAttempt: ExerciseAttempt = {
      id: `attempt-${Date.now()}`,
      date: listDate,
      listTitle: listTitle.trim() || `Lista de Exercícios`,
      totalExercises: total,
      correctExercises: correct,
      scorePercentage: scorePct,
      passed,
      notes: listNotes.trim() || undefined,
    };

    // Regra de Avanço de Fase (Semanal):
    let nextStage = topicToRegisterList.stage;
    let daysToAdd = 7;

    if (passed) {
      // Avança etapa no ciclo espaçado
      nextStage = Math.min(topicToRegisterList.stage + 1, PHASES.length - 1);
      daysToAdd = PHASES[nextStage].days;
    } else {
      // Reprovou na meta: necessita reforço em 3 dias para tentar nova lista
      daysToAdd = 3;
    }

    const nextDate = new Date(new Date(listDate).getTime() + daysToAdd * 86400000);
    const nextDateStr = nextDate.toISOString().split('T')[0];

    const updatedTopic: StudyTopic = {
      ...topicToRegisterList,
      stage: nextStage,
      lastReviewDate: listDate,
      nextReviewDate: nextDateStr,
      attempts: [...(topicToRegisterList.attempts || []), newAttempt],
    };

    onUpdateTopic(updatedTopic);
    setTopicToRegisterList(null);
  };

  return (
    <div className="space-y-6">
      {/* Notion Cover Header */}
      <div className="bg-white dark:bg-[#202020] rounded-2xl border border-[#e9e9e8] dark:border-[#2f2f2f] p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center text-2xl shadow-xs">
              🧠
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-lg md:text-xl text-[#37352f] dark:text-[#f3f3f2]">
                  Recuperação Ativa & Maestria por Exercícios
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold font-mono">
                  Ciclo Semanal Espaçado
                </span>
              </div>
              <p className="text-xs text-[#787774] dark:text-[#9b9a97] mt-0.5">
                Resolva listas de exercícios por assunto. Atingir a meta de excelência avança a fase de retenção no semestre.
              </p>
            </div>
          </div>

          {/* Meta Global de Excelência Chip */}
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#f7f6f3] dark:bg-[#262626] border border-[#e9e9e8] dark:border-[#333] flex items-center gap-2.5">
              <div className="p-1.5 bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 rounded-lg">
                <Target className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#787774] dark:text-[#9b9a97]">
                  Meta de Excelência
                </div>
                {isEditingTarget ? (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <input
                      type="number"
                      min={50}
                      max={100}
                      value={tempTarget}
                      onChange={(e) => setTempTarget(Number(e.target.value))}
                      className="w-14 px-1.5 py-0.5 text-xs font-bold font-mono rounded border border-purple-500 bg-white dark:bg-[#1a1a1a] text-[#37352f] dark:text-white"
                    />
                    <span className="text-xs font-bold">%</span>
                    <button
                      onClick={handleSaveTarget}
                      className="p-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs cursor-pointer"
                      title="Salvar meta"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setIsEditingTarget(false)}
                      className="p-1 hover:bg-stone-200 dark:hover:bg-stone-700 rounded text-xs cursor-pointer text-[#787774]"
                      title="Cancelar"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setTempTarget(excellenceTarget);
                      setIsEditingTarget(true);
                    }}
                    className="flex items-center gap-1 text-sm font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                    title="Clique para alterar a meta global"
                  >
                    <span>{excellenceTarget}% de Acertos</span>
                    <SlidersHorizontal className="w-3 h-3 text-[#9b9a97]" />
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={() => setIsAddTopicModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded-xl shadow-sm transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Assunto</span>
            </button>
          </div>
        </div>

        {/* Semester Analytics Banner */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
          {/* Card 1: Aproveitamento Global */}
          <div className="p-3.5 rounded-xl border border-[#e9e9e8] dark:border-[#2f2f2f] bg-[#faf9f6] dark:bg-[#252525] space-y-2">
            <div className="flex items-center justify-between text-xs text-[#787774] dark:text-[#9b9a97]">
              <span className="font-semibold">Aproveitamento Global</span>
              <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-[#37352f] dark:text-[#f3f3f2]">
                {globalScore.toFixed(1)}%
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  globalScore >= excellenceTarget
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                }`}
              >
                {globalScore >= excellenceTarget ? 'Meta Batida' : 'Abaixo da Meta'}
              </span>
            </div>
            {/* Barra de progresso visual */}
            <div className="w-full bg-stone-200 dark:bg-stone-700 h-1.5 rounded-full overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  globalScore >= excellenceTarget ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(100, globalScore)}%` }}
              />
            </div>
          </div>

          {/* Card 2: Total de Exercícios */}
          <div className="p-3.5 rounded-xl border border-[#e9e9e8] dark:border-[#2f2f2f] bg-[#faf9f6] dark:bg-[#252525] space-y-1">
            <div className="flex items-center justify-between text-xs text-[#787774] dark:text-[#9b9a97]">
              <span className="font-semibold">Exercícios Resolvidos</span>
              <FileText className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <div className="text-xl font-bold font-mono text-[#37352f] dark:text-[#f3f3f2] pt-1">
              {totalExercisesDone}{' '}
              <span className="text-xs font-normal text-[#787774] dark:text-[#9b9a97]">
                ({totalExercisesCorrect} corretos)
              </span>
            </div>
            <div className="text-[11px] text-[#787774] dark:text-[#9b9a97]">
              Em {allAttempts.length} listas realizadas no semestre
            </div>
          </div>

          {/* Card 3: Assuntos Dominados */}
          <div className="p-3.5 rounded-xl border border-[#e9e9e8] dark:border-[#2f2f2f] bg-[#faf9f6] dark:bg-[#252525] space-y-1">
            <div className="flex items-center justify-between text-xs text-[#787774] dark:text-[#9b9a97]">
              <span className="font-semibold">Assuntos Dominados</span>
              <Award className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-xl font-bold font-mono text-[#37352f] dark:text-[#f3f3f2] pt-1">
              {masteredTopicsCount}{' '}
              <span className="text-xs font-normal text-[#787774] dark:text-[#9b9a97]">
                de {topics.length} assuntos
              </span>
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              {topics.length > 0
                ? `${((masteredTopicsCount / topics.length) * 100).toFixed(0)}% da ementa consolidada`
                : 'Nenhum assunto cadastrado'}
            </div>
          </div>

          {/* Card 4: Pendentes Esta Semana */}
          <div className="p-3.5 rounded-xl border border-[#e9e9e8] dark:border-[#2f2f2f] bg-[#faf9f6] dark:bg-[#252525] space-y-1">
            <div className="flex items-center justify-between text-xs text-[#787774] dark:text-[#9b9a97]">
              <span className="font-semibold">Listas para Esta Semana</span>
              <Calendar className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <div className="text-xl font-bold font-mono text-[#37352f] dark:text-[#f3f3f2] pt-1">
              <span className={dueTopicsCount > 0 ? 'text-rose-600 dark:text-rose-400' : ''}>
                {dueTopicsCount}
              </span>{' '}
              <span className="text-xs font-normal text-[#787774] dark:text-[#9b9a97]">pendentes</span>
            </div>
            <div className="text-[11px] text-[#787774] dark:text-[#9b9a97]">
              {dueTopicsCount > 0
                ? 'Assuntos aguardando resolução de lista'
                : 'Todas as listas em dia! Parabéns!'}
            </div>
          </div>
        </div>
      </div>

      {/* Regra de Repetição Explicativa Notion-style */}
      <div className="p-4 bg-purple-50/60 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40 rounded-xl flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
        <div className="text-xs text-[#37352f] dark:text-[#d4d4d4] space-y-1">
          <p className="font-semibold text-purple-900 dark:text-purple-300">
            Como funciona a progressão semanal por excelência ({excellenceTarget}%):
          </p>
          <p className="text-[#787774] dark:text-[#9b9a97] leading-relaxed">
            Ao resolver uma lista de exercícios, se você acertar <strong>{excellenceTarget}% ou mais</strong>, o assunto é aprovado e avança de fase:{' '}
            <span className="font-semibold text-purple-700 dark:text-purple-300">Fase 1 (+7 dias) ➔ Fase 2 (+14 dias) ➔ Fase 3 (+28 dias) ➔ Dominado</span>.{' '}
            Se o aproveitamento for menor que {excellenceTarget}%, o assunto fica com status de{' '}
            <span className="font-semibold text-amber-700 dark:text-amber-400">Reforço Necessário</span> e será agendado em <strong>3 dias</strong> para você refazer exercícios e fechar as lacunas de aprendizado.
          </p>
        </div>
      </div>

      {/* Controls & Filters Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        {/* Disciplines Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedCourseId('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              selectedCourseId === 'all'
                ? 'bg-[#37352f] text-white dark:bg-white dark:text-[#202020] shadow-sm'
                : 'bg-white dark:bg-[#202020] border border-[#e9e9e8] dark:border-[#333] text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f]'
            }`}
          >
            Todas ({topics.length})
          </button>
          {courses.map((c) => {
            const count = topics.filter((t) => t.courseId === c.id).length;
            const isSelected = selectedCourseId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCourseId(c.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                  isSelected
                    ? 'shadow-sm border-transparent text-white'
                    : 'bg-white dark:bg-[#202020] border-[#e9e9e8] dark:border-[#333] text-[#787774] dark:text-[#9b9a97]'
                }`}
                style={isSelected ? { backgroundColor: c.color } : {}}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: isSelected ? '#ffffff' : c.color }}
                />
                <span>{c.code}</span>
                <span className="opacity-70 text-[10px]">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Search & Status Filters */}
        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-end">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#9b9a97]" />
            <input
              type="text"
              placeholder="Buscar assunto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-white dark:bg-[#202020] text-[#37352f] dark:text-[#ececed] focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#efeeea] dark:bg-[#2a2a2a] p-1 rounded-lg text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-white dark:bg-[#1f1f1f] text-[#37352f] dark:text-white shadow-sm'
                  : 'text-[#787774] dark:text-[#9b9a97]'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFilter('due')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                statusFilter === 'due'
                  ? 'bg-white dark:bg-[#1f1f1f] text-rose-600 dark:text-rose-400 shadow-sm font-semibold'
                  : 'text-[#787774] dark:text-[#9b9a97]'
              }`}
            >
              Para Fazer ({dueTopicsCount})
            </button>
            <button
              onClick={() => setStatusFilter('needs_reinforcement')}
              className={`px-2.5 py-1 rounded-md font-medium transition-all cursor-pointer ${
                statusFilter === 'needs_reinforcement'
                  ? 'bg-white dark:bg-[#1f1f1f] text-amber-600 dark:text-amber-400 shadow-sm font-semibold'
                  : 'text-[#787774] dark:text-[#9b9a97]'
              }`}
            >
              Reforço
            </button>
          </div>

          <button
            onClick={() => setIsImportSyllabusOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-[#e9e9e8] dark:border-[#333] hover:bg-stone-50 dark:hover:bg-stone-800 text-[#37352f] dark:text-[#ececed] text-xs font-medium rounded-lg transition-all cursor-pointer"
            title="Importar tópicos diretamente da ementa das disciplinas"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            <span>Puxar da Ementa</span>
          </button>
        </div>
      </div>

      {/* Main Subjects Table / Cards */}
      <div className="bg-white dark:bg-[#202020] rounded-xl border border-[#e9e9e8] dark:border-[#2f2f2f] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#f7f6f3] dark:bg-[#262626] border-b border-[#e9e9e8] dark:border-[#2f2f2f] text-[#787774] dark:text-[#9b9a97] uppercase font-bold text-[10px]">
              <tr>
                <th className="px-4 py-3">Assunto da Disciplina</th>
                <th className="px-4 py-3">Disciplina</th>
                <th className="px-4 py-3">Fase de Retenção</th>
                <th className="px-4 py-3">Aproveitamento Recente</th>
                <th className="px-4 py-3">Próxima Rodada</th>
                <th className="px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e9e9e8] dark:divide-[#2f2f2f]">
              {filteredTopics.map((topic) => {
                const course = courses.find((c) => c.id === topic.courseId);
                const isDue = topic.nextReviewDate <= todayStr;
                const lastAttempt = topic.attempts?.slice(-1)[0];
                const currentPhase = PHASES[Math.min(topic.stage, PHASES.length - 1)];
                const target = topic.targetScore || excellenceTarget;

                return (
                  <tr
                    key={topic.id}
                    className="hover:bg-[#fcfbf9] dark:hover:bg-[#252525] transition-colors group"
                  >
                    {/* Assunto */}
                    <td className="px-4 py-3.5 max-w-xs md:max-w-md">
                      <div className="font-semibold text-sm text-[#37352f] dark:text-[#f3f3f2]">
                        {topic.name}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-[#787774] dark:text-[#9b9a97]">
                        <span>{topic.attempts?.length || 0} listas resolvidas</span>
                        {topic.question && (
                          <button
                            onClick={() => {
                              setTopicForFlashcard(topic);
                              setShowFlashcardAnswer(false);
                            }}
                            className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                          >
                            <Brain className="w-3 h-3" />
                            <span>Ver Teoria/Flashcard</span>
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Matéria */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {course ? (
                        <span
                          className="font-mono text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs"
                          style={{ backgroundColor: `${course.color}20`, color: course.color }}
                          title={course.name}
                        >
                          {course.code}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* Fase Atual (Stepper) */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1">
                          {PHASES.map((p, idx) => (
                            <span
                              key={p.stage}
                              className={`h-2 rounded-full transition-all ${
                                idx < topic.stage
                                  ? 'w-5 bg-purple-600 dark:bg-purple-400'
                                  : idx === topic.stage
                                  ? 'w-5 bg-purple-600 dark:bg-purple-400 animate-pulse'
                                  : 'w-2 bg-stone-200 dark:bg-stone-700'
                              }`}
                              title={p.label}
                            />
                          ))}
                        </div>
                        <div className="text-[11px] font-medium text-purple-700 dark:text-purple-300">
                          {currentPhase.label}
                        </div>
                      </div>
                    </td>

                    {/* Aproveitamento Recente */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {lastAttempt ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-bold font-mono ${
                                lastAttempt.passed
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {lastAttempt.scorePercentage}%
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                                lastAttempt.passed
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              }`}
                            >
                              {lastAttempt.passed ? 'Aprovado' : 'Reforço'}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#787774] dark:text-[#9b9a97]">
                            {lastAttempt.correctExercises} de {lastAttempt.totalExercises} questões
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#9b9a97] italic">
                          Nenhuma lista feita
                        </span>
                      )}
                    </td>

                    {/* Próxima Rodada */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="space-y-0.5">
                        <span
                          className={`inline-flex items-center gap-1.5 font-medium ${
                            isDue
                              ? 'text-rose-600 dark:text-rose-400 font-bold'
                              : 'text-[#37352f] dark:text-[#ececed]'
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{topic.nextReviewDate}</span>
                          {isDue && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-[10px] font-bold">
                              Fazer Hoje
                            </span>
                          )}
                        </span>
                        {topic.lastReviewDate && (
                          <div className="text-[10px] text-[#787774] dark:text-[#9b9a97]">
                            Última: {topic.lastReviewDate}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openRegisterModal(topic)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                          title="Registrar resolução de lista de exercícios"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Registrar Lista</span>
                        </button>

                        {topic.attempts && topic.attempts.length > 0 && (
                          <button
                            onClick={() => setTopicForHistory(topic)}
                            className="p-1.5 text-stone-500 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-lg transition-all cursor-pointer"
                            title="Ver histórico de listas e evolução"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => onDeleteTopic(topic.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-all cursor-pointer"
                          title="Excluir assunto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredTopics.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#787774] dark:text-[#9b9a97]">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                    <p className="text-sm font-medium">Nenhum assunto encontrado para este filtro.</p>
                    <p className="text-xs text-[#9b9a97] mt-1">
                      Adicione um novo assunto ou puxe os tópicos da ementa das suas disciplinas!
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Registrar Lista de Exercícios */}
      {topicToRegisterList && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#202020] rounded-2xl border border-[#e9e9e8] dark:border-[#2f2f2f] w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#e9e9e8] dark:border-[#2f2f2f] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-300 rounded-lg">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#37352f] dark:text-[#f3f3f2]">
                    Registrar Lista de Exercícios
                  </h3>
                  <p className="text-xs text-[#787774] dark:text-[#9b9a97] truncate max-w-xs">
                    {topicToRegisterList.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTopicToRegisterList(null)}
                className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-[#787774] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitExerciseList} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-semibold">
                  Título / Identificação da Lista *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Lista 2 - Fixação de Herança, Simulado P1"
                  value={listTitle}
                  onChange={(e) => setListTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-[#fbfbfa] dark:bg-[#191919] text-[#37352f] dark:text-[#ececed] focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-semibold">
                    Data da Resolução
                  </label>
                  <input
                    type="date"
                    required
                    value={listDate}
                    onChange={(e) => setListDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-[#fbfbfa] dark:bg-[#191919] text-[#37352f] dark:text-[#ececed] focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-semibold">
                    Total de Exercícios *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    required
                    value={totalExercises}
                    onChange={(e) => setTotalExercises(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-[#fbfbfa] dark:bg-[#191919] text-[#37352f] dark:text-[#ececed] font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-semibold">
                    Exercícios Acertados *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={Number(totalExercises) || 1}
                    required
                    value={correctExercises}
                    onChange={(e) => setCorrectExercises(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-[#fbfbfa] dark:bg-[#191919] text-[#37352f] dark:text-[#ececed] font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Feedback em Tempo Real de Aproveitamento */}
              {Number(totalExercises) > 0 && (
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                    ((Number(correctExercises) || 0) / (Number(totalExercises) || 1)) * 100 >= excellenceTarget
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-300'
                      : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-900 dark:text-amber-300'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold font-mono">
                        {(
                          ((Number(correctExercises) || 0) / (Number(totalExercises) || 1)) *
                          100
                        ).toFixed(1)}
                        %
                      </span>
                      <span className="text-xs font-semibold">
                        {((Number(correctExercises) || 0) / (Number(totalExercises) || 1)) * 100 >=
                        excellenceTarget
                          ? `✅ Atingiu a meta de ${excellenceTarget}%!`
                          : `⚠️ Abaixo da meta de ${excellenceTarget}%`}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-90 leading-tight">
                      {((Number(correctExercises) || 0) / (Number(totalExercises) || 1)) * 100 >=
                      excellenceTarget
                        ? `Aprovado! O assunto avançará para a próxima fase no ciclo espaçado.`
                        : `Será agendado um reforço em 3 dias para fechar as lacunas deste assunto.`}
                    </p>
                  </div>
                  <Percent className="w-8 h-8 opacity-25 shrink-0" />
                </div>
              )}

              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-semibold">
                  Anotações / Dúvidas e Erros (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Ex: Errei a questão 4 por erro de conta de sinal; revisar polimorfismo dinâmico."
                  value={listNotes}
                  onChange={(e) => setListNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-[#fbfbfa] dark:bg-[#191919] text-[#37352f] dark:text-[#ececed] focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e9e9e8] dark:border-[#2f2f2f]">
                <button
                  type="button"
                  onClick={() => setTopicToRegisterList(null)}
                  className="px-4 py-2 border border-[#e9e9e8] dark:border-[#333] rounded-lg text-xs font-medium hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  Salvar Desempenho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Histórico de Listas do Assunto */}
      {topicForHistory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#202020] rounded-2xl border border-[#e9e9e8] dark:border-[#2f2f2f] w-full max-w-lg shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#e9e9e8] dark:border-[#2f2f2f] pb-3">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <div>
                  <h3 className="font-bold text-base text-[#37352f] dark:text-[#f3f3f2]">
                    Histórico de Listas de Exercícios
                  </h3>
                  <p className="text-xs text-[#787774] dark:text-[#9b9a97] truncate max-w-xs">
                    {topicForHistory.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setTopicForHistory(null)}
                className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-[#787774] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {topicForHistory.attempts && topicForHistory.attempts.length > 0 ? (
                topicForHistory.attempts.map((att, idx) => (
                  <div
                    key={att.id}
                    className="p-3.5 rounded-xl border border-[#e9e9e8] dark:border-[#2f2f2f] bg-[#fcfbf9] dark:bg-[#252525] space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#37352f] dark:text-[#f3f3f2]">
                          #{idx + 1} {att.listTitle}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            att.passed
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          }`}
                        >
                          {att.passed ? 'Aprovado' : 'Reforço'}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                        {att.scorePercentage}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#787774] dark:text-[#9b9a97]">
                      <span>{att.date}</span>
                      <span>
                        {att.correctExercises} acertos / {att.totalExercises} questões
                      </span>
                    </div>

                    {att.notes && (
                      <div className="text-xs mt-1 p-2 bg-stone-100 dark:bg-stone-800/60 rounded text-[#37352f] dark:text-[#ececed] italic">
                        "{att.notes}"
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-[#9b9a97]">
                  Nenhuma lista registrada para este assunto ainda.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#e9e9e8] dark:border-[#2f2f2f]">
              <button
                onClick={() => setTopicForHistory(null)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium cursor-pointer"
              >
                Fechar Histórico
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Importar da Ementa (Syllabus) das Disciplinas */}
      {isImportSyllabusOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#202020] rounded-2xl border border-[#e9e9e8] dark:border-[#2f2f2f] w-full max-w-lg shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#e9e9e8] dark:border-[#2f2f2f] pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-base text-[#37352f] dark:text-[#f3f3f2]">
                  Puxar Assuntos da Ementa das Disciplinas
                </h3>
              </div>
              <button
                onClick={() => setIsImportSyllabusOpen(false)}
                className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-[#787774] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#787774] dark:text-[#9b9a97]">
              Adicione tópicos das ementas cadastradas em suas matérias diretamente como assuntos de recuperação ativa:
            </p>

            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {courses.map((course) => {
                const syllabusItems = course.syllabus || [];
                if (syllabusItems.length === 0) return null;

                return (
                  <div key={course.id} className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#37352f] dark:text-[#f3f3f2]">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: course.color }}
                      />
                      <span>
                        {course.code} - {course.name}
                      </span>
                    </div>

                    <div className="space-y-1.5 pl-4 border-l-2 border-stone-200 dark:border-stone-800">
                      {syllabusItems.map((item) => {
                        const alreadyAdded = topics.some(
                          (t) =>
                            t.courseId === course.id &&
                            t.name.toLowerCase() === item.title.toLowerCase()
                        );

                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-2 p-2 bg-[#fcfbf9] dark:bg-[#252525] rounded-lg border border-[#e9e9e8] dark:border-[#333] text-xs"
                          >
                            <span className="truncate flex-1 font-medium text-[#37352f] dark:text-[#ececed]">
                              {item.title}
                            </span>
                            {alreadyAdded ? (
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 shrink-0">
                                Já Adicionado
                              </span>
                            ) : (
                              <button
                                onClick={() => handleImportFromSyllabus(course.id, item.title)}
                                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-[11px] font-medium shrink-0 cursor-pointer transition-colors"
                              >
                                + Adicionar
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#e9e9e8] dark:border-[#2f2f2f]">
              <button
                onClick={() => setIsImportSyllabusOpen(false)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Novo Assunto Manual */}
      {isAddTopicModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#202020] rounded-2xl border border-[#e9e9e8] dark:border-[#2f2f2f] w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#e9e9e8] dark:border-[#2f2f2f] pb-3">
              <h3 className="font-bold text-base text-[#37352f] dark:text-[#f3f3f2]">
                Novo Assunto de Estudo
              </h3>
              <button
                onClick={() => setIsAddTopicModalOpen(false)}
                className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-[#787774] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTopic} className="space-y-4 text-xs">
              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-semibold">
                  Nome do Assunto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Polimorfismo e Classes Abstratas, Integrais por Partes"
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-[#fbfbfa] dark:bg-[#191919] text-[#37352f] dark:text-[#ececed] focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-semibold">
                  Disciplina Associada *
                </label>
                <select
                  value={newTopicCourseId}
                  onChange={(e) => setNewTopicCourseId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-[#fbfbfa] dark:bg-[#191919] text-[#37352f] dark:text-[#ececed] focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id} className="dark:bg-[#202020]">
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 border-t border-[#e9e9e8] dark:border-[#2f2f2f] space-y-3">
                <div className="flex items-center gap-1.5 text-[#787774] dark:text-[#9b9a97] font-semibold text-[11px]">
                  <Brain className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                  <span>Pergunta Teórica / Flashcard (Opcional)</span>
                </div>

                <div>
                  <textarea
                    rows={2}
                    placeholder="Pergunta para testar o conceito mentalmente..."
                    value={newTopicQuestion}
                    onChange={(e) => setNewTopicQuestion(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-[#fbfbfa] dark:bg-[#191919] text-[#37352f] dark:text-[#ececed] focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>

                <div>
                  <textarea
                    rows={2}
                    placeholder="Resposta ou resumo teórico..."
                    value={newTopicAnswer}
                    onChange={(e) => setNewTopicAnswer(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-[#fbfbfa] dark:bg-[#191919] text-[#37352f] dark:text-[#ececed] focus:outline-none focus:border-purple-500 resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e9e9e8] dark:border-[#2f2f2f]">
                <button
                  type="button"
                  onClick={() => setIsAddTopicModalOpen(false)}
                  className="px-4 py-2 border border-[#e9e9e8] dark:border-[#333] rounded-lg text-xs font-medium hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  Salvar Assunto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Flashcard Teórico Rápido */}
      {topicForFlashcard && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#202020] rounded-2xl border border-[#e9e9e8] dark:border-[#2f2f2f] w-full max-w-md shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#e9e9e8] dark:border-[#2f2f2f] pb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h3 className="font-bold text-sm text-[#37352f] dark:text-[#f3f3f2]">
                  {topicForFlashcard.name}
                </h3>
              </div>
              <button
                onClick={() => setTopicForFlashcard(null)}
                className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg text-[#787774] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#787774] dark:text-[#9b9a97]">
                  Pergunta:
                </span>
                <div className="text-sm font-medium mt-1 p-3 bg-[#fcfbf9] dark:bg-[#262626] rounded-xl border border-[#e9e9e8] dark:border-[#333]">
                  {topicForFlashcard.question}
                </div>
              </div>

              {showFlashcardAnswer ? (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Resposta Teórica:
                  </span>
                  <div className="text-xs mt-1 p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900/40 text-[#37352f] dark:text-[#f3f3f2] leading-relaxed">
                    {topicForFlashcard.answer || 'Nenhuma resposta cadastrada.'}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowFlashcardAnswer(true)}
                  className="w-full py-2.5 bg-[#f7f6f3] dark:bg-[#282828] hover:bg-purple-50 dark:hover:bg-purple-950/30 text-purple-600 dark:text-purple-400 font-medium text-xs rounded-xl border border-dashed border-purple-300 dark:border-purple-800 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>Revelar Resposta</span>
                </button>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#e9e9e8] dark:border-[#2f2f2f]">
              <button
                onClick={() => setTopicForFlashcard(null)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-medium cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
