import type { VercelRequest, VercelResponse } from '@vercel/node';
import { initializeApp, cert, getApps, getApp, type ServiceAccount } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

// ============================================================================
// CONFIGURAÇÃO DO FIRESTORE & FIREBASE ADMIN SDK
// ============================================================================
const DEFAULT_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'painel-estudante-8b2c';
const DEFAULT_DASHBOARD_ID = 'principal';
const CONFIGURED_DASHBOARD_ID = process.env.DEFAULT_DASHBOARD_ID?.trim() || '';
const DEFAULT_USER_EMAIL =
  process.env.DEFAULT_USER_EMAIL?.trim() ||
  process.env.NOTIFICATION_EMAIL?.trim() ||
  'nicolasplcoelho@gmail.com';

const ALLOWED_DASHBOARD_FIELDS = new Set([
  'courses',
  'tasks',
  'topics',
  'sessions',
  'notes',
  'personalBills',
  'personalAppointments',
  'calendarId',
  'updatedAt',
  'createdAt',
  'userId',
  'email',
  'userEmail',
  'displayName',
]);

let cachedAdmin: { db: Firestore; auth: Auth } | null = null;
let adminInitAttempted = false;
let adminInitError: string | null = null;
const emailToUidCache = new Map<string, string>();

function normalizeServiceAccountObject(raw: any): ServiceAccount | null {
  if (!raw || typeof raw !== 'object') return null;
  const projectId = raw.projectId || raw.project_id || DEFAULT_PROJECT_ID;
  const clientEmail = raw.clientEmail || raw.client_email;
  const privateKeyRaw = raw.privateKey || raw.private_key;
  if (!clientEmail || !privateKeyRaw) return null;

  return {
    projectId: String(projectId),
    clientEmail: String(clientEmail),
    privateKey: String(privateKeyRaw).replace(/\\n/g, '\n'),
  };
}

function parseServiceAccountFromEnv(): ServiceAccount | null {
  const rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT?.trim();
  if (rawEnv) {
    let cleaned = rawEnv;
    if (
      (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith("'") && cleaned.endsWith("'"))
    ) {
      cleaned = cleaned.slice(1, -1).trim();
    }

    const candidates = [cleaned];
    if (!cleaned.startsWith('{')) {
      try {
        candidates.push(Buffer.from(cleaned, 'base64').toString('utf8'));
      } catch {
        // ignora se não for Base64 válido
      }
    }

    for (const candidate of candidates) {
      try {
        const parsed = JSON.parse(candidate);
        const normalized = normalizeServiceAccountObject(parsed);
        if (normalized) return normalized;
      } catch {
        // tenta próximo formato
      }
    }

    adminInitError =
      'FIREBASE_SERVICE_ACCOUNT definida, porém inválida (esperado JSON ou Base64 da conta de serviço).';
    return null;
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  if (clientEmail && privateKey) {
    return {
      projectId: DEFAULT_PROJECT_ID,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    };
  }

  return null;
}

function getAdminServices(): { db: Firestore; auth: Auth } | null {
  if (adminInitAttempted) return cachedAdmin;
  adminInitAttempted = true;

  const serviceAccount = parseServiceAccountFromEnv();
  if (!serviceAccount) {
    return null;
  }

  try {
    const app =
      getApps().length > 0
        ? getApp()
        : initializeApp({
            credential: cert(serviceAccount),
            projectId: serviceAccount.projectId || DEFAULT_PROJECT_ID,
          });

    const db = getFirestore(app);
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch {
      // settings() só pode ser chamado uma vez por instância Firestore
    }
    const auth = getAuth(app);
    cachedAdmin = { db, auth };
    adminInitError = null;
    return cachedAdmin;
  } catch (err: any) {
    adminInitError = `Falha ao inicializar Firebase Admin: ${err?.message || 'erro desconhecido'}`;
    cachedAdmin = null;
    return null;
  }
}

function stripUndefined(value: any): any {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return value;
  if (Array.isArray(value)) {
    return value.map(stripUndefined).filter((item) => item !== undefined);
  }
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(value)) {
    if (v === undefined) continue;
    const cleaned = stripUndefined(v);
    if (cleaned !== undefined) {
      out[k] = cleaned;
    }
  }
  return out;
}

async function resolveEmailToUid(email: string, auth: Auth): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const cached = emailToUidCache.get(normalized);
  if (cached) return cached;

  try {
    const userRecord = await auth.getUserByEmail(normalized);
    if (userRecord?.uid) {
      emailToUidCache.set(normalized, userRecord.uid);
      return userRecord.uid;
    }
  } catch (err: any) {
    console.warn(`Não foi possível resolver UID para ${normalized}:`, err?.message || err);
  }
  return null;
}

async function resolveTargetDocId(requestedUserId?: string): Promise<string> {
  const admin = getAdminServices();
  const reqId = typeof requestedUserId === 'string' ? requestedUserId.trim() : '';

  if (reqId && reqId !== DEFAULT_DASHBOARD_ID) {
    if (reqId.includes('@') && admin?.auth) {
      const uid = await resolveEmailToUid(reqId, admin.auth);
      if (uid) return uid;
    }
    return reqId;
  }

  if (reqId === DEFAULT_DASHBOARD_ID) {
    return DEFAULT_DASHBOARD_ID;
  }

  if (CONFIGURED_DASHBOARD_ID && CONFIGURED_DASHBOARD_ID !== DEFAULT_DASHBOARD_ID) {
    return CONFIGURED_DASHBOARD_ID;
  }

  if (admin?.auth && DEFAULT_USER_EMAIL) {
    const uid = await resolveEmailToUid(DEFAULT_USER_EMAIL, admin.auth);
    if (uid) return uid;
  }

  return DEFAULT_DASHBOARD_ID;
}

function toFirestoreFields(obj: any): any {
  const fields: any = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (v === undefined) continue;
    fields[k] = toFirestoreValue(v);
  }
  return fields;
}

function toFirestoreValue(val: any): any {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.filter((v) => v !== undefined).map(toFirestoreValue),
      },
    };
  }
  if (typeof val === 'object') {
    return { mapValue: { fields: toFirestoreFields(val) } };
  }
  return { stringValue: String(val) };
}

function parseFirestoreValue(val: any): any {
  if (!val || typeof val !== 'object') return val;
  if (val.stringValue !== undefined) return val.stringValue;
  if (val.integerValue !== undefined) return Number(val.integerValue);
  if (val.doubleValue !== undefined) return Number(val.doubleValue);
  if (val.booleanValue !== undefined) return val.booleanValue;
  if (val.nullValue !== undefined) return null;
  if (val.timestampValue !== undefined) return val.timestampValue;
  if (val.arrayValue !== undefined) {
    return (val.arrayValue.values || []).map(parseFirestoreValue);
  }
  if (val.mapValue !== undefined) {
    return parseFirestoreFields(val.mapValue.fields || {});
  }
  return val;
}

function parseFirestoreFields(fields: any): any {
  const result: any = {};
  for (const key of Object.keys(fields || {})) {
    const val = fields[key];
    if (!val) continue;
    result[key] = parseFirestoreValue(val);
  }
  return result;
}

