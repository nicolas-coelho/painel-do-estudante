export interface GradeItem {
  id: string;
  name: string; // Ex: "P1", "P2", "Trabalho Final"
  grade: number; // Ex: 8.5
  maxGrade?: number; // Ex: 10
  weight?: number; // Ex: 1, 2 (peso)
  date?: string;
}

export interface SyllabusItem {
  id: string;
  title: string;
  completed: boolean;
  notes?: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  professor: string;
  schedule: string;
  roomOrLink: string;
  semester: string;
  year: string;
  inProgress: boolean;
  color: string;
  grades?: GradeItem[];
  syllabus?: SyllabusItem[];
  targetAverage?: number;
}

export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskType = 'Trabalho' | 'Prova' | 'Exercício' | 'Leitura' | 'Outro';

export interface Task {
  id: string;
  name: string;
  courseId: string;
  status: TaskStatus;
  type: TaskType;
  dueDate: string;
  notes?: string;
}

export type ReviewResult = 'Estudo' | 'Acerto' | 'Erro';

export interface ExerciseAttempt {
  id: string;
  date: string; // YYYY-MM-DD
  listTitle: string; // Ex: "Lista 1 - Fixação", "Simulado P1"
  totalExercises: number; // Ex: 10
  correctExercises: number; // Ex: 8
  scorePercentage: number; // Ex: 80.0
  passed: boolean; // scorePercentage >= target
  notes?: string;
}

export interface StudyTopic {
  id: string;
  name: string; // Nome do Assunto
  courseId: string;
  question?: string; // Flashcard opcional para revisão rápida
  answer?: string;
  stage: number; // 0: Fase 1 (1 sem), 1: Fase 2 (2 sem), 2: Fase 3 (4 sem), 3: Dominado
  adaptive?: boolean;
  lastReviewDate?: string;
  nextReviewDate: string;
  attempts?: ExerciseAttempt[]; // Histórico de listas resolvidas
  targetScore?: number; // Meta específica (padrão global ex: 80%)
}

export interface StudySession {
  id: string;
  title: string;
  courseId: string;
  topicId?: string;
  date: string;
  startTime?: string; // Ex: "14:30"
  endTime?: string; // Ex: "15:15"
  durationMinutes: number;
  completed: boolean;
  notes: string;
  result: ReviewResult;
}

export interface NotebookNote {
  id: string;
  title: string;
  tags: string[];
  createdAt: string;
  content: string;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// ==================== VIDA PESSOAL & FINANÇAS ====================

export type BillCategory =
  | 'moradia'
  | 'servicos'
  | 'educacao'
  | 'saude'
  | 'alimentacao'
  | 'transporte'
  | 'lazer'
  | 'outros';

export type BillStatus = 'pending' | 'paid';

export interface PersonalBill {
  id: string;
  title: string; // Ex: "Pagar a Luz", "Pagar Água", "Pagar o Inglês"
  amount: number; // Ex: 120.50
  dueDate: string; // YYYY-MM-DD
  category: BillCategory;
  status: BillStatus;
  paidAt?: string; // YYYY-MM-DD
  recurring?: 'none' | 'monthly' | 'yearly';
  notes?: string;
  barcodeOrLink?: string; // PIX, código de barras ou link
}

export type AppointmentCategory =
  | 'saude'
  | 'pessoal'
  | 'financeiro'
  | 'estudo'
  | 'outro';

export interface PersonalAppointment {
  id: string;
  title: string; // Ex: "Marcar Médico", "Dentista", "Autoescola", "Mercado"
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  location?: string;
  category: AppointmentCategory;
  completed: boolean;
  notes?: string;
  source?: 'manual' | 'calendar';
}

