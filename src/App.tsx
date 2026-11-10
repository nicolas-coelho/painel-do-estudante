import React, { useState, useEffect } from 'react';
import {
  Course,
  Task,
  StudyTopic,
  StudySession,
  NotebookNote,
  PersonalBill,
  PersonalAppointment,
} from './types';
import {
  initialCourses,
  initialTasks,
  initialTopics,
  initialSessions,
  initialNotes,
  initialPersonalBills,
  initialPersonalAppointments,
} from './mockData';
import { Header } from './components/Header';
import { CoursesTab } from './components/CoursesTab';
import { TasksKanbanTab } from './components/TasksKanbanTab';
import { ActiveRecallTab } from './components/ActiveRecallTab';
import { PomodoroTimerTab } from './components/PomodoroTimerTab';
import { NotebookTab } from './components/NotebookTab';
import { CalendarTab } from './components/CalendarTab';
import { HomeTab } from './components/HomeTab';
import { PersonalLifeTab } from './components/PersonalLifeTab';
import { FirebaseModal } from './components/FirebaseModal';
import { LoginScreen } from './components/LoginScreen';
import { onUserChanged, saveToFirestore, subscribeToFirestore, logoutFirebase, isEmailAllowed } from './firebase';
import { fetchGoogleCalendarEvents, GoogleCalendarEvent } from './googleCalendar';
import { User } from 'firebase/auth';
import {
  BookOpen,
  CheckSquare,
  Brain,
  Clock,
  FileText,
  Calendar,
  LayoutDashboard,
  Wallet,
} from 'lucide-react';
import { useNotification } from './context/NotificationContext';