// Helper para ler documento do estudante no Firestore (Admin SDK ou fallback REST)
async function getStudentDashboard(requestedUserId?: string) {
  const targetDoc = await resolveTargetDocId(requestedUserId);
  const admin = getAdminServices();

  const fetchDoc = async (docName: string): Promise<any | null> => {
    if (admin) {
      const snap = await admin.db.collection('student_dashboards').doc(docName).get();
      return snap.exists ? snap.data() || {} : null;
    }

    const url = `https://firestore.googleapis.com/v1/projects/${DEFAULT_PROJECT_ID}/databases/(default)/documents/student_dashboards/${encodeURIComponent(docName)}`;
    const res = await fetch(url);
    if (res.ok) {
      const json: any = await res.json();
      return parseFirestoreFields(json.fields || {});
    }
    if (res.status === 404) {
      return null;
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `Acesso negado ao ler "${docName}" no Firestore (HTTP ${res.status}). Configure a variável de ambiente FIREBASE_SERVICE_ACCOUNT na Vercel.`
      );
    }
    const errorText = await res.text().catch(() => '');
    throw new Error(
      `Falha ao ler Firestore (${docName}, HTTP ${res.status}): ${errorText.slice(0, 200)}`
    );
  };

  let data = await fetchDoc(targetDoc);

  // Se o documento específico estiver vazio ou sem matérias, tenta carregar de 'principal'
  if (
    (!data || !data.courses || !Array.isArray(data.courses) || data.courses.length === 0) &&
    targetDoc !== DEFAULT_DASHBOARD_ID
  ) {
    try {
      const principalData = await fetchDoc(DEFAULT_DASHBOARD_ID);
      if (principalData) {
        data = { ...principalData, ...data };
      }
    } catch {
      // se o fallback de leitura para 'principal' falhar, segue com os dados disponíveis
    }
  }

  const finalData = data || {};
  // Garante que todas as coleções sejam SEMPRE arrays seguros (evita erros de .length)
  finalData.courses = Array.isArray(finalData.courses) ? finalData.courses : [];
  finalData.tasks = Array.isArray(finalData.tasks) ? finalData.tasks : [];
  finalData.topics = Array.isArray(finalData.topics) ? finalData.topics : [];
  finalData.sessions = Array.isArray(finalData.sessions) ? finalData.sessions : [];
  finalData.notes = Array.isArray(finalData.notes) ? finalData.notes : [];
  finalData.personalBills = Array.isArray(finalData.personalBills) ? finalData.personalBills : [];
  finalData.personalAppointments = Array.isArray(finalData.personalAppointments)
    ? finalData.personalAppointments
    : [];

  return finalData;
}

