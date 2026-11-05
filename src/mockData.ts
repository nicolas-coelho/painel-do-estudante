import { Course, Task, StudyTopic, StudySession, NotebookNote } from './types';

export const initialCourses: Course[] = [
  {
    id: 'course-1',
    code: 'MC322',
    name: 'Programação Orientada a Objetos',
    professor: 'Prof. André Santanchè',
    schedule: 'Ter / Qui 10:00 - 12:00',
    roomOrLink: 'CB-02 / Google Meet',
    semester: '1º Semestre',
    year: '2026',
    inProgress: true,
    color: '#3b82f6',
  },
  {
    id: 'course-2',
    code: 'ES680',
    name: 'Engenharia de Software',
    professor: 'Profa. Cecília Baranauskas',
    schedule: 'Seg / Qua 14:00 - 16:00',
    roomOrLink: 'IC-301',
    semester: '1º Semestre',
    year: '2026',
    inProgress: true,
    color: '#10b981',
  },
  {
    id: 'course-3',
    code: 'MA111',
    name: 'Cálculo Diferencial e Integral I',
    professor: 'Prof. Marcos Eduardo',
    schedule: 'Ter / Qui 08:00 - 10:00',
    roomOrLink: 'CB-05',
    semester: '1º Semestre',
    year: '2026',
    inProgress: true,
    color: '#f59e0b',
  },
  {
    id: 'course-4',
    code: 'F107',
    name: 'Física Geral I',
    professor: 'Prof. Newton Silva',
    schedule: 'Sex 10:00 - 12:00',
    roomOrLink: 'IFGW Auditório',
    semester: '1º Semestre',
    year: '2026',
    inProgress: false,
    color: '#8b5cf6',
  },
];

const today = new Date().toISOString().split('T')[0];
const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
const inThreeDays = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0];

export const initialTasks: Task[] = [
  {
    id: 'task-1',
    name: 'Implementar Diagrama UML e Padrão Strategy',
    courseId: 'course-1',
    status: 'in_progress',
    type: 'Trabalho',
    dueDate: tomorrow,
    notes: 'Entregar relatório com testes unitários em Java.',
  },
  {
    id: 'task-2',
    name: 'Estudo dirigido: Requisitos Funcionais e Não-Funcionais',
    courseId: 'course-2',
    status: 'todo',
    type: 'Exercício',
    dueDate: inThreeDays,
    notes: 'Capítulo 4 do livro do Sommerville.',
  },
  {
    id: 'task-3',
    name: 'Lista de Exercícios: Regra da Cadeia e Derivadas Implícitas',
    courseId: 'course-3',
    status: 'todo',
    type: 'Exercício',
    dueDate: today,
    notes: 'Resolver exercícios ímpares da seção 3.5.',
  },
  {
    id: 'task-4',
    name: 'Revisão P1 - Polimorfismo e Herança',
    courseId: 'course-1',
    status: 'done',
    type: 'Prova',
    dueDate: '2026-11-01',
    notes: 'Revisados flashcards e exercícios anteriores.',
  },
];

export const initialTopics: StudyTopic[] = [
  {
    id: 'topic-1',
    name: 'Polimorfismo vs Sobrecarga de Métodos',
    courseId: 'course-1',
    question: 'Qual a diferença entre Override (sobreposição) e Overload (sobrecarga)?',
    answer: 'Override: redefinição de método na subclasse mantendo mesma assinatura (@Override em tempo de execução). Overload: mesmo nome na mesma classe com parâmetros diferentes (resolvido em tempo de compilação).',
    stage: 1, // 3 dias
    adaptive: true,
    lastReviewDate: '2026-11-02',
    nextReviewDate: today,
  },
  {
    id: 'topic-2',
    name: 'Princípios SOLID: Single Responsibility',
    courseId: 'course-2',
    question: 'O que preconiza o princípio da Responsabilidade Única (SRP)?',
    answer: 'Uma classe deve ter um, e apenas um, motivo para mudar, significando que ela deve ser responsável por apenas uma parte da funcionalidade do software.',
    stage: 0, // 1 dia
    adaptive: true,
    lastReviewDate: '2026-11-04',
    nextReviewDate: today,
  },
  {
    id: 'topic-3',
    name: 'Teorema Fundamental do Cálculo',
    courseId: 'course-3',
    question: 'Como o Teorema Fundamental do Cálculo conecta diferenciação e integração?',
    answer: 'Estabelece que a diferenciação e a integração são operações inversas: se f for contínua em [a,b], então a integral definida de f pode ser calculada através de sua primitiva F(b) - F(a).',
    stage: 2, // 7 dias
    adaptive: true,
    lastReviewDate: '2026-10-30',
    nextReviewDate: inThreeDays,
  },
];

export const initialSessions: StudySession[] = [
  {
    id: 'session-1',
    title: 'Estudo Padrões de Projeto GoF',
    courseId: 'course-1',
    topicId: 'topic-1',
    date: '2026-11-04',
    durationMinutes: 45,
    completed: true,
    notes: 'Foco no padrão Strategy e Factory Method. Exercícios práticos.',
    result: 'Acerto',
  },
  {
    id: 'session-2',
    title: 'Resolução de integrais por partes',
    courseId: 'course-3',
    topicId: 'topic-3',
    date: '2026-11-03',
    durationMinutes: 60,
    completed: true,
    notes: 'Dúvidas em integrais circulares com e^x * sen(x).',
    result: 'Estudo',
  },
];

export const initialNotes: NotebookNote[] = [
  {
    id: 'note-1',
    title: 'Dicas de Produtividade & Técnica de Feynman',
    tags: ['Produtividade', 'Estudo', 'Métodos'],
    createdAt: '2026-11-01',
    content: '1. Escolha o conceito.\n2. Ensine para uma criança de 10 anos em termos simples.\n3. Identifique lacunas e volte ao material original.\n4. Simplifique e use analogias.',
  },
  {
    id: 'note-2',
    title: 'Links e Recursos de Programação (MC322)',
    tags: ['MC322', 'Java', 'Material'],
    createdAt: '2026-10-28',
    content: 'Repositório da disciplina: github.com/santanche/mc322\nDocumentação Java SE 21.\nExercícios no LeetCode e BeeCrowd.',
  },
];
