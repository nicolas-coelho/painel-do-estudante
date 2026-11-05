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

export interface StudyTopic {
  id: string;
  name: string;
  courseId: string;
  question: string;
  answer: string;
  stage: number; // 0: 1d, 1: 3d, 2: 7d, 3: 14d, 4: 30d, 5: concluído
  adaptive: boolean;
  lastReviewDate?: string;
  nextReviewDate: string;
}

export interface StudySession {
  id: string;
  title: string;
  courseId: string;
  topicId?: string;
  date: string;
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