// Helper para salvar documento do estudante no Firestore (propaga erros reais)
async function saveStudentDashboard(requestedUserId: string | undefined, data: any) {
  const targetDoc = await resolveTargetDocId(requestedUserId);
  const admin = getAdminServices();

  const filtered: Record<string, any> = {};
  for (const [k, v] of Object.entries(data || {})) {
    if (ALLOWED_DASHBOARD_FIELDS.has(k) && v !== undefined) {
      filtered[k] = v;
    }
  }
  const cleanPayload = stripUndefined({
    ...filtered,
    updatedAt: new Date().toISOString(),
  });

  if (admin) {
    await admin.db.collection('student_dashboards').doc(targetDoc).set(cleanPayload, { merge: true });
    return;
  }

  // Fallback REST sem envio de createdAt para não violar regras de imutabilidade em updates
  const restPayload = { ...cleanPayload };
  delete restPayload.createdAt;
  const keys = Object.keys(restPayload);
  const mask = keys.map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const url = `https://firestore.googleapis.com/v1/projects/${DEFAULT_PROJECT_ID}/databases/(default)/documents/student_dashboards/${encodeURIComponent(targetDoc)}?${mask}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: toFirestoreFields(restPayload),
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => '');
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `Permissão negada ao gravar no Firestore (HTTP ${res.status}). Configure a variável de ambiente FIREBASE_SERVICE_ACCOUNT na Vercel para habilitar gravações autenticadas pelo MCP.`
      );
    }
    throw new Error(`Falha ao salvar no Firestore (HTTP ${res.status}): ${errorText.slice(0, 300)}`);
  }
}

const getLocalDateStr = (daysOffset = 0): string => {
  const d = new Date(Date.now() + daysOffset * 86400000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
};

function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return '';
  const match = String(dateStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }
  return String(dateStr);
}

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
          description: 'Identificador do estudante (UID ou e-mail). Se omitido, usa automaticamente o estudante configurado no ambiente (ou "principal").',
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
          description: 'Identificador do estudante (UID ou e-mail). Se omitido, usa automaticamente o estudante configurado no ambiente (ou "principal").',
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
          description: 'Identificador do estudante (UID ou e-mail). Se omitido, usa automaticamente o estudante configurado no ambiente (ou "principal").',
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
          description: 'Identificador do estudante (UID ou e-mail). Se omitido, usa automaticamente o estudante configurado no ambiente (ou "principal").',
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
          description: 'Identificador do estudante (UID ou e-mail). Se omitido, usa automaticamente o estudante configurado no ambiente (ou "principal").',
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
          description: 'Identificador do estudante (UID ou e-mail). Se omitido, usa automaticamente o estudante configurado no ambiente (ou "principal").',
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
          description: 'Identificador do estudante (UID ou e-mail). Se omitido, usa automaticamente o estudante configurado no ambiente (ou "principal").',
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
          description: 'Identificador do estudante (UID ou e-mail). Se omitido, usa automaticamente o estudante configurado no ambiente (ou "principal").',
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
          description: 'Identificador do estudante (UID ou e-mail). Se omitido, usa automaticamente o estudante configurado no ambiente (ou "principal").',
        },
      },
    },
  },
  {
    name: 'create_course',
    description:
      'Cadastra uma nova disciplina ou matéria no Painel do Estudante e salva no banco de dados Firestore.',
    inputSchema: {
      type: 'object',
      required: ['code', 'name'],
      properties: {
        code: {
          type: 'string',
          description: 'Código oficial da disciplina (ex: "ES680", "MC322", "MA111")',
        },
        name: {
          type: 'string',
          description: 'Nome completo da matéria (ex: "Engenharia de Software", "Cálculo I")',
        },
        professor: {
          type: 'string',
          description: 'Nome do professor(a) responsável (ex: "Profa. Cecília Baranauskas")',
        },
        schedule: {
          type: 'string',
          description: 'Dias e horários das aulas (ex: "Seg / Qua 14:00 - 16:00")',
        },
        roomOrLink: {
          type: 'string',
          description: 'Sala de aula física ou link de acesso (ex: "IC-301", "CB-02", "Google Meet")',
        },
        targetAverage: {
          type: 'number',
          description: 'Média alvo para aprovação (padrão: 7.0)',
        },
        semester: {
          type: 'string',
          description: 'Semestre letivo (ex: "1º Semestre", "2º Semestre"). Padrão: "1º Semestre"',
        },
        year: {
          type: 'string',
          description: 'Ano letivo (ex: "2026"). Padrão: "2026"',
        },
        color: {
          type: 'string',
          description: 'Cor em hexadecimal para identificação visual (ex: "#10b981", "#3b82f6", "#f59e0b", "#8b5cf6")',
        },
        evaluations: {
          type: 'array',
          description: 'Lista de avaliações/provas/trabalhos com name, weight, date e type (ex: [{ name: "Prova 1", weight: 0.25, date: "2026-09-28" }])',
        },
        userId: {
          type: 'string',
          description: 'Identificador do estudante (UID ou e-mail). Se omitido, usa automaticamente o estudante configurado no ambiente (ou "principal").',
        },
      },
    },
  },
  {
    name: 'update_course',
    description:
      'Atualiza, edita ou renomeia os dados de uma disciplina existente diretamente no banco de dados (ex: renomear o nome da matéria, atualizar professor, sala, horários ou código — por exemplo atualizar ES680). Permite localizar a matéria pelo código atual (ex: "ES680"), nome ou ID.',
    inputSchema: {
      type: 'object',
      required: ['courseQuery'],
      properties: {
        courseQuery: {
          type: 'string',
          description: 'Código da disciplina (ex: "ES680"), nome atual ou ID para localizar a matéria no banco de dados.',
        },
        name: {
          type: 'string',
          description: 'Novo nome da disciplina (ex: renomear para a denominação oficial correta)',
        },
        code: {
          type: 'string',
          description: 'Novo código da disciplina (ex: "ES680")',
        },
        professor: {
          type: 'string',
          description: 'Novo nome do professor(a)',
        },
        schedule: {
          type: 'string',
          description: 'Novos dias e horários das aulas',
        },
        roomOrLink: {
          type: 'string',
          description: 'Nova sala de aula ou link',
        },
        targetAverage: {
          type: 'number',
          description: 'Nova média alvo para aprovação',
        },
        inProgress: {
          type: 'boolean',
          description: 'true para matéria em andamento / cursando, false para concluída / trancada',
        },
        color: {
          type: 'string',
          description: 'Nova cor em hexadecimal',
        },
        userId: {
          type: 'string',
          description: 'Identificador do estudante (UID ou e-mail). Se omitido, usa automaticamente o estudante configurado no ambiente (ou "principal").',
        },
      },
    },
  },
  {
    name: 'delete_course',
    description:
      'Exclui uma disciplina do Painel do Estudante e remove seus dados do banco de dados.',
    inputSchema: {
      type: 'object',
      required: ['courseQuery'],
      properties: {
        courseQuery: {
          type: 'string',
          description: 'Código (ex: "ES680"), nome ou ID da disciplina que será removida.',
        },
        userId: {
          type: 'string',
          description: 'Identificador do estudante (UID ou e-mail). Se omitido, usa automaticamente o estudante configurado no ambiente (ou "principal").',
        },
      },
    },
  },
  {
    name: 'add_course_grade',
    description:
      'Adiciona ou agenda uma prova/avaliação na disciplina especificada (ex: "P1", "P2", "Trabalho Final") com data, peso e nota.',
    inputSchema: {
      type: 'object',
      required: ['courseQuery', 'name'],
      properties: {
        courseQuery: {
          type: 'string',
          description: 'Código da disciplina (ex: "ES680", "MC322") ou nome para associar a avaliação.',
        },
        name: {
          type: 'string',
          description: 'Nome da avaliação (ex: "P1 - Requisitos & Scrum", "P2 - Arquitetura", "Projeto Final")',
        },
        date: {
          type: 'string',
          description: 'Data da prova ou entrega no formato YYYY-MM-DD.',
        },
        grade: {
          type: 'number',
          description: 'Nota obtida (0 a 10). Se a prova for futura ou ainda não tiver nota, omita.',
        },
        maxGrade: {
          type: 'number',
          description: 'Nota máxima possível (padrão: 10)',
        },
        weight: {
          type: 'number',
          description: 'Peso da avaliação na média (padrão: 1)',
        },
        userId: {
          type: 'string',
          description: 'Identificador do estudante (UID ou e-mail). Se omitido, usa automaticamente o estudante configurado no ambiente (ou "principal").',
        },
      },
    },
  },
  {
    name: 'delete_card',
    description:
      'Exclui definitivamente uma tarefa/card do quadro de estudos (Kanban) do Painel do Estudante.',
    inputSchema: {
      type: 'object',
      required: ['taskQuery'],
      properties: {
        taskQuery: {
          type: 'string',
          description: 'Título ou trecho do nome da tarefa a ser excluída, ou ID da tarefa.',
        },
        userId: {
          type: 'string',
          description: 'Identificador do estudante (UID ou e-mail). Se omitido, usa automaticamente o estudante configurado no ambiente (ou "principal").',
        },
      },
    },
  },
  {
    name: 'create_study_topic',
    description:
      'Adiciona um novo assunto ou tópico para revisão espaçada e resolução de exercícios semanais na aba de Recuperação Ativa.',
    inputSchema: {
      type: 'object',
      required: ['name'],
      properties: {
        name: {
          type: 'string',
          description: 'Nome do assunto ou conteúdo (ex: "Polimorfismo e Herança", "Diagramas C4 e UML", "Derivadas Implícitas")',
        },
        courseCode: {
          type: 'string',
          description: 'Código ou nome da disciplina associada (ex: "MC322", "ES680").',
        },
        question: {
          type: 'string',
          description: 'Pergunta ou conceito de fixação (flashcard rápido opcional).',
        },
        answer: {
          type: 'string',
          description: 'Resposta ou explicação resumida.',
        },
        targetScore: {
          type: 'number',
          description: 'Meta percentual de acerto para avanço de fase (padrão: 80%).',
        },
        userId: {
          type: 'string',
          description: 'Identificador do estudante (UID ou e-mail). Se omitido, usa automaticamente o estudante configurado no ambiente (ou "principal").',
        },
      },
    },
  },
  {
    name: 'register_exercise_attempt',
    description:
      'Registra a resolução de uma lista de exercícios para um tópico da Recuperação Ativa, avaliando a meta de excelência (ex: 80%) e recalculando a próxima revisão semanal.',
    inputSchema: {
      type: 'object',
      required: ['topicQuery', 'totalExercises', 'correctExercises'],
      properties: {
        topicQuery: {
          type: 'string',
          description: 'Nome ou trecho do tópico de estudo.',
        },
        totalExercises: {
          type: 'number',
          description: 'Total de questões resolvidas na lista (ex: 10).',
        },
        correctExercises: {
          type: 'number',
          description: 'Total de questões acertadas (ex: 8).',
        },
        listTitle: {
          type: 'string',
          description: 'Título ou identificador da lista (ex: "Lista 1 - Fixação", "Simulado P1").',
        },
        date: {
          type: 'string',
          description: 'Data da resolução no formato YYYY-MM-DD. Padrão: hoje.',
        },
        notes: {
          type: 'string',
          description: 'Comentários sobre acertos, dúvidas ou erros cometidos.',
        },
        userId: {
          type: 'string',
          description: 'Identificador do estudante (UID ou e-mail). Se omitido, usa automaticamente o estudante configurado no ambiente (ou "principal").',
        },
      },
    },
  },
  {
    name: 'list_study_topics',
    description:
      'Lista os tópicos de estudo cadastrados na Recuperação Ativa, mostrando fase atual, aproveitamento percentual da última lista e próximas revisões.',
    inputSchema: {
      type: 'object',
      properties: {
        courseCode: {
          type: 'string',
          description: 'Filtrar por código ou nome de disciplina (opcional).',
        },
        dueOnly: {
          type: 'boolean',
          description: 'Se true, lista apenas tópicos que vencem hoje ou estão atrasados para revisão. Padrão: false',
        },
        userId: {
          type: 'string',
          description: 'Identificador do estudante (UID ou e-mail). Se omitido, usa automaticamente o estudante configurado no ambiente (ou "principal").',
        },
      },
    },
  },
  {
    name: 'create_note',
    description:
      'Cria uma nova anotação, resumo ou dica no Caderno de Estudos (Notebook) do Painel.',
    inputSchema: {
      type: 'object',
      required: ['title', 'content'],
      properties: {
        title: {
          type: 'string',
          description: 'Título da anotação.',
        },
        content: {
          type: 'string',
          description: 'Conteúdo da anotação em texto ou Markdown.',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Tags ou categorias (ex: ["POO", "Resumo", "Dicas"]).',
        },
        userId: {
          type: 'string',
          description: 'Identificador do estudante (UID ou e-mail). Se omitido, usa automaticamente o estudante configurado no ambiente (ou "principal").',
        },
      },
    },
  },
  {
    name: 'list_notes',
    description:
      'Lista as anotações do Caderno do Painel do Estudante com suporte a busca por palavra-chave.',
    inputSchema: {
      type: 'object',
      properties: {
        searchQuery: {
          type: 'string',
          description: 'Termo de busca para filtrar título, conteúdo ou tags.',
        },
        userId: {
          type: 'string',
          description: 'Identificador do estudante (UID ou e-mail). Se omitido, usa automaticamente o estudante configurado no ambiente (ou "principal").',
        },
      },
    },
  },
];

// ============================================================================
// EXECUÇÃO DAS FERRAMENTAS
// ============================================================================
async function executeTool(name: string, args: any): Promise<string> {
  const userId =
    typeof args?.userId === 'string' && args.userId.trim() ? args.userId.trim() : undefined;
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

    // Próximas provas (filtra apenas datas de hoje em diante)
    const upcomingExams = courses
      .flatMap((c) =>
        (c.grades || [])
          .filter((g: any) => g.date && String(g.date) >= todayStr)
          .map((g: any) => ({
            courseCode: c.code,
            courseName: c.name,
            examName: g.name,
            date: String(g.date),
          }))
      )
      .sort((a, b) => a.date.localeCompare(b.date));

    let output = `# 📋 Rotina de Estudos do Estudante (${formatDateBR(todayStr)})\n\n`;

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
        output += `- ❗ **${t.name}** (${course ? course.code : 'Geral'}) - Prazo original: ${formatDateBR(t.dueDate)}\n`;
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
        output += `- **${formatDateBR(e.date)}** | [${e.courseCode}] ${e.examName} (${e.courseName})\n`;
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
          output += `- ❗ **${b.title}**: R$ ${Number(b.amount || 0).toFixed(2)} (Venceu em: ${formatDateBR(b.dueDate)})\n`;
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
    const courses: any[] = Array.isArray(dashboard.courses) ? dashboard.courses : [];
    const tasks: any[] = Array.isArray(dashboard.tasks) ? dashboard.tasks : [];

    // Suporta criação em lote (cards: [...]) ou card individual
    const incomingCards: any[] = Array.isArray(args.cards)
      ? args.cards
      : args.name
      ? [args]
      : [];

    if (incomingCards.length === 0) {
      return `❌ O nome da tarefa é obrigatório para criar um card.`;
    }

    const createdList: any[] = [];
    const newTasksList = [...tasks];

    for (const cardItem of incomingCards) {
      const cardName = String(cardItem.name || '').trim();
      if (!cardName) continue;

      let courseId = '';
      let matchedCourse: any = null;
      const targetCode = cardItem.courseCode || args.courseCode;

      if (targetCode) {
        const q = String(targetCode).toLowerCase().trim();
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

      let dueDate = cardItem.dueDate ? String(cardItem.dueDate).trim() : todayStr;
      if (dueDate.toLowerCase() === 'hoje') dueDate = todayStr;
      if (dueDate.toLowerCase() === 'amanha' || dueDate.toLowerCase() === 'amanhã') {
        dueDate = getLocalDateStr(1);
      }

      const newTask = {
        id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: cardName,
        courseId,
        status: cardItem.status || 'todo',
        type: cardItem.type || 'Trabalho',
        dueDate,
        notes: cardItem.notes ? String(cardItem.notes).trim() : '',
        subtasks: Array.isArray(cardItem.subtasks) ? cardItem.subtasks : [],
      };

      newTasksList.push(newTask);
      createdList.push({ task: newTask, course: matchedCourse });
    }

    await saveStudentDashboard(userId, { ...dashboard, tasks: newTasksList });

    if (createdList.length === 1) {
      const { task: newTask, course: matchedCourse } = createdList[0];
      return `✅ **Card Criado com Sucesso no Painel do Estudante!**

- **Título:** ${newTask.name}
- **Disciplina:** ${matchedCourse ? `${matchedCourse.code} (${matchedCourse.name})` : 'Geral'}
- **Tipo:** ${newTask.type}
- **Status Inicial:** ${newTask.status === 'todo' ? 'A Fazer' : newTask.status === 'in_progress' ? 'Em Andamento' : 'Concluído'}
- **Data de Entrega:** ${formatDateBR(newTask.dueDate)}
${newTask.notes ? `- **Anotações:** ${newTask.notes}\n` : ''}
*O card já foi sincronizado e aparece na Página Inicial e no Quadro de Tarefas.*`;
    }

    return `✅ **${createdList.length} Cards Criados com Sucesso no Painel do Estudante!**\n\n` +
      createdList.map(c => `- **${c.task.name}** [${c.course?.code || 'Geral'}] — Entrega: ${formatDateBR(c.task.dueDate)} (${c.task.status})`).join('\n') +
      `\n\n*Todos os cards foram persistidos no Firestore.*`;
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
          out += `  * ${g.name}: Nota ${g.grade ?? 'Pendente'}${g.date ? ` (Data: ${formatDateBR(g.date)})` : ''}\n`;
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
      dueDate = getLocalDateStr(1);
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
- **Data de Vencimento:** ${formatDateBR(newBill.dueDate)}
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
      out += `- ${statusIcon} **${b.title}** — R$ ${Number(b.amount || 0).toFixed(2)} | Vencimento: ${formatDateBR(b.dueDate)} | Status: ${isPaid ? 'Pago' : isOverdue ? 'Atrasado' : 'Pendente'}\n`;
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
- **Data:** ${formatDateBR(newApp.date)}
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
      out += `- [${a.completed ? 'X' : ' '}] **${a.title}** — Data: ${formatDateBR(a.date)}${a.time ? ` às ${a.time}` : ''}${a.location ? ` (${a.location})` : ''} | Categoria: ${a.category || 'pessoal'}\n`;
      if (a.notes) out += `  *Nota: ${a.notes}*\n`;
    });
    return out;
  }

  // ==========================================================================
  // DISCIPLINAS: CADASTRO, ATUALIZAÇÃO E EXCLUSÃO
  // ==========================================================================
  if (name === 'create_course') {
    const dashboard = await getStudentDashboard(userId);
    const courses: any[] = Array.isArray(dashboard.courses) ? dashboard.courses : [];

    const code = String(args.code || '').trim().toUpperCase();
    const courseName = String(args.name || '').trim();

    if (!code || !courseName) {
      return `❌ Código e Nome da disciplina são obrigatórios para cadastro.`;
    }

    const existingIndex = courses.findIndex(
      (c) => c.code?.toUpperCase() === code || c.name?.toLowerCase() === courseName.toLowerCase()
    );

    if (existingIndex !== -1) {
      return `⚠️ Já existe uma disciplina cadastrada com o código **${code}** ou nome **"${courses[existingIndex].name}"**. Use a ferramenta \`update_course\` caso deseje renomear ou alterar seus dados.`;
    }

    const incomingEvaluations = Array.isArray(args.evaluations) ? args.evaluations : [];
    const incomingGrades = Array.isArray(args.grades) ? args.grades : [];
    const incomingSyllabus = Array.isArray(args.syllabus) ? args.syllabus : [];

    const grades = incomingGrades.length > 0
      ? incomingGrades
      : incomingEvaluations.map((ev: any, idx: number) => ({
          id: `g-${Date.now()}-${idx}`,
          name: ev.name || `Avaliação ${idx + 1}`,
          weight: ev.weight !== undefined ? Number(ev.weight) : 1,
          maxGrade: ev.maxGrade !== undefined ? Number(ev.maxGrade) : 10,
          grade: ev.grade !== undefined && ev.grade !== null ? Number(ev.grade) : null,
          date: ev.date || undefined,
          type: ev.type || 'Prova',
        }));

    const newCourse = {
      id: `course-${Date.now()}`,
      code,
      name: courseName,
      professor: args.professor ? String(args.professor).trim() : '',
      schedule: args.schedule ? String(args.schedule).trim() : '',
      roomOrLink: args.roomOrLink ? String(args.roomOrLink).trim() : '',
      semester: args.semester ? String(args.semester).trim() : '1º Semestre',
      year: args.year ? String(args.year).trim() : String(new Date().getFullYear()),
      inProgress: args.inProgress !== false,
      color: args.color ? String(args.color).trim() : '#10b981',
      targetAverage: args.targetAverage ? Number(args.targetAverage) : 7.0,
      grades,
      evaluations: incomingEvaluations.length > 0 ? incomingEvaluations : grades,
      syllabus: incomingSyllabus,
    };

    const updatedCourses = [...courses, newCourse];
    await saveStudentDashboard(userId, { ...dashboard, courses: updatedCourses });

    return `✅ **Disciplina Cadastrada com Sucesso no Painel do Estudante!**

- **Código:** ${newCourse.code}
- **Nome:** ${newCourse.name}
${newCourse.professor ? `- **Professor(a):** ${newCourse.professor}\n` : ''}
${newCourse.schedule ? `- **Horário:** ${newCourse.schedule}\n` : ''}
${newCourse.roomOrLink ? `- **Local:** ${newCourse.roomOrLink}\n` : ''}
- **Semestre:** ${newCourse.semester} / ${newCourse.year}
- **Status:** ${newCourse.inProgress ? 'Em Andamento (Ativa)' : 'Concluída'}
${grades.length > 0 ? `- **Avaliações Cadastradas (${grades.length}):** ${grades.map((g: any) => `${g.name} (peso ${g.weight})`).join(', ')}\n` : ''}

*A disciplina foi salva diretamente no Firestore e já está disponível em todo o painel.*`;
  }

  if (name === 'update_course') {
    const dashboard = await getStudentDashboard(userId);
    const courses: any[] = dashboard.courses || [];
    const query = String(args.courseQuery || '').trim().toLowerCase();

    const courseIndex = courses.findIndex(
      (c) =>
        c.code?.toLowerCase() === query ||
        c.id?.toLowerCase() === query ||
        c.name?.toLowerCase().includes(query) ||
        c.code?.toLowerCase().includes(query)
    );

    if (courseIndex === -1) {
      return `❌ Não encontrei nenhuma disciplina correspondente a "${args.courseQuery}". Use a ferramenta \`list_courses\` para ver as matérias existentes no banco.`;
    }

    const course = { ...courses[courseIndex] };
    const oldName = course.name;
    const oldCode = course.code;

    if (args.name) course.name = String(args.name).trim();
    if (args.code) course.code = String(args.code).trim().toUpperCase();
    if (args.professor !== undefined) course.professor = String(args.professor).trim();
    if (args.schedule !== undefined) course.schedule = String(args.schedule).trim();
    if (args.roomOrLink !== undefined) course.roomOrLink = String(args.roomOrLink).trim();
    if (args.targetAverage !== undefined) course.targetAverage = Number(args.targetAverage);
    if (args.color !== undefined) course.color = String(args.color).trim();
    if (args.inProgress !== undefined) course.inProgress = Boolean(args.inProgress);

    courses[courseIndex] = course;
    await saveStudentDashboard(userId, { ...dashboard, courses });

    return `✅ **Disciplina Atualizada / Renomeada com Sucesso!**

- **Código:** ${course.code} ${oldCode !== course.code ? `*(anteriormente: "${oldCode}")*` : ''}
- **Nome Oficial:** ${course.name} ${oldName !== course.name ? `*(anteriormente: "${oldName}")*` : ''}
${course.professor ? `- **Professor(a):** ${course.professor}\n` : ''}
${course.schedule ? `- **Horário:** ${course.schedule}\n` : ''}
${course.roomOrLink ? `- **Local:** ${course.roomOrLink}\n` : ''}
- **Status:** ${course.inProgress ? 'Em Andamento' : 'Concluída'}

*A alteração foi persistida no Firestore e já está sincronizada em todo o painel.*`;
  }

  if (name === 'delete_course') {
    const dashboard = await getStudentDashboard(userId);
    const courses: any[] = dashboard.courses || [];
    const query = String(args.courseQuery || '').trim().toLowerCase();

    const courseIndex = courses.findIndex(
      (c) =>
        c.code?.toLowerCase() === query ||
        c.id?.toLowerCase() === query ||
        c.name?.toLowerCase().includes(query)
    );

    if (courseIndex === -1) {
      return `❌ Não encontrei nenhuma disciplina com "${args.courseQuery}" para excluir.`;
    }

    const removed = courses[courseIndex];
    const updatedCourses = courses.filter((_, idx) => idx !== courseIndex);
    await saveStudentDashboard(userId, { ...dashboard, courses: updatedCourses });

    return `🗑️ **Disciplina Removida!**
A matéria **[${removed.code}] ${removed.name}** foi excluída com sucesso do painel e do banco de dados.`;
  }

  if (name === 'add_course_grade') {
    const dashboard = await getStudentDashboard(userId);
    const courses: any[] = Array.isArray(dashboard.courses) ? dashboard.courses : [];
    const query = String(args.courseQuery || '').trim().toLowerCase();

    const courseIndex = courses.findIndex(
      (c) =>
        c.code?.toLowerCase() === query ||
        c.id?.toLowerCase() === query ||
        c.name?.toLowerCase().includes(query) ||
        c.code?.toLowerCase().includes(query)
    );

    if (courseIndex === -1) {
      return `❌ Não encontrei nenhuma disciplina com "${args.courseQuery}".`;
    }

    const course = { ...courses[courseIndex] };
    const incomingEvals: any[] = Array.isArray(args.evaluations)
      ? args.evaluations
      : args.name
      ? [args]
      : [];

    if (incomingEvals.length === 0) {
      return `❌ Nome da avaliação é obrigatório.`;
    }

    const currentGrades = Array.isArray(course.grades) ? [...course.grades] : [];
    const currentEvaluations = Array.isArray(course.evaluations) ? [...course.evaluations] : [...currentGrades];
    const addedList: any[] = [];

    for (const ev of incomingEvals) {
      const newGrade = {
        id: `g-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: String(ev.name || '').trim(),
        grade: ev.grade !== undefined && ev.grade !== null && ev.grade !== '' ? Number(ev.grade) : null,
        maxGrade: ev.maxGrade ? Number(ev.maxGrade) : 10,
        weight: ev.weight ? Number(ev.weight) : 1,
        date: ev.date ? String(ev.date).trim() : undefined,
        type: ev.type ? String(ev.type).trim() : 'Prova',
      };
      currentGrades.push(newGrade);
      currentEvaluations.push(newGrade);
      addedList.push(newGrade);
    }

    course.grades = currentGrades;
    course.evaluations = currentEvaluations;
    courses[courseIndex] = course;
    await saveStudentDashboard(userId, { ...dashboard, courses });

    if (addedList.length === 1) {
      const g = addedList[0];
      return `📝 **Avaliação Adicionada em [${course.code}] ${course.name}!**

- **Nome da Avaliação:** ${g.name}
${g.date ? `- **Data:** ${formatDateBR(g.date)}\n` : ''}
${g.grade !== null ? `- **Nota Lançada:** ${g.grade} / ${g.maxGrade} (Peso: ${g.weight})\n` : `- **Status:** Agendada (Nota pendente, Peso: ${g.weight})\n`}

*A avaliação foi salva diretamente no banco de dados Firestore.*`;
    }

    return `📝 **${addedList.length} Avaliações Adicionadas em [${course.code}] ${course.name}!**\n\n` +
      addedList.map(g => `- **${g.name}** (Peso: ${g.weight}${g.date ? `, Data: ${formatDateBR(g.date)}` : ''})`).join('\n') +
      `\n\n*Todas as avaliações foram salvas diretamente no banco de dados Firestore.*`;
  }

  // ==========================================================================
  // EXCLUSÃO DE CARDS / TAREFAS
  // ==========================================================================
  if (name === 'delete_card') {
    const dashboard = await getStudentDashboard(userId);
    const tasks: any[] = dashboard.tasks || [];
    const query = String(args.taskQuery || '').trim().toLowerCase();

    const taskIndex = tasks.findIndex(
      (t) => t.id === args.taskQuery || t.name?.toLowerCase().includes(query)
    );

    if (taskIndex === -1) {
      return `❌ Não encontrei nenhuma tarefa com "${args.taskQuery}" para excluir.`;
    }

    const removed = tasks[taskIndex];
    const updatedTasks = tasks.filter((_, idx) => idx !== taskIndex);
    await saveStudentDashboard(userId, { ...dashboard, tasks: updatedTasks });

    return `🗑️ **Tarefa Excluída!**
A tarefa **"${removed.name}"** foi removida definitivamente do seu quadro de tarefas e do banco de dados.`;
  }

  // ==========================================================================
  // RECUPERAÇÃO ATIVA & REVISÕES ESPAÇADAS
  // ==========================================================================
  if (name === 'create_study_topic') {
    const dashboard = await getStudentDashboard(userId);
    const topics: any[] = dashboard.topics || [];
    const courses: any[] = dashboard.courses || [];

    let courseId = '';
    let matchedCourse: any = null;
    if (args.courseCode) {
      const q = String(args.courseCode).trim().toLowerCase();
      matchedCourse = courses.find((c) => c.code?.toLowerCase().includes(q) || c.name?.toLowerCase().includes(q));
      if (matchedCourse) courseId = matchedCourse.id;
    }
    if (!courseId && courses.length > 0) {
      matchedCourse = courses[0];
      courseId = matchedCourse.id;
    }

    const newTopic = {
      id: `topic-${Date.now()}`,
      name: String(args.name).trim(),
      courseId,
      question: args.question ? String(args.question).trim() : undefined,
      answer: args.answer ? String(args.answer).trim() : undefined,
      stage: 0,
      adaptive: true,
      lastReviewDate: undefined,
      nextReviewDate: todayStr,
      attempts: [],
      targetScore: args.targetScore ? Number(args.targetScore) : 80,
    };

    const updatedTopics = [...topics, newTopic];
    await saveStudentDashboard(userId, { ...dashboard, topics: updatedTopics });

    return `🧠 **Assunto Cadastrado na Recuperação Ativa!**

- **Tópico:** ${newTopic.name}
- **Disciplina:** ${matchedCourse ? `${matchedCourse.code} (${matchedCourse.name})` : 'Geral'}
- **Fase Inicial:** Fase 1 (Revisão em 1 semana)
- **Meta de Excelência:** ${newTopic.targetScore}%
- **Primeira Revisão:** ${formatDateBR(newTopic.nextReviewDate)} (Hoje)
${newTopic.question ? `- **Pergunta de Fixação:** ${newTopic.question}\n` : ''}

*O assunto foi salvo no Firestore e já está disponível na aba de Recuperação Ativa & Revisões.*`;
  }

  if (name === 'register_exercise_attempt') {
    const dashboard = await getStudentDashboard(userId);
    const topics: any[] = dashboard.topics || [];
    const query = String(args.topicQuery || '').trim().toLowerCase();

    const topicIndex = topics.findIndex(
      (t) => t.id === args.topicQuery || t.name?.toLowerCase().includes(query)
    );

    if (topicIndex === -1) {
      return `❌ Não encontrei nenhum tópico de estudo com "${args.topicQuery}". Use \`list_study_topics\` para ver os assuntos disponíveis.`;
    }

    const topic = { ...topics[topicIndex] };
    const total = Math.max(1, Number(args.totalExercises) || 1);
    const correct = Math.max(0, Math.min(total, Number(args.correctExercises) || 0));
    const scorePct = Number(((correct / total) * 100).toFixed(1));
    const target = topic.targetScore || 80;
    const passed = scorePct >= target;

    const newAttempt = {
      id: `attempt-${Date.now()}`,
      date: args.date ? String(args.date).trim() : todayStr,
      listTitle: args.listTitle ? String(args.listTitle).trim() : `Lista de Exercícios`,
      totalExercises: total,
      correctExercises: correct,
      scorePercentage: scorePct,
      passed,
      notes: args.notes ? String(args.notes).trim() : undefined,
    };

    const PHASES = [
      { stage: 0, label: 'Fase 1 (1 semana)', days: 7 },
      { stage: 1, label: 'Fase 2 (2 semanas)', days: 14 },
      { stage: 2, label: 'Fase 3 (4 semanas)', days: 28 },
      { stage: 3, label: 'Fase 4 (Dominado)', days: 60 },
    ];

    let nextStage = topic.stage || 0;
    let daysToAdd = 7;
    if (passed) {
      nextStage = Math.min(nextStage + 1, PHASES.length - 1);
      daysToAdd = PHASES[nextStage].days;
    } else {
      daysToAdd = 3; // Reforço necessário em 3 dias
    }

    const baseDate = /^\d{4}-\d{2}-\d{2}$/.test(newAttempt.date)
      ? new Date(`${newAttempt.date}T12:00:00Z`)
      : new Date(newAttempt.date);
    const nextDateObj = new Date(baseDate.getTime() + daysToAdd * 86400000);
    const nextReviewDate = nextDateObj.toISOString().split('T')[0];

    topic.stage = nextStage;
    topic.lastReviewDate = newAttempt.date;
    topic.nextReviewDate = nextReviewDate;
    topic.attempts = [...(topic.attempts || []), newAttempt];

    topics[topicIndex] = topic;
    await saveStudentDashboard(userId, { ...dashboard, topics });

    return `🎯 **Lista de Exercícios Registrada com Sucesso!**

- **Assunto:** ${topic.name}
- **Aproveitamento:** ${correct}/${total} (${scorePct}%)
- **Resultado:** ${passed ? `✅ Aprovado na Meta (Meta: ${target}%)` : `⚠️ Abaixo da Meta (Meta: ${target}%)`}
- **Nova Fase:** ${PHASES[nextStage].label}
- **Próxima Revisão Agendada:** ${formatDateBR(nextReviewDate)} ${passed ? `(daqui a ${daysToAdd} dias)` : '(reforço em 3 dias)'}
${newAttempt.notes ? `- **Observações:** ${newAttempt.notes}\n` : ''}

*Histórico salvo diretamente no Firestore e refletido nas estatísticas do painel.*`;
  }

  if (name === 'list_study_topics') {
    const dashboard = await getStudentDashboard(userId);
    const topics: any[] = dashboard.topics || [];
    const courses: any[] = dashboard.courses || [];

    if (topics.length === 0) {
      return `Nenhum assunto de estudo cadastrado na Recuperação Ativa. Use a ferramenta \`create_study_topic\` para cadastrar assuntos!`;
    }

    let filtered = topics;
    if (args.courseCode) {
      const q = String(args.courseCode).trim().toLowerCase();
      const course = courses.find((c) => c.code?.toLowerCase().includes(q) || c.name?.toLowerCase().includes(q));
      if (course) {
        filtered = filtered.filter((t) => t.courseId === course.id);
      }
    }
    if (args.dueOnly) {
      filtered = filtered.filter((t) => t.nextReviewDate <= todayStr);
    }

    const PHASES_LABELS = ['Fase 1 (1 semana)', 'Fase 2 (2 semanas)', 'Fase 3 (4 semanas)', 'Dominado (60 dias)'];

    let out = `# 🧠 Assuntos & Revisões Espaçadas (${filtered.length})\n\n`;
    filtered.forEach((t) => {
      const course = courses.find((c) => c.id === t.courseId);
      const isDue = t.nextReviewDate <= todayStr;
      const lastAttempt = t.attempts?.slice(-1)[0];
      const stageLabel = PHASES_LABELS[t.stage] || `Fase ${t.stage}`;

      out += `### ${isDue ? '🚨' : '📌'} ${t.name} (${course ? course.code : 'Geral'})\n`;
      out += `- **Fase Atual:** ${stageLabel}\n`;
      out += `- **Próxima Revisão:** ${formatDateBR(t.nextReviewDate)} ${isDue ? '**[HOJE / ATRASADA]**' : ''}\n`;
      if (lastAttempt) {
        out += `- **Último Desempenho:** ${lastAttempt.scorePercentage}% (${lastAttempt.correctExercises}/${lastAttempt.totalExercises}) - ${lastAttempt.passed ? 'Aprovado' : 'Reforço'}\n`;
      }
      out += `\n`;
    });

    return out;
  }

  // ==========================================================================
  // CADERNO DE ANOTAÇÕES (NOTEBOOK)
  // ==========================================================================
  if (name === 'create_note') {
    const dashboard = await getStudentDashboard(userId);
    const notes: any[] = dashboard.notes || [];

    const newNote = {
      id: `note-${Date.now()}`,
      title: String(args.title).trim(),
      content: String(args.content).trim(),
      tags: Array.isArray(args.tags) && args.tags.length > 0 ? args.tags : ['Geral'],
      createdAt: todayStr,
    };

    const updatedNotes = [newNote, ...notes];
    await saveStudentDashboard(userId, { ...dashboard, notes: updatedNotes });

    return `📓 **Anotação Criada com Sucesso no Caderno!**

- **Título:** ${newNote.title}
- **Tags:** ${newNote.tags.join(', ')}
- **Data:** ${formatDateBR(newNote.createdAt)}

*Anotação salva e sincronizada no Painel do Estudante.*`;
  }

  if (name === 'list_notes') {
    const dashboard = await getStudentDashboard(userId);
    const notes: any[] = dashboard.notes || [];

    if (notes.length === 0) {
      return `Nenhuma anotação cadastrada no Caderno de Estudos.`;
    }

    let filtered = notes;
    if (args.searchQuery) {
      const q = String(args.searchQuery).trim().toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title?.toLowerCase().includes(q) ||
          n.content?.toLowerCase().includes(q) ||
          (n.tags || []).some((tag: string) => tag.toLowerCase().includes(q))
      );
    }

    let out = `# 📓 Anotações do Caderno (${filtered.length})\n\n`;
    filtered.forEach((n) => {
      out += `### 📄 ${n.title} (${formatDateBR(n.createdAt || todayStr)})\n`;
      if (n.tags && n.tags.length > 0) {
        out += `*Tags: ${n.tags.map((t: string) => `#${t}`).join(' ')}*\n\n`;
      }
      out += `${n.content}\n\n---\n\n`;
    });

    return out;
  }

  throw new Error(`Ferramenta desconhecida: "${name}"`);
}