export const App: React.FC = () => {
  const { showToast } = useNotification();

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
    'home' | 'courses' | 'tasks' | 'personal' | 'calendar' | 'active_recall' | 'timer' | 'notes'
  >('home');

  // Firebase auth & modal state
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [isFirebaseModalOpen, setIsFirebaseModalOpen] = useState(false);

  // Persistence helpers com isolamento por usuário (multi-tenant)
  const getUserStorageKey = (key: string, customUid?: string) => {
    const uid = customUid || firebaseUser?.uid || 'guest';
    return `study_${uid}_${key}`;
  };

  const saveUserState = (key: string, data: any, customUid?: string) => {
    try {
      localStorage.setItem(getUserStorageKey(key, customUid), JSON.stringify(data));
    } catch (e) {
      console.warn('Falha ao salvar no localStorage:', e);
    }
  };

  const loadUserState = <T,>(key: string, fallback: T, customUid?: string): T => {
    try {
      const saved = localStorage.getItem(getUserStorageKey(key, customUid));
      return saved ? JSON.parse(saved) : fallback;
    } catch {
      return fallback;
    }
  };

  const [courses, setCourses] = useState<Course[]>(() =>
    loadUserState('courses', initialCourses)
  );
  const [tasks, setTasks] = useState<Task[]>(() =>
    loadUserState('tasks', initialTasks)
  );
  const [topics, setTopics] = useState<StudyTopic[]>(() =>
    loadUserState('topics', initialTopics)
  );
  const [sessions, setSessions] = useState<StudySession[]>(() =>
    loadUserState('sessions', initialSessions)
  );
  const [notes, setNotes] = useState<NotebookNote[]>(() =>
    loadUserState('notes', initialNotes)
  );
  const [personalBills, setPersonalBills] = useState<PersonalBill[]>(() =>
    loadUserState('personalBills', initialPersonalBills)
  );
  const [personalAppointments, setPersonalAppointments] = useState<PersonalAppointment[]>(() =>
    loadUserState('personalAppointments', initialPersonalAppointments)
  );
  const [calendarId, setCalendarId] = useState<string>(() =>
    loadUserState('calendarId', '')
  );
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);

  // Helper para salvar na nuvem de forma estritamente isolada por usuário
  const syncEntityToCloud = (key: string, data: any) => {
    const targetDoc = firebaseUser ? firebaseUser.uid : 'principal';
    saveToFirestore(targetDoc, { [key]: data });
  };

  // Handlers para Tópicos de Estudo (Active Recall & Revisões)
  const handleAddTopic = (newTopic: StudyTopic) => {
    const updated = [...topics, newTopic];
    setTopics(updated);
    saveUserState('topics', updated);
    syncEntityToCloud('topics', updated);
  };

  const handleUpdateTopic = (updatedTopic: StudyTopic) => {
    const updated = topics.map((t) => (t.id === updatedTopic.id ? updatedTopic : t));
    setTopics(updated);
    saveUserState('topics', updated);
    syncEntityToCloud('topics', updated);
  };

  const handleDeleteTopic = (id: string) => {
    const updated = topics.filter((t) => t.id !== id);
    setTopics(updated);
    saveUserState('topics', updated);
    syncEntityToCloud('topics', updated);
  };

  // Handlers para Disciplinas
  const handleAddCourse = (newCourse: Course) => {
    const updated = [...courses, newCourse];
    setCourses(updated);
    saveUserState('courses', updated);
    syncEntityToCloud('courses', updated);
  };

  const handleUpdateCourse = (updatedCourse: Course) => {
    const updated = courses.map((c) => (c.id === updatedCourse.id ? updatedCourse : c));
    setCourses(updated);
    saveUserState('courses', updated);
    syncEntityToCloud('courses', updated);
  };

  const handleDeleteCourse = (id: string) => {
    const updated = courses.filter((c) => c.id !== id);
    setCourses(updated);
    saveUserState('courses', updated);
    syncEntityToCloud('courses', updated);
  };

  // Handlers para Tarefas
  const handleAddTask = (newTask: Task) => {
    const updated = [...tasks, newTask];
    setTasks(updated);
    saveUserState('tasks', updated);
    syncEntityToCloud('tasks', updated);
  };

  const handleUpdateTask = (updatedTask: Task) => {
    const updated = tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
    setTasks(updated);
    saveUserState('tasks', updated);
    syncEntityToCloud('tasks', updated);
  };

  const handleDeleteTask = (id: string) => {
    const updated = tasks.filter((t) => t.id !== id);
    setTasks(updated);
    saveUserState('tasks', updated);
    syncEntityToCloud('tasks', updated);
  };

  // Handlers para Sessões de Estudo (Pomodoro)
  const handleAddSession = (newSession: StudySession) => {
    const updated = [newSession, ...sessions];
    setSessions(updated);
    saveUserState('sessions', updated);
    syncEntityToCloud('sessions', updated);
  };

  const handleDeleteSession = (id: string) => {
    const updated = sessions.filter((s) => s.id !== id);
    setSessions(updated);
    saveUserState('sessions', updated);
    syncEntityToCloud('sessions', updated);
  };

  // Handlers para Anotações (Notebook)
  const handleAddNote = (newNote: NotebookNote) => {
    const updated = [newNote, ...notes];
    setNotes(updated);
    saveUserState('notes', updated);
    syncEntityToCloud('notes', updated);
  };

  const handleDeleteNote = (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    saveUserState('notes', updated);
    syncEntityToCloud('notes', updated);
  };

  // Handler para Google Calendar ID
  const handleUpdateCalendarId = (newId: string) => {
    setCalendarId(newId);
    saveUserState('calendarId', newId);
    syncEntityToCloud('calendarId', newId);
  };

  // Handlers para Vida Pessoal & Finanças (Contas a Pagar)
  const handleAddBill = (newBill: PersonalBill) => {
    const updated = [...personalBills, newBill];
    setPersonalBills(updated);
    saveUserState('personalBills', updated);
    syncEntityToCloud('personalBills', updated);
  };

  const handleUpdateBill = (updatedBill: PersonalBill) => {
    const updated = personalBills.map((b) => (b.id === updatedBill.id ? updatedBill : b));
    setPersonalBills(updated);
    saveUserState('personalBills', updated);
    syncEntityToCloud('personalBills', updated);
  };

  const handleDeleteBill = (id: string) => {
    const updated = personalBills.filter((b) => b.id !== id);
    setPersonalBills(updated);
    saveUserState('personalBills', updated);
    syncEntityToCloud('personalBills', updated);
  };

  // Handlers para Compromissos Pessoais & Rotina
  const handleAddAppointment = (newApp: PersonalAppointment) => {
    const updated = [...personalAppointments, newApp];
    setPersonalAppointments(updated);
    saveUserState('personalAppointments', updated);
    syncEntityToCloud('personalAppointments', updated);
  };

  const handleUpdateAppointment = (updatedApp: PersonalAppointment) => {
    const updated = personalAppointments.map((a) => (a.id === updatedApp.id ? updatedApp : a));
    setPersonalAppointments(updated);
    saveUserState('personalAppointments', updated);
    syncEntityToCloud('personalAppointments', updated);
  };

  const handleDeleteAppointment = (id: string) => {
    const updated = personalAppointments.filter((a) => a.id !== id);
    setPersonalAppointments(updated);
    saveUserState('personalAppointments', updated);
    syncEntityToCloud('personalAppointments', updated);
  };

  // Carrega eventos da Google Agenda em segundo plano para detecção inteligente
  useEffect(() => {
    let isMounted = true;
    fetchGoogleCalendarEvents(null, undefined, undefined, calendarId)
      .then((evs) => {
        if (isMounted && evs.length > 0) setGoogleEvents(evs);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [calendarId]);

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsub = onUserChanged((user) => {
      setFirebaseUser(user);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  // Real-time Firestore sync listener: sincroniza exclusivamente com o UID autenticado (isolamento por usuário)
  useEffect(() => {
    if (!firebaseUser) return;
    const docId = firebaseUser.uid;

    // Carrega o cache local específico deste usuário imediatamente ao alternar/conectar
    const userCourses = loadUserState<Course[]>('courses', [], docId);
    if (userCourses.length > 0) setCourses(userCourses);
    const userTasks = loadUserState<Task[]>('tasks', [], docId);
    if (userTasks.length > 0) setTasks(userTasks);
    const userTopics = loadUserState<StudyTopic[]>('topics', [], docId);
    if (userTopics.length > 0) setTopics(userTopics);
    const userSessions = loadUserState<StudySession[]>('sessions', [], docId);
    if (userSessions.length > 0) setSessions(userSessions);
    const userNotes = loadUserState<NotebookNote[]>('notes', [], docId);
    if (userNotes.length > 0) setNotes(userNotes);
    const userBills = loadUserState<PersonalBill[]>('personalBills', [], docId);
    if (userBills.length > 0) setPersonalBills(userBills);
    const userApps = loadUserState<PersonalAppointment[]>('personalAppointments', [], docId);
    if (userApps.length > 0) setPersonalAppointments(userApps);
    const userCal = loadUserState<string>('calendarId', firebaseUser.email || '', docId);
    if (userCal) setCalendarId(userCal);

    const unsub = subscribeToFirestore(docId, (data, metadata) => {
      // Ignora evento disparado pelas nossas próprias alterações em andamento locais
      if (metadata?.hasPendingWrites) return;

      if (!data) {
        // Novo estudante detectado! Inicializa o dashboard deste estudante com o perfil e template isolado
        const initialDashboard = {
          userEmail: firebaseUser.email || '',
          displayName: firebaseUser.displayName || '',
          courses: initialCourses,
          tasks: initialTasks,
          topics: initialTopics,
          sessions: initialSessions,
          notes: initialNotes,
          personalBills: initialPersonalBills,
          personalAppointments: initialPersonalAppointments,
          calendarId: firebaseUser.email || '',
          createdAt: new Date().toISOString(),
        };
        saveToFirestore(docId, initialDashboard);
        setCourses(initialCourses);
        setTasks(initialTasks);
        setTopics(initialTopics);
        setSessions(initialSessions);
        setNotes(initialNotes);
        setPersonalBills(initialPersonalBills);
        setPersonalAppointments(initialPersonalAppointments);
        setCalendarId(firebaseUser.email || '');
        return;
      }

      if (Array.isArray(data.courses)) {
        setCourses(data.courses);
        saveUserState('courses', data.courses, docId);
      }
      if (Array.isArray(data.tasks)) {
        setTasks(data.tasks);
        saveUserState('tasks', data.tasks, docId);
      }
      if (Array.isArray(data.topics)) {
        setTopics(data.topics);
        saveUserState('topics', data.topics, docId);
      }
      if (Array.isArray(data.sessions)) {
        setSessions(data.sessions);
        saveUserState('sessions', data.sessions, docId);
      }
      if (Array.isArray(data.notes)) {
        setNotes(data.notes);
        saveUserState('notes', data.notes, docId);
      }
      if (Array.isArray(data.personalBills)) {
        setPersonalBills(data.personalBills);
        saveUserState('personalBills', data.personalBills, docId);
      }
      if (Array.isArray(data.personalAppointments)) {
        setPersonalAppointments(data.personalAppointments);
        saveUserState('personalAppointments', data.personalAppointments, docId);
      }
      if (typeof data.calendarId === 'string') {
        setCalendarId(data.calendarId);
        saveUserState('calendarId', data.calendarId, docId);
      }
    });

    return () => unsub();
  }, [firebaseUser]);

  // Captura e importa dados vindos de links gerados pelo Gemini / Gmail
  const hasProcessedUrlRef = React.useRef(false);
  useEffect(() => {
    if (authLoading) return;
    if (hasProcessedUrlRef.current) return;

    const urlParams = new URLSearchParams(window.location.search);
    const action =
      urlParams.get('action') ||
      (urlParams.get('add_bill')
        ? 'add_bill'
        : urlParams.get('add_task')
        ? 'add_task'
        : urlParams.get('add_appointment')
        ? 'add_appointment'
        : null);

    if (!action) return;
    hasProcessedUrlRef.current = true;

    if (action === 'add_bill') {
      const title = urlParams.get('title') || 'Nova Conta';
      const amountStr = urlParams.get('amount') || '0';
      const amount = parseFloat(amountStr.replace(',', '.')) || 0;
      const dueDate =
        urlParams.get('dueDate') ||
        urlParams.get('due') ||
        new Date().toISOString().split('T')[0];
      const category = (urlParams.get('category') as any) || 'servicos';
      const barcodeOrLink =
        urlParams.get('barcode') || urlParams.get('link') || '';
      const notes = urlParams.get('notes') || 'Adicionado via Gemini / Gmail';

      const newBill: PersonalBill = {
        id: `bill-${Date.now()}`,
        title,
        amount,
        dueDate,
        category,
        status: 'pending',
        barcodeOrLink,
        notes,
      };

      handleAddBill(newBill);
      setActiveTab('personal');
      showToast(
        'success',
        'Conta importada do Gemini!',
        `"${title}" (R$ ${amount.toFixed(2)}) foi adicionada com sucesso.`
      );
    } else if (action === 'add_task') {
      const name = urlParams.get('title') || urlParams.get('name') || 'Nova Tarefa';
      const courseId =
        urlParams.get('courseId') || courses[0]?.id || 'geral';
      const dueDate =
        urlParams.get('dueDate') ||
        urlParams.get('date') ||
        new Date().toISOString().split('T')[0];
      const type = (urlParams.get('type') as any) || 'Trabalho';
      const notes = urlParams.get('notes') || 'Adicionado via Gemini / Gmail';

      const newTask: Task = {
        id: `task-${Date.now()}`,
        name,
        courseId,
        dueDate,
        type,
        status: 'todo',
        notes,
      };

      handleAddTask(newTask);
      setActiveTab('tasks');
      showToast(
        'success',
        'Tarefa importada do Gemini!',
        `"${name}" foi adicionada ao seu quadro de tarefas.`
      );
    } else if (action === 'add_appointment') {
      const title = urlParams.get('title') || 'Novo Compromisso';
      const date =
        urlParams.get('date') || new Date().toISOString().split('T')[0];
      const time = urlParams.get('time') || '';
      const location = urlParams.get('location') || '';
      const notes = urlParams.get('notes') || 'Adicionado via Gemini / Gmail';

      const newApp: PersonalAppointment = {
        id: `app-${Date.now()}`,
        title,
        date,
        time,
        location,
        category: 'pessoal',
        completed: false,
        notes,
      };

      handleAddAppointment(newApp);
      setActiveTab('personal');
      showToast(
        'success',
        'Compromisso importado do Gemini!',
        `"${title}" foi adicionado aos seus compromissos.`
      );
    }

    // Limpa a URL para evitar reimportar ao recarregar a página
    window.history.replaceState({}, document.title, window.location.pathname);
  }, [authLoading, courses]);

  // Quick stats
  const todayStr = new Date().toISOString().split('T')[0];
  const activeCoursesCount = courses.filter((c) => c.inProgress).length;
  const pendingTasksCount = tasks.filter((t) => t.status !== 'done').length;
  const todayDeliveriesCount = tasks.filter((t) => t.dueDate === todayStr && t.status !== 'done').length;
  const dueReviewsCount = topics.filter((t) => t.nextReviewDate <= todayStr).length;
  const studiedMinutesToday = sessions
    .filter((s) => s.date === todayStr)
    .reduce((acc, curr) => acc + curr.durationMinutes, 0);

  const pendingBillsCount = personalBills.filter((b) => b.status === 'pending').length;
  const overdueBillsCount = personalBills.filter(
    (b) => b.status === 'pending' && b.dueDate < todayStr
  ).length;

  // Backup & Restore
  const handleExportData = () => {
    const data = {
      courses,
      tasks,
      topics,
      sessions,
      notes,
      personalBills,
      personalAppointments,
      version: 2,
    };
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
        if (Array.isArray(parsed.courses)) {
          setCourses(parsed.courses);
          saveUserState('courses', parsed.courses);
          syncEntityToCloud('courses', parsed.courses);
        }
        if (Array.isArray(parsed.tasks)) {
          setTasks(parsed.tasks);
          saveUserState('tasks', parsed.tasks);
          syncEntityToCloud('tasks', parsed.tasks);
        }
        if (Array.isArray(parsed.topics)) {
          setTopics(parsed.topics);
          saveUserState('topics', parsed.topics);
          syncEntityToCloud('topics', parsed.topics);
        }
        if (Array.isArray(parsed.sessions)) {
          setSessions(parsed.sessions);
          saveUserState('sessions', parsed.sessions);
          syncEntityToCloud('sessions', parsed.sessions);
        }
        if (Array.isArray(parsed.notes)) {
          setNotes(parsed.notes);
          saveUserState('notes', parsed.notes);
          syncEntityToCloud('notes', parsed.notes);
        }
        if (Array.isArray(parsed.personalBills)) {
          setPersonalBills(parsed.personalBills);
          saveUserState('personalBills', parsed.personalBills);
          syncEntityToCloud('personalBills', parsed.personalBills);
        }
        if (Array.isArray(parsed.personalAppointments)) {
          setPersonalAppointments(parsed.personalAppointments);
          saveUserState('personalAppointments', parsed.personalAppointments);
          syncEntityToCloud('personalAppointments', parsed.personalAppointments);
        }
        showToast('success', 'Backup Restaurado!', 'Todos os seus dados foram restaurados e sincronizados com a nuvem.');
      } catch {
        showToast('error', 'Falha na Restauração', 'Não foi possível ler o arquivo de backup selecionado.');
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
      count: courses.length > 0 ? courses.length : undefined,
    },
    {
      id: 'tasks',
      label: 'Quadro de Tarefas',
      icon: CheckSquare,
      count: pendingTasksCount,
    },
    {
      id: 'personal',
      label: 'Vida Pessoal & Finanças',
      icon: Wallet,
      count: overdueBillsCount > 0 ? overdueBillsCount : (pendingBillsCount > 0 ? pendingBillsCount : undefined),
      highlight: overdueBillsCount > 0,
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

  // Tela de Carregamento enquanto valida a sessão Firebase
  if (authLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#fbfbfa] dark:bg-[#191919] text-[#37352f] dark:text-[#ececed]">
        <div className="w-16 h-16 bg-white dark:bg-[#202020] border border-[#e9e9e8] dark:border-[#333333] rounded-2xl shadow-sm flex items-center justify-center text-3xl mb-4 select-none animate-pulse">
          📚
        </div>
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Se não estiver logado ou se o e-mail não estiver na whitelist, exibe a Tela de Login
  if (!firebaseUser || !isEmailAllowed(firebaseUser.email)) {
    return (
      <LoginScreen
        currentUser={firebaseUser}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
    );
  }

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
        onLogout={logoutFirebase}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl 2xl:max-w-[1560px] mx-auto px-4 md:px-8 xl:px-10 mt-6">
        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1.5 md:gap-2 border-b border-[#e9e9e8] dark:border-[#2f2f2f] mb-6 overflow-x-auto pb-1 text-xs md:text-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-3.5 md:px-4 py-2.5 md:py-3 rounded-t-lg font-medium transition-all shrink-0 border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white/80 dark:bg-[#202020] shadow-sm font-semibold'
                    : 'border-transparent text-[#787774] dark:text-[#9b9a97] hover:text-[#37352f] dark:hover:text-white hover:bg-stone-100/60 dark:hover:bg-stone-800/60'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
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
            calendarId={calendarId}
            personalBills={personalBills}
            personalAppointments={personalAppointments}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
            onNavigateTab={(tab) => setActiveTab(tab as any)}
          />
        )}

        {activeTab === 'courses' && (
          <CoursesTab
            courses={courses}
            tasks={tasks}
            onAddCourse={handleAddCourse}
            onUpdateCourse={handleUpdateCourse}
            onDeleteCourse={handleDeleteCourse}
          />
        )}

        {activeTab === 'tasks' && (
          <TasksKanbanTab
            tasks={tasks}
            courses={courses}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {activeTab === 'personal' && (
          <PersonalLifeTab
            bills={personalBills}
            appointments={personalAppointments}
            googleEvents={googleEvents}
            darkMode={darkMode}
            onAddBill={handleAddBill}
            onUpdateBill={handleUpdateBill}
            onDeleteBill={handleDeleteBill}
            onAddAppointment={handleAddAppointment}
            onUpdateAppointment={handleUpdateAppointment}
            onDeleteAppointment={handleDeleteAppointment}
          />
        )}

        {activeTab === 'calendar' && (
          <CalendarTab
            courses={courses}
            tasks={tasks}
            darkMode={darkMode}
            calendarId={calendarId}
            onUpdateCalendarId={handleUpdateCalendarId}
          />
        )}

        {activeTab === 'active_recall' && (
          <ActiveRecallTab
            topics={topics}
            courses={courses}
            onAddTopic={handleAddTopic}
            onUpdateTopic={handleUpdateTopic}
            onDeleteTopic={handleDeleteTopic}
          />
        )}

        {activeTab === 'timer' && (
          <PomodoroTimerTab
            sessions={sessions}
            courses={courses}
            onAddSession={handleAddSession}
            onDeleteSession={handleDeleteSession}
          />
        )}

        {activeTab === 'notes' && (
          <NotebookTab
            notes={notes}
            onAddNote={handleAddNote}
            onDeleteNote={handleDeleteNote}
          />
        )}
      </main>

      {/* Firebase Sync & Settings Modal */}
      <FirebaseModal
        isOpen={isFirebaseModalOpen}
        onClose={() => setIsFirebaseModalOpen(false)}
        dashboardData={{
          courses,
          tasks,
          topics,
          sessions,
          notes,
          personalBills,
          personalAppointments,
        }}
      />
    </div>
  );
};

export default App;
