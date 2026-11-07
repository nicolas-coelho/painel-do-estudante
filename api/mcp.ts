import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';

// ============================================================================
// CONFIGURAÇÃO DO FIREBASE ADMIN
// ============================================================================
const DEFAULT_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'painel-estudante-8b2c';
const DEFAULT_DASHBOARD_ID = process.env.DEFAULT_DASHBOARD_ID || 'principal';

function getFirebaseAdminApp() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  // 1. Tentar carregar de FIREBASE_SERVICE_ACCOUNT (JSON string ou base64)
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      let raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      if (!raw.startsWith('{')) {
        raw = Buffer.from(raw, 'base64').toString('utf-8');
      }
      const serviceAccount = JSON.parse(raw);
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || DEFAULT_PROJECT_ID,
      });
    } catch (err) {
      console.error('Erro ao ler FIREBASE_SERVICE_ACCOUNT:', err);
    }
  }

  // 2. Tentar carregar de variáveis separadas
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    try {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
      return admin.initializeApp({
        credential: admin.credential.cert({
          projectId: DEFAULT_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
        projectId: DEFAULT_PROJECT_ID,
      });
    } catch (err) {
      console.error('Erro ao inicializar com client email e private key:', err);
    }
  }

  // 3. Fallback para default application credentials
  try {
    return admin.initializeApp({
      projectId: DEFAULT_PROJECT_ID,
    });
  } catch (err) {
    console.warn('Aviso: Firebase Admin inicializado sem credenciais explícitas:', err);
    return admin.initializeApp({
      projectId: DEFAULT_PROJECT_ID,
    });
  }
}