const MCP_RESOURCES = [
  {
    uri: 'painel://routine',
    name: 'Rotina de Estudos Atual',
    description:
      'Resumo completo da rotina, entregas do dia, tarefas pendentes, próximas provas e pendências financeiras/pessoais.',
    mimeType: 'text/markdown',
  },
  {
    uri: 'painel://courses',
    name: 'Disciplinas Matriculadas',
    description: 'Lista completa de disciplinas, horários, salas, professores e avaliações.',
    mimeType: 'text/markdown',
  },
];

const SUPPORTED_MCP_PROTOCOLS = new Set(['2024-11-05', '2025-03-26', '2025-06-18']);

// ============================================================================
// HANDLER PRINCIPAL VERCEL SERVERLESS FUNCTION
// ============================================================================
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configurar CORS completo para clientes MCP (Gemini, Claude, Cursor, Webhooks)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-api-key, Accept, Mcp-Session-Id, MCP-Protocol-Version'
  );
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');

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
  // DELETE: Encerramento de sessão Streamable HTTP
  // --------------------------------------------------------------------------
  if (req.method === 'DELETE') {
    return res.status(204).end();
  }

  // --------------------------------------------------------------------------
  // GET: Informações da API & Diagnóstico (ou 405 para stream SSE puro)
  // --------------------------------------------------------------------------
  if (req.method === 'GET') {
    const acceptHeader = String(req.headers.accept || '');

    if (
      acceptHeader.includes('text/event-stream') &&
      !acceptHeader.includes('application/json') &&
      !acceptHeader.includes('text/html')
    ) {
      res.setHeader('Allow', 'POST, GET, OPTIONS, DELETE');
      return res.status(405).json({
        error:
          'Stream SSE via GET não suportado em modo serverless; utilize Streamable HTTP via POST /api/mcp.',
      });
    }

    const admin = getAdminServices();

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
        {
          name: 'gerenciar_disciplinas',
          description: 'Revisa, renomeia ou cadastra disciplinas no banco de dados Firestore.',
        },
        {
          name: 'revisao_ativa_semanal',
          description: 'Verifica assuntos e revisões espaçadas de listas de exercícios com meta de 80%.',
        },
      ],
      resources: MCP_RESOURCES,
      diagnostics: {
        firestoreMode: admin ? 'firebase-admin' : 'rest-fallback',
        writesReady: Boolean(admin),
        adminInitError: adminInitError || null,
        authProtected: Boolean(configuredSecret),
        defaultTarget:
          CONFIGURED_DASHBOARD_ID ||
          (admin ? `auto-uid (${DEFAULT_USER_EMAIL})` : DEFAULT_DASHBOARD_ID),
        timezone: 'America/Sao_Paulo',
      },
      usage: {
        geminiConfig: {
          mcpServers: {
            painelDoEstudante: {
              url: 'https://painel-de-estudo-sage.vercel.app/api/mcp',
              transport: 'http',
            },
          },
        },
      },
    });
  }

  // --------------------------------------------------------------------------
  // POST: Mensagens JSON-RPC 2.0 (MCP Streamable HTTP Protocol)
  // --------------------------------------------------------------------------
  if (req.method === 'POST') {
    let body: any = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        return res.status(400).json({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32700, message: 'JSON inválido no corpo da requisição.' },
        });
      }
    }
    body = body || {};
    const { id, method, params } = body;

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
        const clientVersion =
          typeof params?.protocolVersion === 'string' ? params.protocolVersion : '';
        const protocolVersion = SUPPORTED_MCP_PROTOCOLS.has(clientVersion)
          ? clientVersion
          : '2024-11-05';

        const existingSessionId = req.headers['mcp-session-id'];
        const sessionId =
          typeof existingSessionId === 'string' && existingSessionId.trim()
            ? existingSessionId.trim()
            : `mcp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        res.setHeader('Mcp-Session-Id', sessionId);

        return sendResult({
          protocolVersion,
          capabilities: {
            tools: {
              listChanged: false,
            },
            prompts: {
              listChanged: false,
            },
            resources: {
              listChanged: false,
            },
          },
          serverInfo: {
            name: 'painel-do-estudante-mcp',
            version: '1.0.0',
          },
        });
      }

      // 2. Notificações JSON-RPC (sem id -> 202 Accepted)
      if (
        method === 'notifications/initialized' ||
        (typeof method === 'string' && method.startsWith('notifications/'))
      ) {
        if (id === undefined || id === null) {
          return res.status(202).end();
        }
        return sendResult({});
      }

      // 3. Ping (keep-alive / healthcheck MCP)
      if (method === 'ping') {
        return sendResult({});
      }

      // 4. Listagem de ferramentas (tools/list)
      if (method === 'tools/list') {
        return sendResult({
          tools: MCP_TOOLS,
        });
      }

      // 5. Execução de ferramenta (tools/call)
      if (method === 'tools/call') {
        const toolName = params?.name;
        const toolArgs = params?.arguments || {};

        if (!toolName) {
          return sendError(-32602, 'Parâmetro "name" da ferramenta é obrigatório');
        }

        try {
          const textOutput = await executeTool(toolName, toolArgs);
          return sendResult({
            content: [
              {
                type: 'text',
                text: textOutput,
              },
            ],
          });
        } catch (toolErr: any) {
          return sendResult({
            isError: true,
            content: [
              {
                type: 'text',
                text: `❌ Erro ao executar "${toolName}": ${toolErr?.message || 'Erro desconhecido'}`,
              },
            ],
          });
        }
      }

      // 6. Listagem de recursos (resources/list)
      if (method === 'resources/list') {
        return sendResult({
          resources: MCP_RESOURCES,
        });
      }

      // 7. Templates de recursos (resources/templates/list)
      if (method === 'resources/templates/list') {
        return sendResult({
          resourceTemplates: [],
        });
      }

      // 8. Leitura de recurso (resources/read)
      if (method === 'resources/read') {
        const uri = params?.uri;
        if (uri === 'painel://routine') {
          const text = await executeTool('get_study_routine', {});
          return sendResult({
            contents: [{ uri, mimeType: 'text/markdown', text }],
          });
        }
        if (uri === 'painel://courses') {
          const text = await executeTool('list_courses', {});
          return sendResult({
            contents: [{ uri, mimeType: 'text/markdown', text }],
          });
        }
        return sendError(-32002, `Recurso não encontrado: "${uri || ''}"`);
      }

      // 9. Listagem de prompts (prompts/list)
      if (method === 'prompts/list') {
        return sendResult({
          prompts: [
            {
              name: 'explicar_rotina',
              description: 'Pede ao Gemini para analisar a rotina e montar um plano de estudos eficiente para o dia.',
              arguments: [],
            },
            {
              name: 'gerenciar_disciplinas',
              description: 'Pede ao Gemini para revisar as matérias cadastradas, renomear códigos/nomes ou cadastrar novas disciplinas.',
              arguments: [],
            },
            {
              name: 'revisao_ativa_semanal',
              description: 'Pede ao Gemini para verificar os tópicos da Recuperação Ativa e organizar as listas de exercícios de hoje.',
              arguments: [],
            },
          ],
        });
      }

      // 10. Obtenção de prompt (prompts/get)
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
        if (promptName === 'gerenciar_disciplinas') {
          return sendResult({
            description: 'Revisão e atualização de disciplinas no banco de dados',
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: 'Por favor, liste minhas disciplinas com "list_courses". Se alguma disciplina estiver com nome desatualizado ou código diferente do oficial (como ES680), use a ferramenta "update_course" para renomear e atualizar os dados no banco de dados. Se faltar alguma matéria do semestre, use "create_course" para cadastrar.',
                },
              },
            ],
          });
        }
        if (promptName === 'revisao_ativa_semanal') {
          return sendResult({
            description: 'Organização de tópicos de estudo e listas de exercícios da semana',
            messages: [
              {
                role: 'user',
                content: {
                  type: 'text',
                  text: 'Consulte meus tópicos de estudo com "list_study_topics". Me diga quais assuntos vencem hoje ou necessitam de reforço, qual o percentual de acerto esperado (meta de 80%) e monte uma sugestão de resolução de lista para hoje.',
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
