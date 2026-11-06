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
    targetAverage: 7.0,
    grades: [
      { id: 'g1', name: 'Prova 1 (P1)', grade: 8.5, maxGrade: 10, weight: 1, date: '2026-04-10' },
      { id: 'g2', name: 'Prova 2 (P2)', grade: 9.0, maxGrade: 10, weight: 1.5, date: '2026-06-15' },
      { id: 'g3', name: 'Projeto Prático Java', grade: 9.5, maxGrade: 10, weight: 1.5, date: '2026-06-25' },
    ],
    syllabus: [
      { id: 's1', title: '1. Introdução à POO: Classes, Objetos e Encapsulamento', completed: true },
      { id: 's2', title: '2. Herança, Polimorfismo e Interfaces', completed: true },
      { id: 's3', title: '3. Tratamento de Exceções e Coleções (Generics)', completed: false },
      { id: 's4', title: '4. Padrões de Projeto (GoF) e Arquitetura MVC', completed: false },
      { id: 's5', title: '5. Programação Funcional e Streams em Java', completed: false },
    ],
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
    targetAverage: 7.0,
    grades: [
      { id: 'g4', name: 'P1 - Requisitos & Scrum', grade: 8.0, maxGrade: 10, weight: 1, date: '2026-04-18' },
      { id: 'g5', name: 'Entrega MVP Sprint 1', grade: 10.0, maxGrade: 10, weight: 1, date: '2026-05-10' },
    ],
    syllabus: [
      { id: 's6', title: '1. Ciclos de Vida de Software e Metodologias Ágeis (Scrum/Kanban)', completed: true },
      { id: 's7', title: '2. Engenharia de Requisitos e User Stories', completed: true },
      { id: 's8', title: '3. Modelagem de Arquitetura e Diagramas C4/UML', completed: false },
      { id: 's9', title: '4. Testes Automatizados (TDD, BDD, CI/CD)', completed: false },
    ],
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
    targetAverage: 5.0,
    grades: [
      { id: 'g6', name: 'Prova 1 - Limites e Derivadas', grade: 7.5, maxGrade: 10, weight: 1, date: '2026-04-05' },
    ],
    syllabus: [
      { id: 's10', title: '1. Funções e Limites', completed: true },
      { id: 's11', title: '2. Derivadas e Regra da Cadeia', completed: true },
      { id: 's12', title: '3. Aplicações de Derivadas (Máximos e Mínimos)', completed: false },
      { id: 's13', title: '4. Integrais Definidas e Indefinidas', completed: false },
    ],
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