// Helper para ler documento do estudante no Firestore
async function getStudentDashboard(userId: string = DEFAULT_DASHBOARD_ID) {
  try {
    getFirebaseAdminApp();
    const db = admin.firestore();
    const docRef = db.collection('student_dashboards').doc(userId);
    const snap = await docRef.get();
    if (snap.exists) {
      return snap.data() || {};
    }
  } catch (err: any) {
    console.error('Erro ao ler Firestore via Admin SDK:', err?.message || err);
  }

  // Fallback via Firestore REST API (público / token)
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${DEFAULT_PROJECT_ID}/databases/(default)/documents/student_dashboards/${userId}`;
    const res = await fetch(url);
    if (res.ok) {
      const json: any = await res.json();
      return parseFirestoreFields(json.fields || {});
    }
  } catch (restErr) {
    console.error('Erro no fallback REST do Firestore:', restErr);
  }

  return {};
}

// Helper para salvar documento do estudante no Firestore
async function saveStudentDashboard(userId: string = DEFAULT_DASHBOARD_ID, data: any) {
  getFirebaseAdminApp();
  const db = admin.firestore();
  const docRef = db.collection('student_dashboards').doc(userId);
  await docRef.set(
    {
      ...data,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

function parseFirestoreFields(fields: any): any {
  const result: any = {};
  for (const key of Object.keys(fields)) {
    const val = fields[key];
    if (val.stringValue !== undefined) result[key] = val.stringValue;
    else if (val.integerValue !== undefined) result[key] = Number(val.integerValue);
    else if (val.doubleValue !== undefined) result[key] = Number(val.doubleValue);
    else if (val.booleanValue !== undefined) result[key] = val.booleanValue;
    else if (val.arrayValue !== undefined) {
      result[key] = (val.arrayValue.values || []).map((v: any) =>
        v.mapValue ? parseFirestoreFields(v.mapValue.fields || {}) : v.stringValue || v
      );
    } else if (val.mapValue !== undefined) {
      result[key] = parseFirestoreFields(val.mapValue.fields || {});
    }
  }
  return result;
}

const getLocalDateStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ============================================================================
// DEFINIÇÃO DAS FERRAMENTAS MCP (TOOLS)
// ============================================================================
const MCP_TOOLS = [
  {
    name: 'get_study_routine',
    description:
      'Retorna a rotina completa do estudante no Painel do Estudante: entregas do dia, tarefas pendentes, próximas provas, disciplinas matriculadas e horários de aula. Use esta ferramenta sempre que o usuário pedir para você explicar, resumir ou organizar sua rotina de estudos.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'Identificador do estudante no Firestore (padrão: "principal")',
        },
      },
    },
  },
  {
    name: 'create_card',
    description:
      'Cria um novo card de tarefa ou entrega acadêmica no quadro de estudos (Kanban) do Painel do Estudante e salva automaticamente no Firebase.',
    inputSchema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: {
          type: 'string',
          description: 'Título ou descrição da tarefa/entrega (ex: "Entregar Relatório do Lab 2", "Lista de Exercícios Cálculo")',
        },
        courseCode: {
          type: 'string',
          description: 'Código ou nome da disciplina associada (ex: "MC322", "ES680", "MA111"). Se omitido, associará à matéria mais provável.',
        },
        dueDate: {
          type: 'string',
          description: 'Data de entrega no formato YYYY-MM-DD. Se o usuário falar "hoje" ou omitir, usará a data atual.',
        },
        type: {
          type: 'string',
          enum: ['Trabalho', 'Prova', 'Exercício', 'Leitura', 'Outro'],
          description: 'Tipo de atividade acadêmica. Padrão: "Trabalho"',
        },
        status: {
          type: 'string',
          enum: ['todo', 'in_progress', 'done'],
          description: 'Status inicial da tarefa no quadro: "todo" (A Fazer), "in_progress" (Em Andamento) ou "done" (Concluído). Padrão: "todo"',
        },
        notes: {
          type: 'string',
          description: 'Instruções adicionais, requisitos, links ou anotações sobre a entrega.',
        },
        userId: {
          type: 'string',
          description: 'Identificador do estudante no Firestore (padrão: "principal")',
        },
      },
    },
  },
  {
    name: 'update_card_status',
    description:
      'Atualiza o status de uma atividade existente (ex: mover para Em Andamento ou marcar como Concluída).',
    inputSchema: {
      type: 'object',
      required: ['taskQuery', 'newStatus'],
      properties: {
        taskQuery: {
          type: 'string',
          description: 'Nome da tarefa ou trecho do título para buscar e atualizar.',
        },
        newStatus: {
          type: 'string',
          enum: ['todo', 'in_progress', 'done'],
          description: 'Novo status: "todo", "in_progress" ou "done"',
        },
        userId: {
          type: 'string',
          description: 'Identificador do estudante no Firestore (padrão: "principal")',
        },
      },
    },
  },
  {
    name: 'list_courses',
    description:
      'Lista todas as disciplinas do estudante com detalhes de horários, salas, professores e provas agendadas.',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'Identificador do estudante no Firestore (padrão: "principal")',
        },
      },
    },
  },
  {
    name: 'create_personal_bill',
    description:
      'Adiciona uma nova conta a pagar (boleto, luz, água, internet, mensalidade, fatura) na aba de Vida Pessoal & Finanças do Painel e salva no Firebase.',
    inputSchema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: {
          type: 'string',
          description: 'Nome da despesa ou conta (ex: "Pagar a Luz", "Pagar o Inglês", "Fatura Cartão Nubank")',
        },
        amount: {
          type: 'number',
          description: 'Valor em reais (R$) (ex: 164.20, 230.00)',
        },
        dueDate: {
          type: 'string',
          description: 'Data de vencimento no formato YYYY-MM-DD. Se o usuário falar "hoje" ou omitir, usará a data atual.',
        },
        category: {
          type: 'string',
          enum: ['moradia', 'servicos', 'educacao', 'saude', 'alimentacao', 'transporte', 'lazer', 'outros'],
          description: 'Categoria da despesa. Padrão: "moradia" ou "servicos"',
        },
        barcodeOrLink: {
          type: 'string',
          description: 'Chave PIX, código de barras digitável ou link de pagamento (opcional)',
        },
        notes: {
          type: 'string',
          description: 'Lembretes adicionais sobre a conta',
        },
        userId: {
          type: 'string',
          description: 'Identificador do estudante no Firestore (padrão: "principal")',
        },
      },
    },
  },
  {
    name: 'list_personal_bills',
    description:
      'Lista as contas a pagar cadastradas na Vida Pessoal & Finanças (Bullet Journal), com valores em R$, vencimentos, status e totais.',
    inputSchema: {
      type: 'object',
      properties: {
        statusFilter: {
          type: 'string',
          enum: ['all', 'pending', 'paid', 'overdue'],
          description: 'Filtro por status: "all" (todas), "pending" (apenas pendentes), "paid" (já pagas) ou "overdue" (atrasadas). Padrão: "all"',
        },
        userId: {
          type: 'string',
          description: 'Identificador do estudante no Firestore (padrão: "principal")',
        },
      },
    },
  },
  {
    name: 'pay_bill',
    description:
      'Marca uma conta a pagar como quitada/paga (ou desmarca) na Vida Pessoal do Painel do Estudante.',
    inputSchema: {
      type: 'object',
      required: ['billQuery'],
      properties: {
        billQuery: {
          type: 'string',
          description: 'Nome da conta ou trecho do título para buscar e marcar como paga (ex: "Luz", "Inglês", "Água")',
        },
        paid: {
          type: 'boolean',
          description: 'true para marcar como paga, false para desmarcar. Padrão: true',
        },
        userId: {
          type: 'string',
          description: 'Identificador do estudante no Firestore (padrão: "principal")',
        },
      },
    },
  },
  {
    name: 'create_personal_appointment',
    description:
      'Adiciona um novo compromisso pessoal ou de saúde (consulta médica, dentista, autoescola, mercado, recados) no Bullet Journal do Painel do Estudante.',
    inputSchema: {
      type: 'object',
      required: ['title'],
      properties: {
        title: {
          type: 'string',
          description: 'Título do compromisso (ex: "Marcar dentista", "Consulta com dermatologista", "Autoescola")',
        },
        date: {
          type: 'string',
          description: 'Data do compromisso no formato YYYY-MM-DD. Se omitido, usará a data atual.',
        },
        time: {
          type: 'string',
          description: 'Horário do compromisso no formato HH:mm (ex: "14:30")',
        },
        location: {
          type: 'string',
          description: 'Localização ou endereço do compromisso (ex: "Consultório Dr. Marcelo")',
        },
        category: {
          type: 'string',
          enum: ['saude', 'pessoal', 'financeiro', 'estudo', 'outro'],
          description: 'Categoria do compromisso. Padrão: "pessoal"',
        },
        notes: {
          type: 'string',
          description: 'Observações ou lembretes (ex: "levar carteirinha do plano")',
        },
        userId: {
          type: 'string',
          description: 'Identificador do estudante no Firestore (padrão: "principal")',
        },
      },
    },
  },
  {
    name: 'list_personal_appointments',
    description:
      'Lista os compromissos pessoais, consultas médicas e rotina agendada no Bullet Journal do Painel.',
    inputSchema: {
      type: 'object',
      properties: {
        includeCompleted: {
          type: 'boolean',
          description: 'Se true, inclui também compromissos já concluídos. Padrão: false',
        },
        userId: {
          type: 'string',
          description: 'Identificador do estudante no Firestore (padrão: "principal")',
        },
      },
    },
  },
];

// ============================================================================
// EXECUÇÃO DAS FERRAMENTAS
// ============================================================================
async function executeTool(name: string, args: any): Promise<string> {
  const userId = args?.userId || DEFAULT_DASHBOARD_ID;
  const todayStr = getLocalDateStr();

  if (name === 'get_study_routine') {
    const dashboard = await getStudentDashboard(userId);
    const courses: any[] = dashboard.courses || [];
    const tasks: any[] = dashboard.tasks || [];

    const activeCourses = courses.filter((c) => c.inProgress !== false);
    const todayTasks = tasks.filter((t) => t.dueDate === todayStr);
    const overdueTasks = tasks.filter((t) => t.status !== 'done' && t.dueDate < todayStr);
    const inProgressTasks = tasks.filter((t) => t.status === 'in_progress');
    const todoTasks = tasks.filter((t) => t.status === 'todo');

    // Próximas provas
    const upcomingExams = courses
      .flatMap((c) =>
        (c.grades || [])
          .filter((g: any) => g.date)
          .map((g: any) => ({
            courseCode: c.code,
            courseName: c.name,
            examName: g.name,
            date: g.date,
          }))
      )
      .sort((a, b) => a.date.localeCompare(b.date));

    let output = `# 📋 Rotina de Estudos do Estudante (${todayStr})\n\n`;

    // 1. Entregas de Hoje
    output += `## 🚨 Entregas e Atividades de Hoje (${todayTasks.length})\n`;
    if (todayTasks.length > 0) {
      todayTasks.forEach((t) => {
        const course = courses.find((c) => c.id === t.courseId);
        output += `- [${t.status === 'done' ? 'X' : ' '}] **${t.name}** (${course ? course.code : 'Geral'}) - Tipo: ${t.type} | Status: ${t.status}\n`;
        if (t.notes) output += `  *Nota: ${t.notes}*\n`;
      });
    } else {
      output += `*Nenhuma entrega com prazo para hoje! Tudo em dia.*\n`;
    }
    output += `\n`;

    // 2. Tarefas Atrasadas
    if (overdueTasks.length > 0) {
      output += `## ⚠️ Tarefas Atrasadas (${overdueTasks.length})\n`;
      overdueTasks.forEach((t) => {
        const course = courses.find((c) => c.id === t.courseId);
        output += `- ❗ **${t.name}** (${course ? course.code : 'Geral'}) - Prazo original: ${t.dueDate}\n`;
      });
      output += `\n`;
    }

    // 3. Quadro de Atividades Atuais
    output += `## 📊 Quadro de Tarefas\n`;
    output += `- **Em Andamento (${inProgressTasks.length}):** ${inProgressTasks.map((t) => t.name).join(', ') || 'Nenhuma'}\n`;
    output += `- **A Fazer (${todoTasks.length}):** ${todoTasks.slice(0, 5).map((t) => t.name).join(', ') || 'Nenhuma'}\n\n`;

    // 4. Próximas Provas
    output += `## 📝 Próximas Provas Agendadas\n`;
    if (upcomingExams.length > 0) {
      upcomingExams.slice(0, 5).forEach((e) => {
        output += `- **${e.date}** | [${e.courseCode}] ${e.examName} (${e.courseName})\n`;
      });
    } else {
      output += `*Nenhuma data de prova cadastrada.*\n`;
    }
    output += `\n`;

    // 5. Horários das Disciplinas
    output += `## 🏫 Horários das Disciplinas Ativas\n`;
    activeCourses.forEach((c) => {
      output += `- **${c.code} - ${c.name}**: ${c.schedule || 'Horário flexível'} (Sala: ${c.roomOrLink || 'A definir'}) - Prof: ${c.professor || 'Não informado'}\n`;
    });
    output += `\n`;

    // 6. Vida Pessoal, Finanças & Compromissos
    const bills: any[] = dashboard.personalBills || [];
    const appointments: any[] = dashboard.personalAppointments || [];

    const todayBills = bills.filter((b) => b.dueDate === todayStr && b.status !== 'paid');
    const overdueBills = bills.filter((b) => b.status !== 'paid' && b.dueDate < todayStr);
    const todayAppointments = appointments.filter((a) => a.date === todayStr && !a.completed);

    output += `## 💳 Vida Pessoal, Contas a Pagar & Compromissos de Hoje\n`;
    if (todayBills.length > 0 || overdueBills.length > 0 || todayAppointments.length > 0) {
      if (todayBills.length > 0) {
        output += `### 💰 Contas que vencem HOJE:\n`;
        todayBills.forEach((b) => {
          output += `- **${b.title}**: R$ ${Number(b.amount || 0).toFixed(2)} (Categoria: ${b.category || 'geral'})\n`;
        });
      }
      if (overdueBills.length > 0) {
        output += `### ⚠️ Contas ATRASADAS:\n`;
        overdueBills.forEach((b) => {
          output += `- ❗ **${b.title}**: R$ ${Number(b.amount || 0).toFixed(2)} (Venceu em: ${b.dueDate})\n`;
        });
      }
      if (todayAppointments.length > 0) {
        output += `### 🗓️ Compromissos Pessoais & Saúde de Hoje:\n`;
        todayAppointments.forEach((a) => {
          output += `- **${a.title}**${a.time ? ` às ${a.time}` : ''}${a.location ? ` em ${a.location}` : ''} (Categoria: ${a.category || 'pessoal'})\n`;
        });
      }
    } else {
      output += `*Nenhuma conta vencendo hoje e nenhum compromisso pendente para o dia. Tudo em dia na rotina pessoal!*\n`;
    }

    return output;
  }

  if (name === 'create_card') {
    const dashboard = await getStudentDashboard(userId);
    const courses: any[] = dashboard.courses || [];
    const tasks: any[] = dashboard.tasks || [];

    // Resolver a disciplina correta
    let courseId = '';
    let matchedCourse: any = null;
    if (args.courseCode) {
      const q = String(args.courseCode).toLowerCase().trim();
      matchedCourse = courses.find(
        (c) =>
          c.code?.toLowerCase().includes(q) ||
          c.name?.toLowerCase().includes(q) ||
          c.id?.toLowerCase() === q
      );
      if (matchedCourse) {
        courseId = matchedCourse.id;
      }
    }

    if (!courseId && courses.length > 0) {
      matchedCourse = courses[0];
      courseId = matchedCourse.id;
    }

    // Normalizar data
    let dueDate = args.dueDate ? String(args.dueDate).trim() : todayStr;
    if (dueDate.toLowerCase() === 'hoje') dueDate = todayStr;
    if (dueDate.toLowerCase() === 'amanha' || dueDate.toLowerCase() === 'amanhã') {
      const tomorrow = new Date(Date.now() + 86400000);
      dueDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    }

    const newTask = {
      id: `task-${Date.now()}`,
      name: String(args.name).trim(),
      courseId,
      status: args.status || 'todo',
      type: args.type || 'Trabalho',
      dueDate,
      notes: args.notes ? String(args.notes).trim() : '',
    };

    const updatedTasks = [...tasks, newTask];
    await saveStudentDashboard(userId, { ...dashboard, tasks: updatedTasks });

    return `✅ **Card Criado com Sucesso no Painel do Estudante!**

- **Título:** ${newTask.name}
- **Disciplina:** ${matchedCourse ? `${matchedCourse.code} (${matchedCourse.name})` : 'Geral'}
- **Tipo:** ${newTask.type}
- **Status Inicial:** ${newTask.status === 'todo' ? 'A Fazer' : newTask.status === 'in_progress' ? 'Em Andamento' : 'Concluído'}
- **Data de Entrega:** ${newTask.dueDate}
${newTask.notes ? `- **Anotações:** ${newTask.notes}\n` : ''}
*O card já foi sincronizado e aparece na Página Inicial e no Quadro de Tarefas.*`;
  }

  if (name === 'update_card_status') {
    const dashboard = await getStudentDashboard(userId);
    const tasks: any[] = dashboard.tasks || [];
    const query = String(args.taskQuery || '').toLowerCase();

    const taskIndex = tasks.findIndex(
      (t) => t.id === args.taskQuery || t.name?.toLowerCase().includes(query)
    );

    if (taskIndex === -1) {
      return `❌ Não encontrei nenhuma tarefa com o nome ou ID contendo "${args.taskQuery}".`;
    }

    const task = tasks[taskIndex];
    task.status = args.newStatus;
    await saveStudentDashboard(userId, { ...dashboard, tasks });

    return `✅ **Status Atualizado com Sucesso!**
A tarefa **"${task.name}"** foi movida para o status **"${args.newStatus === 'done' ? 'Concluído' : args.newStatus === 'in_progress' ? 'Em Andamento' : 'A Fazer'}"**.`;
  }

  if (name === 'list_courses') {
    const dashboard = await getStudentDashboard(userId);
    const courses: any[] = dashboard.courses || [];

    if (courses.length === 0) {
      return `Nenhuma disciplina encontrada no painel.`;
    }

    let out = `# 📚 Disciplinas Matriculadas (${courses.length})\n\n`;
    courses.forEach((c) => {
      out += `### [${c.code}] ${c.name}\n`;
      out += `- **Professor:** ${c.professor || 'N/A'}\n`;
      out += `- **Horário:** ${c.schedule || 'N/A'}\n`;
      out += `- **Local:** ${c.roomOrLink || 'N/A'}\n`;
      if (c.grades && c.grades.length > 0) {
        out += `- **Avaliações/Provas:**\n`;
        c.grades.forEach((g: any) => {
          out += `  * ${g.name}: Nota ${g.grade ?? 'Pendente'}${g.date ? ` (Data: ${g.date})` : ''}\n`;
        });
      }
      out += `\n`;
    });
    return out;
  }

  if (name === 'create_personal_bill') {
    const dashboard = await getStudentDashboard(userId);
    const bills: any[] = dashboard.personalBills || [];

    let dueDate = args.dueDate ? String(args.dueDate).trim() : todayStr;
    if (dueDate.toLowerCase() === 'hoje') dueDate = todayStr;
    if (dueDate.toLowerCase() === 'amanha' || dueDate.toLowerCase() === 'amanhã') {
      const tomorrow = new Date(Date.now() + 86400000);
      dueDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
    }

    const newBill = {
      id: `bill-${Date.now()}`,
      title: String(args.title).trim(),
      amount: Number(args.amount) || 0,
      dueDate,
      category: args.category || 'moradia',
      status: 'pending',
      barcodeOrLink: args.barcodeOrLink ? String(args.barcodeOrLink).trim() : '',
      notes: args.notes ? String(args.notes).trim() : '',
    };

    const updatedBills = [...bills, newBill];
    await saveStudentDashboard(userId, { ...dashboard, personalBills: updatedBills });

    return `✅ **Conta Adicionada com Sucesso na Vida Pessoal!**

- **Despesa:** ${newBill.title}
- **Valor:** R$ ${newBill.amount.toFixed(2)}
- **Data de Vencimento:** ${newBill.dueDate}
- **Categoria:** ${newBill.category}
- **Status:** Pendente
${newBill.barcodeOrLink ? `- **Código/PIX:** ${newBill.barcodeOrLink}\n` : ''}
*Já visível no seu Bullet Journal e na aba Vida Pessoal & Finanças.*`;
  }

  if (name === 'list_personal_bills') {
    const dashboard = await getStudentDashboard(userId);
    const bills: any[] = dashboard.personalBills || [];

    if (bills.length === 0) {
      return `Nenhuma conta cadastrada na aba de Vida Pessoal & Finanças.`;
    }

    let filtered = bills;
    if (args.statusFilter === 'pending') filtered = bills.filter((b) => b.status === 'pending');
    else if (args.statusFilter === 'paid') filtered = bills.filter((b) => b.status === 'paid');
    else if (args.statusFilter === 'overdue') filtered = bills.filter((b) => b.status === 'pending' && b.dueDate < todayStr);

    let totalPending = 0;
    let totalPaid = 0;
    bills.forEach((b) => {
      if (b.status === 'paid') totalPaid += Number(b.amount || 0);
      else totalPending += Number(b.amount || 0);
    });

    let out = `# 💳 Contas a Pagar & Finanças (${filtered.length})\n\n`;
    out += `💰 **Total a Pagar (Pendente):** R$ ${totalPending.toFixed(2)} | **Total Já Pago:** R$ ${totalPaid.toFixed(2)}\n\n`;

    filtered.forEach((b) => {
      const isPaid = b.status === 'paid';
      const isOverdue = !isPaid && b.dueDate < todayStr;
      const statusIcon = isPaid ? '✅' : isOverdue ? '⚠️' : '🕒';
      out += `- ${statusIcon} **${b.title}** — R$ ${Number(b.amount || 0).toFixed(2)} | Vencimento: ${b.dueDate} | Status: ${isPaid ? 'Pago' : isOverdue ? 'Atrasado' : 'Pendente'}\n`;
      if (b.barcodeOrLink) out += `  *PIX/Linha digitável: ${b.barcodeOrLink}*\n`;
      if (b.notes) out += `  *Nota: ${b.notes}*\n`;
    });

    return out;
  }

  if (name === 'pay_bill') {
    const dashboard = await getStudentDashboard(userId);
    const bills: any[] = dashboard.personalBills || [];
    const query = String(args.billQuery || '').toLowerCase();
    const shouldPay = args.paid !== false;

    const idx = bills.findIndex(
      (b) => b.id === args.billQuery || b.title?.toLowerCase().includes(query)
    );

    if (idx === -1) {
      return `❌ Não encontrei nenhuma conta com o nome ou ID contendo "${args.billQuery}".`;
    }

    const bill = bills[idx];
    bill.status = shouldPay ? 'paid' : 'pending';
    bill.paidAt = shouldPay ? todayStr : undefined;
    await saveStudentDashboard(userId, { ...dashboard, personalBills: bills });

    return `✅ **Conta Atualizada!**
A despesa **"${bill.title}"** (R$ ${Number(bill.amount || 0).toFixed(2)}) foi marcada como **${shouldPay ? 'PAGA / QUITADA' : 'PENDENTE'}** com sucesso no painel.`;
  }

  if (name === 'create_personal_appointment') {
    const dashboard = await getStudentDashboard(userId);
    const appointments: any[] = dashboard.personalAppointments || [];

    const newApp = {
      id: `app-${Date.now()}`,
      title: String(args.title).trim(),
      date: args.date ? String(args.date).trim() : todayStr,
      time: args.time ? String(args.time).trim() : undefined,
      location: args.location ? String(args.location).trim() : undefined,
      category: args.category || 'pessoal',
      completed: false,
      notes: args.notes ? String(args.notes).trim() : '',
    };

    const updated = [...appointments, newApp];
    await saveStudentDashboard(userId, { ...dashboard, personalAppointments: updated });

    return `✅ **Compromisso Criado no Bullet Journal!**

- **Compromisso:** ${newApp.title}
- **Data:** ${newApp.date}
${newApp.time ? `- **Horário:** ${newApp.time}\n` : ''}
${newApp.location ? `- **Local:** ${newApp.location}\n` : ''}
- **Categoria:** ${newApp.category}
*Já visível no seu Daily Log e no card de Tarefas do dia.*`;
  }

  if (name === 'list_personal_appointments') {
    const dashboard = await getStudentDashboard(userId);
    const appointments: any[] = dashboard.personalAppointments || [];

    const list = args.includeCompleted
      ? appointments
      : appointments.filter((a) => !a.completed);

    if (list.length === 0) {
      return `Nenhum compromisso agendado encontrado no Bullet Journal.`;
    }

    let out = `# 🗓️ Compromissos & Rotina Pessoal (${list.length})\n\n`;
    list.forEach((a) => {
      out += `- [${a.completed ? 'X' : ' '}] **${a.title}** — Data: ${a.date}${a.time ? ` às ${a.time}` : ''}${a.location ? ` (${a.location})` : ''} | Categoria: ${a.category || 'pessoal'}\n`;
      if (a.notes) out += `  *Nota: ${a.notes}*\n`;
    });
    return out;
  }

  throw new Error(`Ferramenta desconhecida: "${name}"`);
}

