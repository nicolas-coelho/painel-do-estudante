import React, { useState, useEffect, useRef } from 'react';
import { Course, Task, StudyTopic, StudySession, NotebookNote } from './types';
import {
  initialCourses,
  initialTasks,
  initialTopics,
  initialSessions,
  initialNotes,
} from './mockData';
import { Header } from './components/Header';
import { CoursesTab } from './components/CoursesTab';
import { TasksKanbanTab } from './components/TasksKanbanTab';
import { ActiveRecallTab } from './components/ActiveRecallTab';
import { PomodoroTimerTab } from './components/PomodoroTimerTab';
import { NotebookTab } from './components/NotebookTab';
import { CalendarTab } from './components/CalendarTab';
import { HomeTab } from './components/HomeTab';
import { FirebaseModal } from './components/FirebaseModal';
import { onUserChanged, saveToFirestore, subscribeToFirestore } from './firebase';
import { User } from 'firebase/auth';
import { BookOpen, CheckSquare, Brain, Clock, FileText, Calendar, LayoutDashboard } from 'lucide-react';

export const App: React.FC = () => {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('study_dashboard_dark') === 'true';
  });

  // Apply dark mode class to html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('study_dashboard_dark', String(darkMode));
  }, [darkMode]);

  // Main navigation tab
  const [activeTab, setActiveTab] = useState<
    'home' | 'courses' | 'tasks' | 'active_recall' | 'calendar' | 'timer' | 'notes'
  >('home');

  // Firebase auth & modal state
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);
  const isSyncingFromCloudRef = useRef(false);

  // Persistence helpers
  const loadState = <T,>(key: string, fallback: T): T => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : fallback;
    } catch {
      return fallback;
    }
  };

  const [courses, setCourses] = useState<Course[]>(() =>
    loadState('study_courses', initialCourses)
  );
  const [tasks, setTasks] = useState<Task[]>(() =>
    loadState('study_tasks', initialTasks)
  );
  const [topics, setTopics] = useState<StudyTopic[]>(() =>
    loadState('study_topics', initialTopics)
  );
  const [sessions, setSessions] = useState<StudySession[]>(() =>
    loadState('study_sessions', initialSessions)
  );
  const [notes, setNotes] = useState<NotebookNote[]>(() =>
    loadState('study_notes', initialNotes)
  );

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onUserChanged((user) => {
      setFirebaseUser(user);
    });
    return () => unsub();
  }, []);

  // Real-time Firestore sync listener (Conexão Direta Automática)
  useEffect(() => {
    const unsub = subscribeToFirestore('principal', (data) => {
      if (!data) return;
      isSyncingFromCloudRef.current = true;
      if (data.courses && Array.isArray(data.courses) && data.courses.length > 0) {
        setCourses(data.courses);
      }
      if (data.tasks && Array.isArray(data.tasks)) setTasks(data.tasks);
      if (data.topics && Array.isArray(data.topics)) setTopics(data.topics);
      if (data.sessions && Array.isArray(data.sessions)) setSessions(data.sessions);
      if (data.notes && Array.isArray(data.notes)) setNotes(data.notes);
      setTimeout(() => {
        isSyncingFromCloudRef.current = false;
      }, 500);
    });

    return () => unsub();
  }, []);

  // Sync with LocalStorage & Firestore (salva automaticamente na nuvem)
  useEffect(() => {
    localStorage.setItem('study_courses', JSON.stringify(courses));
    if (!isSyncingFromCloudRef.current) {
      saveToFirestore('principal', { courses });
      if (firebaseUser) saveToFirestore(firebaseUser.uid, { courses });
    }
  }, [courses, firebaseUser]);

  useEffect(() => {
    localStorage.setItem('study_tasks', JSON.stringify(tasks));
    if (!isSyncingFromCloudRef.current) {
      saveToFirestore('principal', { tasks });
      if (firebaseUser) saveToFirestore(firebaseUser.uid, { tasks });
    }
  }, [tasks, firebaseUser]);

  useEffect(() => {
    localStorage.setItem('study_topics', JSON.stringify(topics));
    if (!isSyncingFromCloudRef.current) {
      saveToFirestore('principal', { topics });
      if (firebaseUser) saveToFirestore(firebaseUser.uid, { topics });
    }
  }, [topics, firebaseUser]);

  useEffect(() => {
    localStorage.setItem('study_sessions', JSON.stringify(sessions));
    if (!isSyncingFromCloudRef.current) {
      saveToFirestore('principal', { sessions });
      if (firebaseUser) saveToFirestore(firebaseUser.uid, { sessions });
    }
  }, [sessions, firebaseUser]);

  useEffect(() => {
    localStorage.setItem('study_notes', JSON.stringify(notes));
    if (!isSyncingFromCloudRef.current) {
      saveToFirestore('principal', { notes });
      if (firebaseUser) saveToFirestore(firebaseUser.uid, { notes });
    }
  }, [notes, firebaseUser]);

  // Quick stats
  const todayStr = new Date().toISOString().split('T')[0];
  const activeCoursesCount = courses.filter((c) => c.inProgress).length;
  const pendingTasksCount = tasks.filter((t) => t.status !== 'done').length;
  const todayDeliveriesCount = tasks.filter((t) => t.dueDate === todayStr && t.status !== 'done').length;
  const dueReviewsCount = topics.filter((t) => t.nextReviewDate <= todayStr).length;
  const studiedMinutesToday = sessions
    .filter((s) => s.date === todayStr)
    .reduce((acc, curr) => acc + curr.durationMinutes, 0);

  // Backup & Restore
  const handleExportData = () => {
    const data = { courses, tasks, topics, sessions, notes, version: 1 };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `painel-do-estudante-backup-${todayStr}.json`;
    a.click();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.courses) setCourses(parsed.courses);
        if (parsed.tasks) setTasks(parsed.tasks);
        if (parsed.topics) setTopics(parsed.topics);
        if (parsed.sessions) setSessions(parsed.sessions);
        if (parsed.notes) setNotes(parsed.notes);
        alert('✅ Dados restaurados com sucesso!');
      } catch {
        alert('❌ Erro ao ler arquivo de backup.');
      }
    };
    reader.readAsText(file);
  };

  // Nav Tabs configuration
  const tabs = [
    {
      id: 'home',
      label: 'Página Inicial',
      icon: LayoutDashboard,
      count: todayDeliveriesCount > 0 ? todayDeliveriesCount : undefined,
      highlight: todayDeliveriesCount > 0,
    },
    {
      id: 'courses',
      label: 'Disciplinas',
      icon: BookOpen,
      count: activeCoursesCount,
    },
    {
      id: 'tasks',
      label: 'Quadro de Tarefas',
      icon: CheckSquare,
      count: pendingTasksCount,
    },
    {
      id: 'calendar',
      label: 'Google Calendar',
      icon: Calendar,
    },
    {
      id: 'active_recall',
      label: 'Recuperação Ativa & Revisões',
      icon: Brain,
      count: dueReviewsCount > 0 ? dueReviewsCount : undefined,
      highlight: dueReviewsCount > 0,
    },
    {
      id: 'timer',
      label: 'Foco & Pomodoro',
      icon: Clock,
    },
    {
      id: 'notes',
      label: 'Anotações & Dicas',
      icon: FileText,
      count: notes.length,
    },
  ];

  return (
    <div className="min-h-screen bg-[#fcfbf9] dark:bg-[#191919] text-[#37352f] dark:text-[#d4d4d4] transition-colors pb-16">
      {/* Notion Header Banner */}
      <Header
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        stats={{
          activeCourses: activeCoursesCount,
          pendingTasks: pendingTasksCount,
          dueReviews: dueReviewsCount,
          studiedMinutesToday,
        }}
        onExportData={handleExportData}
        onImportData={handleImportData}
        onOpenFirebaseModal={() => setIsFirebaseModalOpen(true)}
        firebaseUser={firebaseUser}
      />

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 mt-6">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1 border-b border-[#e9e9e8] dark:border-[#2f2f2f] mb-6 overflow-x-auto pb-1 text-xs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-lg font-medium transition-all shrink-0 border-b-2 ${
                  isActive
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white/70 dark:bg-[#202020]'
                    : 'border-transparent text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f] dark:hover:text-white hover:bg-stone-100/50 dark:hover:bg-stone-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      tab.highlight
                        ? 'bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300'
                        : 'bg-[#efeeea] dark:bg-[#2d2d2d] text-[#787774] dark:text-[#9b9a97]'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Views */}
        {activeTab === 'home' && (
          <HomeTab
            courses={courses}
            tasks={tasks}
            darkMode={darkMode}
            onAddTask={(newT) => setTasks([...tasks, newT])}
            onUpdateTask={(updT) =>
              setTasks(tasks.map((t) => (t.id === updT.id ? updT : t)))
            }
            onDeleteTask={(id) => setTasks(tasks.filter((t) => t.id !== id))}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
          />
        )}

        {activeTab === 'courses' && (
          <CoursesTab
            courses={courses}
            tasks={tasks}
            onAddCourse={(newC) => setCourses([...courses, newC])}
            onUpdateCourse={(updC) =>
              setCourses(courses.map((c) => (c.id === updC.id ? updC : c)))
            }
            onDeleteCourse={(id) => setCourses(courses.filter((c) => c.id !== id))}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksKanbanTab
            tasks={tasks}
            courses={courses}
            onAddTask={(newT) => setTasks([...tasks, newT])}
            onUpdateTask={(updT) =>
              setTasks(tasks.map((t) => (t.id === updT.id ? updT : t)))
            }
            onDeleteTask={(id) => setTasks(tasks.filter((t) => t.id !== id))}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarTab courses={courses} tasks={tasks} darkMode={darkMode} />
        )}

        {activeTab === 'active_recall' && (
          <ActiveRecallTab
            topics={topics}
            courses={courses}
            onAddTopic={(newTop) => setTopics([...topics, newTop])}
            onUpdateTopic={(updTop) =>
              setTopics(topics.map((t) => (t.id === updTop.id ? updTop : t)))
            }
            onDeleteTopic={(id) => setTopics(topics.filter((t) => t.id !== id))}
          />
        )}

        {activeTab === 'timer' && (
          <PomodoroTimerTab
            sessions={sessions}
            courses={courses}
            onAddSession={(newS) => setSessions([newS, ...sessions])}
            onDeleteSession={(id) => setSessions(sessions.filter((s) => s.id !== id))}
          />
        )}

        {activeTab === 'notes' && (
          <NotebookTab
            notes={notes}
            onAddNote={(newN) => setNotes([newN, ...notes])}
            onDeleteNote={(id) => setNotes(notes.filter((n) => n.id !== id))}
          />
        )}
      </main>

      {/* Firebase Sync & Settings Modal */}
      <FirebaseModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
        dashboardData={{ courses, tasks, topics, sessions, notes }}
      />
    </div>
  );
};

export default App;
