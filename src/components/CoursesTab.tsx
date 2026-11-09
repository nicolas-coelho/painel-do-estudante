import React, { useState } from 'react';
import { Course, GradeItem, SyllabusItem, Task } from '../types';
import { useNotification } from '../context/NotificationContext';
import { formatDateBR } from '../dateUtils';
import {
  Plus,
  BookOpen,
  User,
  Clock,
  MapPin,
  CheckCircle,
  X,
  Trash2,
  Edit3,
  Award,
  ListChecks,
  Calendar,
  Check,
  AlertCircle,
} from 'lucide-react';

interface CoursesTabProps {
  courses: Course[];
  tasks?: Task[];
  onAddCourse: (c: Course) => void;
  onUpdateCourse: (c: Course) => void;
  onDeleteCourse: (id: string) => void;
}

export const CoursesTab: React.FC<CoursesTabProps> = ({
  courses,
  tasks = [],
  onAddCourse,
  onUpdateCourse,
  onDeleteCourse,
}) => {
  const { showToast, showConfirm } = useNotification();
  const [filter, setFilter] = useState<'all' | 'in_progress'>('all');
  const [semesterFilter, setSemesterFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<'general' | 'grades' | 'syllabus' | 'tasks'>('general');

  // Form state for creating a new course
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newProfessor, setNewProfessor] = useState('');
  const [newSchedule, setNewSchedule] = useState('');
  const [newRoomOrLink, setNewRoomOrLink] = useState('');
  const [newSemester, setNewSemester] = useState('1º Semestre');
  const [newYear, setNewYear] = useState('2026');
  const [newColor, setNewColor] = useState('#3b82f6');

  // New grade item state inside edit modal
  const [newGradeName, setNewGradeName] = useState('');
  const [newGradeValue, setNewGradeValue] = useState<number | ''>('');
  const [newGradeMax, setNewGradeMax] = useState<number | ''>(10);
  const [newGradeWeight, setNewGradeWeight] = useState<number | ''>(1);
  const [newGradeDate, setNewGradeDate] = useState('');
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  const [inlineGradeValue, setInlineGradeValue] = useState<string>('');

  // New syllabus item state inside edit modal
  const [newSyllabusTitle, setNewSyllabusTitle] = useState('');

  const filteredCourses = courses.filter((c) => {
    const matchesStatus = filter === 'all' ? true : c.inProgress;
    const matchesSemester =
      semesterFilter === 'all'
        ? true
        : c.semester?.toLowerCase().includes(semesterFilter === '1º Semestre' ? '1' : '2');
    return matchesStatus && matchesSemester;
  });

  // Quick calculations for a course
  const calculateAverage = (grades?: GradeItem[]): number | null => {
    if (!grades || grades.length === 0) return null;
    const gradedItems = grades.filter((g) => {
      if (g.grade === undefined || g.grade === null) return false;
      const num = Number(g.grade);
      return !isNaN(num);
    });
    if (gradedItems.length === 0) return null;

    let totalScore = 0;
    let totalWeight = 0;
    for (const g of gradedItems) {
      const weight = typeof g.weight === 'number' && !isNaN(g.weight) && g.weight > 0 ? g.weight : 1;
      const gradeVal = Number(g.grade);
      totalScore += gradeVal * weight;
      totalWeight += weight;
    }
    return totalWeight > 0 ? Number((totalScore / totalWeight).toFixed(2)) : null;
  };

  const calculateSyllabusProgress = (syllabus?: SyllabusItem[]): { total: number; completed: number; percentage: number } => {
    if (!syllabus || syllabus.length === 0) return { total: 0, completed: 0, percentage: 0 };
    const completed = syllabus.filter((s) => s.completed).length;
    const percentage = Math.round((completed / syllabus.length) * 100);
    return { total: syllabus.length, completed, percentage };
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const newCourse: Course = {
      id: `course-${Date.now()}`,
      name: newName.trim(),
      code: newCode.trim().toUpperCase() || 'DISC',
      professor: newProfessor.trim(),
      schedule: newSchedule.trim(),
      roomOrLink: newRoomOrLink.trim(),
      semester: newSemester,
      year: newYear,
      inProgress: true,
      color: newColor,
      targetAverage: 7.0,
      grades: [],
      syllabus: [],
    };

    onAddCourse(newCourse);
    setIsAddModalOpen(false);
    setNewName('');
    setNewCode('');
    setNewProfessor('');
    setNewSchedule('');
    setNewRoomOrLink('');
  };

  const handleAddGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse || !newGradeName.trim()) return;

    const parsedGrade =
      newGradeValue === '' || isNaN(Number(newGradeValue)) ? null : Number(newGradeValue);

    const newGrade: GradeItem = {
      id: `grade-${Date.now()}`,
      name: newGradeName.trim(),
      grade: parsedGrade,
      maxGrade: Number(newGradeMax) || 10,
      weight: Number(newGradeWeight) || 1,
      date: newGradeDate || undefined,
    };

    const updated = {
      ...editingCourse,
      grades: [...(editingCourse.grades || []), newGrade],
    };

    setEditingCourse(updated);
    onUpdateCourse(updated);
    setNewGradeName('');
    setNewGradeValue('');
    setNewGradeWeight(1);
    setNewGradeDate('');
  };

  const handleSaveInlineGrade = (gradeId: string) => {
    if (!editingCourse) return;
    const trimmed = inlineGradeValue.trim();
    const finalVal =
      trimmed === '' ? null : isNaN(Number(trimmed.replace(',', '.'))) ? null : Number(trimmed.replace(',', '.'));

    const updatedGrades = (editingCourse.grades || []).map((g) => {
      if (g.id === gradeId) {
        return { ...g, grade: finalVal };
      }
      return g;
    });

    const updated = { ...editingCourse, grades: updatedGrades };
    setEditingCourse(updated);
    onUpdateCourse(updated);
    setEditingGradeId(null);
    setInlineGradeValue('');
  };

  const handleDeleteGrade = (gradeId: string) => {
    if (!editingCourse) return;
    const updated = {
      ...editingCourse,
      grades: (editingCourse.grades || []).filter((g) => g.id !== gradeId),
    };
    setEditingCourse(updated);
    onUpdateCourse(updated);
  };

  const handleAddSyllabus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse || !newSyllabusTitle.trim()) return;

    const newItem: SyllabusItem = {
      id: `syl-${Date.now()}`,
      title: newSyllabusTitle.trim(),
      completed: false,
    };

    const updated = {
      ...editingCourse,
      syllabus: [...(editingCourse.syllabus || []), newItem],
    };

    setEditingCourse(updated);
    onUpdateCourse(updated);
    setNewSyllabusTitle('');
  };

  const handleToggleSyllabus = (itemId: string) => {
    if (!editingCourse) return;
    const updated = {
      ...editingCourse,
      syllabus: (editingCourse.syllabus || []).map((s) =>
        s.id === itemId ? { ...s, completed: !s.completed } : s
      ),
    };
    setEditingCourse(updated);
    onUpdateCourse(updated);
  };

  const handleDeleteSyllabus = (itemId: string) => {
    if (!editingCourse) return;
    const updated = {
      ...editingCourse,
      syllabus: (editingCourse.syllabus || []).filter((s) => s.id !== itemId),
    };
    setEditingCourse(updated);
    onUpdateCourse(updated);
  };

  const handleSaveGeneralDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourse) return;
    onUpdateCourse(editingCourse);
  };

  return (
    <div className="space-y-6">
      {/* Controls & Filter bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-[#efeeea] dark:bg-[#2a2a2a] p-1 rounded-lg">
            <button
              onClick={() => setFilter('in_progress')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                filter === 'in_progress'
                  ? 'bg-white dark:bg-[#1f1f1f] text-[#37352f] dark:text-white shadow-sm'
                  : 'text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f]'
              }`}
            >
              Em Andamento ({courses.filter((c) => c.inProgress).length})
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                filter === 'all'
                  ? 'bg-white dark:bg-[#1f1f1f] text-[#37352f] dark:text-white shadow-sm'
                  : 'text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f]'
              }`}
            >
              Todas ({courses.length})
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <select
              value={semesterFilter}
              onChange={(e) => setSemesterFilter(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-[#efeeea] dark:bg-[#2a2a2a] text-[#37352f] dark:text-[#d4d4d4] focus:outline-none focus:border-blue-500 shadow-sm"
              title="Filtrar por Semestre"
            >
              <option value="all" className="dark:bg-[#202020]">Todos os Semestres</option>
              <option value="1º Semestre" className="dark:bg-[#202020]">1º Semestre</option>
              <option value="2º Semestre" className="dark:bg-[#202020]">2º Semestre</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Disciplina</span>
        </button>
      </div>

      {/* Courses Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCourses.map((c) => {
          const avg = calculateAverage(c.grades);
          const prog = calculateSyllabusProgress(c.syllabus);

          return (
            <div
              key={c.id}
              onClick={() => {
                setEditingCourse(c);
                setActiveModalTab('general');
              }}
              className="group relative bg-white dark:bg-[#202020] rounded-xl border border-[#e9e9e8] dark:border-[#2f2f2f] hover:border-blue-400 dark:hover:border-blue-500/50 hover:shadow-md cursor-pointer transition-all overflow-hidden flex flex-col justify-between"
            >
              {/* Top Accent Strip */}
              <div className="h-2 w-full" style={{ backgroundColor: c.color }} />

              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase mb-1.5"
                      style={{ backgroundColor: `${c.color}20`, color: c.color }}
                    >
                      {c.code}
                    </span>
                    <h3 className="font-semibold text-sm md:text-base text-[#37352f] dark:text-[#f3f3f2] leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {c.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="p-1 text-[#787774] hover:text-blue-600 dark:hover:text-blue-400" title="Editar disciplina">
                      <Edit3 className="w-3.5 h-3.5" />
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        showConfirm({
                          title: 'Excluir Disciplina',
                          message: `Tem certeza que deseja excluir a disciplina "${c.name}"? As tarefas já cadastradas permanecerão no histórico.`,
                          confirmText: 'Excluir Disciplina',
                          danger: true,
                          onConfirm: () => {
                            onDeleteCourse(c.id);
                            showToast('info', 'Disciplina Excluída', `"${c.name}" foi removida com sucesso.`);
                          },
                        });
                      }}
                      className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
                      title="Excluir disciplina"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-[#787774] dark:text-[#9b9a97]">
                  {c.professor && (
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{c.professor}</span>
                    </div>
                  )}
                  {c.schedule && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>{c.schedule}</span>
                    </div>
                  )}
                  {c.roomOrLink && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{c.roomOrLink}</span>
                    </div>
                  )}
                </div>

                {/* Notas e Progresso da Ementa */}
                <div className="pt-2 border-t border-[#f0f0ee] dark:border-[#2a2a2a] grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-[#9b9a97] uppercase tracking-wider block">Média Atual</span>
                    {avg !== null && !isNaN(avg) ? (
                      <span
                        className={`font-semibold text-xs ${
                          avg >= (c.targetAverage || 7) ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {avg.toFixed(1)} / 10
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#9b9a97]">Sem notas</span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] text-[#9b9a97] uppercase tracking-wider block">Ementa</span>
                    {prog.total > 0 ? (
                      <span className="font-medium text-[11px] text-[#37352f] dark:text-[#d4d4d4]">
                        {prog.completed}/{prog.total} ({prog.percentage}%)
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#9b9a97]">0 tópicos</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Footer */}
              <div className="px-4 py-2.5 bg-[#fcfbf9] dark:bg-[#252525] border-t border-[#f0f0ee] dark:border-[#2a2a2a] flex items-center justify-between text-[11px]">
                <span className="text-[#9b9a97]">
                  {c.semester} • {c.year}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateCourse({ ...c, inProgress: !c.inProgress });
                  }}
                  className={`flex items-center gap-1 font-medium transition-colors ${
                    c.inProgress ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-400'
                  }`}
                >
                  <CheckCircle className="w-3 h-3" />
                  {c.inProgress ? 'Em andamento' : 'Concluído'}
                </button>
              </div>
            </div>
          );
        })}

        {filteredCourses.length === 0 && (
          <div className="col-span-full py-12 text-center text-[#787774] dark:text-[#9b9a97]">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Nenhuma disciplina encontrada neste filtro.</p>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODAL: DETALHES E EDIÇÃO COMPLETA DA DISCIPLINA */}
      {/* ========================================================= */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-[#202020] rounded-2xl border border-[#e9e9e8] dark:border-[#2f2f2f] w-full max-w-2xl shadow-2xl overflow-hidden my-6">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#e9e9e8] dark:border-[#2f2f2f] flex items-start justify-between gap-3" style={{ borderTop: `5px solid ${editingCourse.color}` }}>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase"
                    style={{ backgroundColor: `${editingCourse.color}20`, color: editingCourse.color }}
                  >
                    {editingCourse.code}
                  </span>
                  <span className="text-xs text-[#9b9a97]">
                    {editingCourse.semester} • {editingCourse.year}
                  </span>
                </div>
                <h2 className="text-lg md:text-xl font-bold text-[#37352f] dark:text-[#f3f3f2]">
                  {editingCourse.name}
                </h2>
              </div>
              <button
                onClick={() => setEditingCourse(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation Tabs inside Modal */}
            <div className="flex items-center px-5 border-b border-[#e9e9e8] dark:border-[#2f2f2f] bg-[#faf9f6] dark:bg-[#252525] gap-1 overflow-x-auto text-xs">
              <button
                onClick={() => setActiveModalTab('general')}
                className={`py-3 px-3 font-medium border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeModalTab === 'general'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f]'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Informações Gerais</span>
              </button>
              <button
                onClick={() => setActiveModalTab('grades')}
                className={`py-3 px-3 font-medium border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeModalTab === 'grades'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f]'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>Notas & Provas ({(editingCourse.grades || []).length})</span>
              </button>
              <button
                onClick={() => setActiveModalTab('syllabus')}
                className={`py-3 px-3 font-medium border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeModalTab === 'syllabus'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f]'
                }`}
              >
                <ListChecks className="w-3.5 h-3.5" />
                <span>Conteúdo Programático ({(editingCourse.syllabus || []).length})</span>
              </button>
              <button
                onClick={() => setActiveModalTab('tasks')}
                className={`py-3 px-3 font-medium border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap ${
                  activeModalTab === 'tasks'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Tarefas Vinculadas</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 max-h-[65vh] overflow-y-auto">
              {/* TAB 1: INFORMAÇÕES GERAIS */}
              {activeModalTab === 'general' && (
                <form onSubmit={handleSaveGeneralDetails} className="space-y-4 text-xs md:text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Nome da Matéria</label>
                      <input
                        type="text"
                        value={editingCourse.name}
                        onChange={(e) => setEditingCourse({ ...editingCourse, name: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Código</label>
                      <input
                        type="text"
                        value={editingCourse.code}
                        onChange={(e) => setEditingCourse({ ...editingCourse, code: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Professor(a)</label>
                      <input
                        type="text"
                        value={editingCourse.professor}
                        onChange={(e) => setEditingCourse({ ...editingCourse, professor: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Dias e Horários</label>
                      <input
                        type="text"
                        value={editingCourse.schedule}
                        onChange={(e) => setEditingCourse({ ...editingCourse, schedule: e.target.value })}
                        placeholder="Ex: Ter / Qui 10:00 - 12:00"
                        className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Sala ou Link</label>
                      <input
                        type="text"
                        value={editingCourse.roomOrLink}
                        onChange={(e) => setEditingCourse({ ...editingCourse, roomOrLink: e.target.value })}
                        placeholder="Ex: CB-02 ou link do Meet"
                        className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Semestre</label>
                      <select
                        value={editingCourse.semester || '1º Semestre'}
                        onChange={(e) => setEditingCourse({ ...editingCourse, semester: e.target.value })}
                        className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500 text-xs md:text-sm"
                      >
                        <option value="1º Semestre" className="dark:bg-[#202020]">1º Semestre</option>
                        <option value="2º Semestre" className="dark:bg-[#202020]">2º Semestre</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Meta de Média para Aprovação</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="10"
                        value={editingCourse.targetAverage ?? 7.0}
                        onChange={(e) => setEditingCourse({ ...editingCourse, targetAverage: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500 font-medium"
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <div>
                        <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Cor</label>
                        <input
                          type="color"
                          value={editingCourse.color}
                          onChange={(e) => setEditingCourse({ ...editingCourse, color: e.target.value })}
                          className="w-10 h-9 p-0.5 rounded border border-[#e9e9e8] dark:border-[#333] bg-transparent cursor-pointer"
                        />
                      </div>
                      <div className="pt-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingCourse.inProgress}
                            onChange={(e) => setEditingCourse({ ...editingCourse, inProgress: e.target.checked })}
                            className="rounded border-[#e9e9e8] dark:border-[#333] text-blue-600 focus:ring-0 w-4 h-4"
                          />
                          <span className="font-medium text-xs">Disciplina em andamento</span>
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-4 border-t border-[#f0f0ee] dark:border-[#2a2a2a]">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-all text-xs"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: NOTAS & AVALIAÇÕES */}
              {activeModalTab === 'grades' && (
                <div className="space-y-5 text-xs md:text-sm">
                  {/* Resumo da Média */}
                  {(() => {
                    const avg = calculateAverage(editingCourse.grades);
                    const target = editingCourse.targetAverage ?? 7.0;
                    return (
                      <div className="p-4 bg-[#f7f6f3] dark:bg-[#252525] rounded-xl border border-[#e9e9e8] dark:border-[#333] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-lg text-lg ${avg !== null && !isNaN(avg) && avg >= target ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'}`}>
                            🏆
                          </div>
                          <div>
                            <div className="text-[11px] text-[#787774] dark:text-[#9b9a97] uppercase tracking-wider">Média Ponderada Atual</div>
                            <div className="text-xl font-bold flex items-center gap-2">
                              {avg !== null && !isNaN(avg) ? `${avg.toFixed(2)}` : 'Sem notas lançadas'}
                              {avg !== null && !isNaN(avg) && <span className="text-xs text-[#9b9a97] font-normal">/ 10</span>}
                            </div>
                          </div>
                        </div>

                        <div className="text-right sm:border-l sm:border-[#e9e9e8] dark:sm:border-[#333] sm:pl-4">
                          <div className="text-[11px] text-[#787774] dark:text-[#9b9a97]">Meta de Aprovação: {target.toFixed(1)}</div>
                          <div className="mt-0.5">
                            {avg !== null && !isNaN(avg) ? (
                              avg >= target ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                                  <Check className="w-3.5 h-3.5" /> Na meta de aprovação
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold text-xs">
                                  <AlertCircle className="w-3.5 h-3.5" /> Precisa de {(target - avg).toFixed(2)} p/ meta
                                </span>
                              )
                            ) : (
                              <span className="text-xs text-[#9b9a97]">Aguardando lançamento de notas</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Lista de Notas Cadastradas */}
                  <div>
                    <h4 className="font-semibold text-xs text-[#787774] dark:text-[#9b9a97] uppercase tracking-wider mb-2">
                      Provas & Trabalhos Cadastrados
                    </h4>

                    {(editingCourse.grades || []).length > 0 ? (
                      <div className="divide-y divide-[#f0f0ee] dark:divide-[#2f2f2f] border border-[#e9e9e8] dark:border-[#2f2f2f] rounded-xl overflow-hidden bg-white dark:bg-[#1f1f1f]">
                        {(editingCourse.grades || []).map((grade) => {
                          const hasGrade = grade.grade !== undefined && grade.grade !== null && !isNaN(Number(grade.grade));
                          const isEditingThis = editingGradeId === grade.id;

                          return (
                            <div key={grade.id} className="p-3 flex items-center justify-between gap-3 hover:bg-stone-50 dark:hover:bg-[#252525] transition-colors">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-[#37352f] dark:text-[#f3f3f2] truncate">{grade.name}</div>
                                <div className="text-[11px] text-[#787774] dark:text-[#9b9a97] flex items-center gap-2 mt-0.5">
                                  <span>Peso: {grade.weight || 1}</span>
                                  {grade.date && <span>• Data: {formatDateBR(grade.date)}</span>}
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {isEditingThis ? (
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0"
                                      max={grade.maxGrade || 10}
                                      autoFocus
                                      placeholder="0.0"
                                      value={inlineGradeValue}
                                      onChange={(e) => setInlineGradeValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveInlineGrade(grade.id);
                                        if (e.key === 'Escape') setEditingGradeId(null);
                                      }}
                                      className="w-16 px-2 py-1 text-xs rounded border border-blue-400 dark:border-blue-500 bg-white dark:bg-[#1a1a1a] text-center font-mono font-bold focus:outline-none"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleSaveInlineGrade(grade.id)}
                                      className="px-2 py-1 text-[11px] bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors"
                                    >
                                      Salvar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingGradeId(null)}
                                      className="px-1.5 py-1 text-[11px] text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    {hasGrade ? (
                                      <span className="font-bold text-sm text-blue-600 dark:text-blue-400 font-mono">
                                        {Number(grade.grade)} <span className="text-xs text-[#9b9a97] font-normal">/ {grade.maxGrade || 10}</span>
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
                                        Pendente
                                      </span>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingGradeId(grade.id);
                                        setInlineGradeValue(hasGrade ? String(grade.grade) : '');
                                      }}
                                      className="p-1 text-stone-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
                                      title={hasGrade ? 'Alterar nota' : 'Lançar nota'}
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteGrade(grade.id)}
                                      className="p-1 text-red-400 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors"
                                      title="Excluir nota"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 text-center border border-dashed border-[#e9e9e8] dark:border-[#333] rounded-xl text-stone-400 text-xs">
                        Nenhuma nota registrada para esta disciplina ainda.
                      </div>
                    )}
                  </div>

                  {/* Formulário: Adicionar Nova Nota */}
                  <form onSubmit={handleAddGrade} className="p-4 bg-[#fcfbf9] dark:bg-[#252525] rounded-xl border border-[#e9e9e8] dark:border-[#2f2f2f] space-y-3">
                    <h5 className="font-semibold text-xs text-[#37352f] dark:text-[#f3f3f2] flex items-center gap-1.5">
                      <Plus className="w-3.5 h-3.5 text-blue-500" />
                      <span>Adicionar Avaliação / Prova</span>
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          required
                          placeholder="Nome (Ex: Prova 1, Seminário)"
                          value={newGradeName}
                          onChange={(e) => setNewGradeName(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-white dark:bg-[#1e1e1e] focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          placeholder="Nota (Opcional se pendente)"
                          value={newGradeValue}
                          onChange={(e) => setNewGradeValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-white dark:bg-[#1e1e1e] focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <input
                          type="number"
                          step="0.5"
                          min="0.1"
                          placeholder="Peso (Padrão 1)"
                          value={newGradeWeight}
                          onChange={(e) => setNewGradeWeight(e.target.value === '' ? '' : parseFloat(e.target.value))}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-white dark:bg-[#1e1e1e] focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-[#787774] dark:text-[#9b9a97]">Data:</span>
                        <input
                          type="date"
                          value={newGradeDate}
                          onChange={(e) => setNewGradeDate(e.target.value)}
                          className="px-2 py-1 text-xs rounded border border-[#e9e9e8] dark:border-[#333] bg-white dark:bg-[#1e1e1e]"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all text-xs flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar Nota</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 3: CONTEÚDO PROGRAMÁTICO (EMENTA) */}
              {activeModalTab === 'syllabus' && (
                <div className="space-y-4 text-xs md:text-sm">
                  {/* Barra de Progresso */}
                  {(() => {
                    const prog = calculateSyllabusProgress(editingCourse.syllabus);
                    return (
                      <div className="p-3 bg-[#f7f6f3] dark:bg-[#252525] rounded-xl border border-[#e9e9e8] dark:border-[#333] space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-[#37352f] dark:text-[#f3f3f2]">Progresso da Ementa</span>
                          <span className="font-mono text-blue-600 dark:text-blue-400 font-bold">
                            {prog.completed} de {prog.total} tópicos ({prog.percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-[#e9e9e8] dark:bg-[#333] h-2 rounded-full overflow-hidden">
                          <div
                            className="bg-blue-600 h-full rounded-full transition-all duration-300"
                            style={{ width: `${prog.percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Checklist de Tópicos */}
                  <div className="space-y-1.5">
                    {(editingCourse.syllabus || []).map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center justify-between p-2.5 rounded-lg border transition-all ${
                          item.completed
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40'
                            : 'bg-white dark:bg-[#1f1f1f] border-[#e9e9e8] dark:border-[#2f2f2f]'
                        }`}
                      >
                        <label className="flex items-center gap-2.5 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={() => handleToggleSyllabus(item.id)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                          />
                          <span
                            className={`text-xs ${
                              item.completed
                                ? 'line-through text-[#9b9a97] dark:text-stone-500'
                                : 'text-[#37352f] dark:text-[#f3f3f2] font-medium'
                            }`}
                          >
                            {item.title}
                          </span>
                        </label>
                        <button
                          onClick={() => handleDeleteSyllabus(item.id)}
                          className="p-1 text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded"
                          title="Excluir tópico"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {(editingCourse.syllabus || []).length === 0 && (
                      <div className="p-4 text-center border border-dashed border-[#e9e9e8] dark:border-[#333] rounded-xl text-stone-400 text-xs">
                        Nenhum tópico de ementa cadastrado. Adicione os módulos da matéria abaixo.
                      </div>
                    )}
                  </div>

                  {/* Formulário: Adicionar Novo Tópico */}
                  <form onSubmit={handleAddSyllabus} className="flex gap-2 pt-2">
                    <input
                      type="text"
                      placeholder="Ex: Unidade 3: Árvores Binárias e Grafos"
                      value={newSyllabusTitle}
                      onChange={(e) => setNewSyllabusTitle(e.target.value)}
                      className="flex-1 px-3 py-2 text-xs rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs flex items-center gap-1 shadow-sm transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar</span>
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 4: TAREFAS VINCULADAS */}
              {activeModalTab === 'tasks' && (
                <div className="space-y-3 text-xs md:text-sm">
                  {(() => {
                    const linkedTasks = tasks.filter((t) => t.courseId === editingCourse.id);
                    if (linkedTasks.length === 0) {
                      return (
                        <div className="p-6 text-center text-stone-400 border border-dashed border-[#e9e9e8] dark:border-[#333] rounded-xl text-xs">
                          Nenhuma tarefa do Kanban vinculada a esta matéria.
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-2">
                        {linkedTasks.map((t) => (
                          <div
                            key={t.id}
                            className="p-3 bg-white dark:bg-[#1f1f1f] border border-[#e9e9e8] dark:border-[#2f2f2f] rounded-lg flex items-center justify-between"
                          >
                            <div>
                              <div className="font-medium text-[#37352f] dark:text-[#f3f3f2]">{t.name}</div>
                              <div className="text-[11px] text-[#787774] dark:text-[#9b9a97] flex items-center gap-2 mt-0.5">
                                <span className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-[10px] font-medium">
                                  {t.type}
                                </span>
                                <span>Entrega: {formatDateBR(t.dueDate)}</span>
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                t.status === 'done'
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                  : t.status === 'in_progress'
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                              }`}
                            >
                              {t.status === 'done' ? 'Concluída' : t.status === 'in_progress' ? 'Em Progresso' : 'A Fazer'}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-[#faf9f6] dark:bg-[#252525] border-t border-[#e9e9e8] dark:border-[#2f2f2f] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  showConfirm({
                    title: 'Excluir Disciplina',
                    message: `Tem certeza que deseja excluir "${editingCourse.name}"? Esta ação removerá a disciplina da sua lista.`,
                    confirmText: 'Excluir',
                    danger: true,
                    onConfirm: () => {
                      onDeleteCourse(editingCourse.id);
                      setEditingCourse(null);
                      showToast('info', 'Disciplina Excluída', `"${editingCourse.name}" foi removida.`);
                    },
                  });
                }}
                className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Disciplina</span>
              </button>
              <button
                onClick={() => setEditingCourse(null)}
                className="px-4 py-2 bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 text-[#37352f] dark:text-white rounded-lg text-xs font-medium transition-all"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CRIAR NOVA DISCIPLINA */}
      {/* ========================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#202020] rounded-xl border border-[#e9e9e8] dark:border-[#2f2f2f] w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Adicionar Disciplina</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 hover:bg-stone-100 dark:hover:bg-stone-800 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs md:text-sm">
              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Nome da Matéria *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Algoritmos e Estruturas de Dados"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Código</label>
                  <input
                    type="text"
                    placeholder="MC322"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Cor</label>
                  <input
                    type="color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="w-full h-9 p-0.5 rounded border border-[#e9e9e8] dark:border-[#333] bg-transparent cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Professor(a)</label>
                <input
                  type="text"
                  placeholder="Ex: Prof. João Silva"
                  value={newProfessor}
                  onChange={(e) => setNewProfessor(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Dias e Horários</label>
                  <input
                    type="text"
                    placeholder="Ter / Qui 10h - 12h"
                    value={newSchedule}
                    onChange={(e) => setNewSchedule(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Sala ou Link</label>
                  <input
                    type="text"
                    placeholder="CB-02"
                    value={newRoomOrLink}
                    onChange={(e) => setNewRoomOrLink(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Semestre</label>
                  <select
                    value={newSemester}
                    onChange={(e) => setNewSemester(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500 text-xs md:text-sm"
                  >
                    <option value="1º Semestre" className="dark:bg-[#202020]">1º Semestre</option>
                    <option value="2º Semestre" className="dark:bg-[#202020]">2º Semestre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[#787774] dark:text-[#9b9a97] mb-1 font-medium">Ano</label>
                  <input
                    type="text"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#e9e9e8] dark:border-[#333] bg-transparent focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-[#e9e9e8] dark:border-[#333] rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-all font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all font-medium shadow-sm"
                >
                  Criar Disciplina
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