// ============================================================================
// HANDLER PRINCIPAL VERCEL SERVERLESS FUNCTION
// ============================================================================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configurar CORS completo para clientes MCP (Gemini, Claude, Webhooks)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Verificação opcional de chave de API se configurada no ambiente
  const configuredSecret = process.env.MCP_API_KEY || process.env.MCP_SECRET;
  if (configuredSecret) {
    const authHeader = req.headers.authorization || (req.headers['x-api-key'] as string);
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    if (token !== configuredSecret) {
      return res.status(401).json({
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Acesso não autorizado. Chave MCP inválida.' },
      });
    }
  }

  // --------------------------------------------------------------------------
  // GET: SSE Transport ou Informações da API
  // --------------------------------------------------------------------------
  if (req.method === 'GET') {
    const acceptHeader = req.headers.accept || '';

    // Se o cliente MCP solicitar SSE (Server-Sent Events)
    if (acceptHeader.includes('text/event-stream')) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const sessionId = `session-${Date.now()}`;
      res.write(`event: endpoint\ndata: /api/mcp?sessionId=${sessionId}\n\n`);
      return res.end();
    }

    // Resposta amigável ao abrir no navegador / teste
    return res.status(200).json({
      status: 'online',
      name: 'painel-do-estudante-mcp',
      version: '1.0.0',
      description: 'Servidor MCP oficial do Painel do Estudante para Google Gemini',
      protocolVersion: '2024-11-05',
      tools: MCP_TOOLS.map((t) => ({ name: t.name, description: t.description })),
      prompts: [
        {
          name: 'explicar_rotina',
          description: 'Pede ao Gemini para explicar detalhadamente a rotina de hoje e prioridades.',
        },
      ],
      usage: {
        geminiConfig: {
          mcpServers: {
            painelDoEstudante: {
              url: 'https://SEU-DOMINIO.vercel.app/api/mcp',
              transport: 'http',
            },
          },
        },
      },
    });
  }

  // --------------------------------------------------------------------------
  // POST: Mensagens JSON-RPC 2.0 (MCP Protocol)
  // --------------------------------------------------------------------------
  if (req.method === 'POST') {
    const body = req.body || {};
    const { jsonrpc, id, method, params } = body;

    // Resposta JSON-RPC helper
    const sendResult = (result: any) => {
      return res.status(200).json({
        jsonrpc: '2.0',
        id: id ?? null,
        result,
      });
    };

    const sendError = (code: number, message: string, data?: any) => {
      return res.status(200).json({
        jsonrpc: '2.0',
        id: id ?? null,
        error: { code, message, data },
      });
    };

    try {
      // 1. Handshake / Initialize
      if (method === 'initialize') {
        return sendResult({
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {
              listChanged: false,
            },
            prompts: {
              listChanged: false,
            },
            resources: {},
          },
          serverInfo: {
            name: 'painel-do-estudante-mcp',
            version: '1.0.0',
          },
        });
      }

      // 2. Notificação de inicialização
      if (method === 'notifications/initialized') {
        return res.status(200).json({});
      }

      // 3. Listagem de ferramentas (tools/list)
      if (method === 'tools/list') {
        return sendResult({
          tools: MCP_TOOLS,
        });
      }

      // 4. Execução de ferramenta (tools/call)
      if (method === 'tools/call') {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};

        if (!toolName) {
          return sendError(-32602, 'Parâmetro "name" da ferramenta é obrigatório');
        }

        const textOutput = await executeTool(toolName, toolArgs);

        return sendResult({
          content: [
            {
              type: 'text',
              text: textOutput,
            },
          ],
        });
      }

      // 5. Listagem de prompts (prompts/list)
      if (method === 'prompts/list') {
        return sendResult({
          prompts: [
            {
              name: 'explicar_rotina',
              description: 'Pede ao Gemini para analisar a rotina e montar um plano de estudos eficiente para o dia.',
              arguments: [],
            },
          ],
        });
      }

      // 6. Obtenção de prompt (prompts/get)
      if (method === 'prompts/get') {
        const promptName = params?.name;
        if (promptName === 'explicar_rotina') {
          return sendResult({
            description: 'Explicação e planejamento da rotina de estudos',
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: 'Por favor, consulte minha rotina no Painel do Estudante usando a ferramenta "get_study_routine", me explique as principais prioridades e entregas de hoje, aponte prazos urgentes ou provas próximas e elabore um cronograma sugerido para eu estudar com tranquilidade.',
                },
              },
            ],
          });
        }
        return sendError(-32601, `Prompt "${promptName}" não encontrado`);
      }

      // Método não suportado
      return sendError(-32601, `Método não implementado: "${method}"`);
    } catch (err: any) {
      console.error('Erro ao processar chamada MCP:', err);
      return sendError(-32603, err?.message || 'Erro interno do servidor MCP');
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
