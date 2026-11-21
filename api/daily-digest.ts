import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createSign } from 'node:crypto';

// ============================================================================
// CONFIGURAÇÕES PADRÃO & AUTENTICAÇÃO OAUTH2 (NATIVO NODE:CRYPTO)
// ============================================================================
const DEFAULT_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'painel-estudante-8b2c';
const DEFAULT_DASHBOARD_ID = 'principal';

interface ServiceAccountCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

interface Task {
  id: string;
  name: string;
  courseId: string;
  status: string;
  type: string;
  dueDate: string;
  urgency?: string;
  importance?: string;
}

interface GradeItem {
  id: string;
  name: string;
  date?: string;
}

interface Course {
  id: string;
  code: string;
  name: string;
  color: string;
  grades?: GradeItem[];
}

interface StudyTopic {
  id: string;
  name: string;
  nextReviewDate: string;
  courseId: string;
}

interface PersonalBill {
  id: string;
  title: string;
  amount: number;
  dueDate: string;
  category?: string;
  status: string;
}

interface PersonalAppointment {
  id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  category?: string;
  completed?: boolean;
}

interface AiDigestReport {
  headline: string;
  summary: string;
  topPriorities: {
    title: string;
    timeframe: string;
    category: string;
    urgency: string;
    reason: string;
  }[];
  reminders: {
    title: string;
    dueLabel: string;
    category: string;
    detail: string;
  }[];
  insight: string;
}

let lastEnvSignature = '';
let cachedServiceAccount: ServiceAccountCredentials | null = null;
let serviceAccountChecked = false;
let cachedAccessToken: { token: string; expiresAt: number } | null = null;
const emailToUidCache = new Map<string, string>();

function normalizeServiceAccountObject(raw: any): ServiceAccountCredentials | null {
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

function parseServiceAccountFromEnv(): ServiceAccountCredentials | null {
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

function getServiceAccount(): ServiceAccountCredentials | null {
  const envSignature = `${process.env.FIREBASE_SERVICE_ACCOUNT || ''}|${process.env.FIREBASE_CLIENT_EMAIL || ''}|${process.env.FIREBASE_PRIVATE_KEY || ''}`;
  if (envSignature !== lastEnvSignature) {
    lastEnvSignature = envSignature;
    cachedServiceAccount = null;
    serviceAccountChecked = false;
    cachedAccessToken = null;
    emailToUidCache.clear();
  }

  if (serviceAccountChecked) return cachedServiceAccount;
  serviceAccountChecked = true;
  cachedServiceAccount = parseServiceAccountFromEnv();
  return cachedServiceAccount;
}

async function getGoogleAccessToken(): Promise<string | null> {
  const sa = getServiceAccount();
  if (!sa) return null;

  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt) {
    return cachedAccessToken.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iss: sa.clientEmail,
      scope:
        'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/identitytoolkit',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  ).toString('base64url');

  const signingInput = `${header}.${payload}`;
  const signer = createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();
  const signature = signer.sign(sa.privateKey, 'base64url');
  const assertion = `${signingInput}.${signature}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${encodeURIComponent(assertion)}`,
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text().catch(() => '');
    throw new Error(
      `Falha ao obter token OAuth2 da conta de serviço (HTTP ${tokenRes.status}): ${errText.slice(0, 200)}`
    );
  }

  const tokenJson: any = await tokenRes.json();
  const accessToken = tokenJson?.access_token;
  if (!accessToken) {
    throw new Error('Resposta OAuth2 sem access_token.');
  }

  const expiresIn = Number(tokenJson.expires_in) || 3600;
  cachedAccessToken = {
    token: accessToken,
    expiresAt: Date.now() + Math.max(60, expiresIn - 120) * 1000,
  };
  return accessToken;
}

async function resolveEmailToUid(email: string, accessToken: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const cached = emailToUidCache.get(normalized);
  if (cached) return cached;

  const sa = getServiceAccount();
  const projectId = sa?.projectId || DEFAULT_PROJECT_ID;

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/accounts:lookup`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email: [normalized] }),
      }
    );
    if (res.ok) {
      const json: any = await res.json();
      const uid = json?.users?.[0]?.localId;
      if (uid) {
        emailToUidCache.set(normalized, uid);
        return uid;
      }
    }
  } catch (err: any) {
    console.warn(`Não foi possível resolver UID para ${normalized}:`, err?.message || err);
  }
  return null;
}

async function resolveTargetDocId(
  requestedUserId?: string,
  accessToken?: string | null
): Promise<string> {
  const reqId = typeof requestedUserId === 'string' ? requestedUserId.trim() : '';
  const configuredDashboardId = process.env.DEFAULT_DASHBOARD_ID?.trim() || '';
  const defaultEmail =
    process.env.DEFAULT_USER_EMAIL?.trim() ||
    process.env.NOTIFICATION_EMAIL?.trim() ||
    'nicolasplcoelho@gmail.com';

  if (reqId && reqId !== DEFAULT_DASHBOARD_ID) {
    if (reqId.includes('@') && accessToken) {
      const uid = await resolveEmailToUid(reqId, accessToken);
      if (uid) return uid;
    }
    return reqId;
  }

  if (reqId === DEFAULT_DASHBOARD_ID) {
    return DEFAULT_DASHBOARD_ID;
  }

  if (configuredDashboardId && configuredDashboardId !== DEFAULT_DASHBOARD_ID) {
    return configuredDashboardId;
  }

  if (accessToken && defaultEmail) {
    const uid = await resolveEmailToUid(defaultEmail, accessToken);
    if (uid) return uid;
  }

  return DEFAULT_DASHBOARD_ID;
}

// Converte valores da REST API do Firestore para JSON comum
function parseFirestoreValue(val: any): any {
  if (!val || typeof val !== 'object') return val;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return parseFloat(val.doubleValue);
  if ('booleanValue' in val) return val.booleanValue;
  if ('nullValue' in val) return null;
  if ('timestampValue' in val) return val.timestampValue;
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map(parseFirestoreValue);
  }
  if ('mapValue' in val) {
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      res[k] = parseFirestoreValue(v);
    }
    return res;
  }
  return val;
}

async function fetchDashboardData(requestedUserId?: string): Promise<{
  courses: Course[];
  tasks: Task[];
  topics: StudyTopic[];
  personalBills: PersonalBill[];
  personalAppointments: PersonalAppointment[];
  userEmail?: string;
  targetDoc: string;
  firestoreMode: 'service-account-oauth2' | 'rest-fallback';
}> {
  const accessToken = await getGoogleAccessToken();
  const targetDoc = await resolveTargetDocId(requestedUserId, accessToken);
  const projectId = getServiceAccount()?.projectId || DEFAULT_PROJECT_ID;

  const fetchDoc = async (docName: string): Promise<Record<string, any> | null> => {
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/student_dashboards/${encodeURIComponent(docName)}`;
    const headers: Record<string, string> = {};
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    const res = await fetch(url, { headers });
    if (res.ok) {
      const rawDoc: any = await res.json();
      const fields = rawDoc.fields || {};
      const parsed: Record<string, any> = {};
      for (const [k, v] of Object.entries(fields)) {
        parsed[k] = parseFirestoreValue(v);
      }
      return parsed;
    }
    if (res.status === 404) {
      return null;
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `Acesso negado ao buscar "${docName}" no Firestore (HTTP ${res.status}). Verifique FIREBASE_SERVICE_ACCOUNT na Vercel.`
      );
    }
    throw new Error(`Falha ao buscar documento no Firestore (${res.status} ${res.statusText})`);
  };

  let parsed = await fetchDoc(targetDoc);

  if (
    (!parsed || !Array.isArray(parsed.courses) || parsed.courses.length === 0) &&
    targetDoc !== DEFAULT_DASHBOARD_ID
  ) {
    try {
      const principalData = await fetchDoc(DEFAULT_DASHBOARD_ID);
      if (principalData) {
        parsed = { ...principalData, ...parsed };
      }
    } catch {
      // ignora erro no fallback secundário
    }
  }

  const safeData = parsed || {};

  return {
    courses: Array.isArray(safeData.courses) ? safeData.courses : [],
    tasks: Array.isArray(safeData.tasks) ? safeData.tasks : [],
    topics: Array.isArray(safeData.topics) ? safeData.topics : [],
    personalBills: Array.isArray(safeData.personalBills) ? safeData.personalBills : [],
    personalAppointments: Array.isArray(safeData.personalAppointments)
      ? safeData.personalAppointments
      : [],
    userEmail: safeData.userEmail || safeData.email,
    targetDoc,
    firestoreMode: accessToken ? 'service-account-oauth2' : 'rest-fallback',
  };
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

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function addDaysISO(isoDate: string, days: number): string {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return getLocalDateStr(days);
  const [, y, m, d] = match;
  const utc = Date.UTC(Number(y), Number(m) - 1, Number(d) + days);
  return new Date(utc).toISOString().split('T')[0];
}

function getQuadrantLabel(urgency?: string, importance?: string): string {
  if (urgency === 'high' && importance === 'high') return 'Q1 Fazer Agora';
  if (urgency === 'low' && importance === 'high') return 'Q2 Agendar';
  if (urgency === 'high' && importance === 'low') return 'Q3 Rápido';
  if (urgency === 'low' && importance === 'low') return 'Q4 Depois';
  return 'Sem classificação';
}

function buildCompactAiContext(
  data: {
    courses: Course[];
    tasks: Task[];
    topics: StudyTopic[];
    personalBills: PersonalBill[];
    personalAppointments: PersonalAppointment[];
  },
  todayStr: string
): string {
  const courseMap = new Map<string, Course>();
  for (const c of data.courses) {
    if (c?.id) courseMap.set(c.id, c);
  }

  const pendingTasks = data.tasks.filter((t) => t && t.status !== 'done');
  const unclassifiedCount = pendingTasks.filter(
    (t) =>
      (t.urgency !== 'high' && t.urgency !== 'low') ||
      (t.importance !== 'high' && t.importance !== 'low')
  ).length;

  const taskLines = [...pendingTasks]
    .sort((a, b) => String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999')))
    .slice(0, 20)
    .map((t) => {
      const c = courseMap.get(t.courseId);
      const due = String(t.dueDate || '');
      const tag = !due
        ? 'sem_prazo'
        : due < todayStr
        ? 'ATRASADA'
        : due === todayStr
        ? 'HOJE'
        : 'no_prazo';
      return `- "${t.name}" | ${c?.code || 'Geral'} | ${t.type} | entrega:${formatDateBR(due)} (${tag}) | matriz:${getQuadrantLabel(t.urgency, t.importance)}`;
    });

  const in14Days = addDaysISO(todayStr, 14);
  const examLines = data.courses
    .flatMap((c) =>
      (Array.isArray(c?.grades) ? c.grades : [])
        .filter((g) => g?.date && String(g.date) >= todayStr && String(g.date) <= in14Days)
        .map((g) => ({ code: c.code, name: g.name, date: String(g.date) }))
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10)
    .map((e) => `- ${formatDateBR(e.date)} | [${e.code}] ${e.name}`);

  const pendingBills = data.personalBills.filter((b) => b && b.status !== 'paid');
  const totalBills = pendingBills.reduce((acc, b) => acc + (Number(b.amount) || 0), 0);
  const in10Days = addDaysISO(todayStr, 10);
  const billLines = [...pendingBills]
    .filter((b) => !b.dueDate || String(b.dueDate) <= in10Days)
    .sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')))
    .slice(0, 12)
    .map((b) => {
      const due = String(b.dueDate || '');
      const tag = !due
        ? 'sem_data'
        : due < todayStr
        ? 'ATRASADA'
        : due === todayStr
        ? 'VENCE_HOJE'
        : 'proxima';
      return `- "${b.title}" | R$ ${Number(b.amount || 0).toFixed(2)} | venc:${formatDateBR(due)} (${tag})`;
    });

  const in7Days = addDaysISO(todayStr, 7);
  const appLines = data.personalAppointments
    .filter((a) => a && !a.completed && (!a.date || String(a.date) <= in7Days))
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
    .slice(0, 10)
    .map(
      (a) =>
        `- "${a.title}" | ${formatDateBR(a.date)}${a.time ? ` às ${a.time}` : ''}`
    );

  const reviewLines = data.topics
    .filter((r) => r?.nextReviewDate && r.nextReviewDate <= todayStr)
    .slice(0, 10)
    .map((r) => {
      const c = courseMap.get(r.courseId);
      return `- "${r.name}" (${c?.code || 'Geral'})`;
    });

  return [
    `DATA DE HOJE (Brasília): ${formatDateBR(todayStr)} (${todayStr})`,
    `ATIVIDADES PENDENTES (${pendingTasks.length} total, ${unclassifiedCount} sem classificação Eisenhower):`,
    taskLines.length > 0 ? taskLines.join('\n') : '- Nenhuma atividade pendente.',
    '',
    `PROVAS NOS PRÓXIMOS 14 DIAS:`,
    examLines.length > 0 ? examLines.join('\n') : '- Nenhuma prova próxima.',
    '',
    `CONTAS PESSOAIS PENDENTES (total geral: R$ ${totalBills.toFixed(2)}):`,
    billLines.length > 0 ? billLines.join('\n') : '- Nenhuma conta próxima/atrasada.',
    '',
    `COMPROMISSOS PESSOAIS (próximos 7 dias):`,
    appLines.length > 0 ? appLines.join('\n') : '- Nenhum compromisso pendente.',
    '',
    `REVISÕES PARA HOJE:`,
    reviewLines.length > 0 ? reviewLines.join('\n') : '- Nenhuma revisão pendente.',
  ].join('\n');
}

async function generateGeminiDigestReport(
  contextText: string
): Promise<AiDigestReport | null> {
  const geminiApiKey = process.env.GEMINI_API_KEY?.trim() || '';
  if (!geminiApiKey) return null;

  const geminiModel = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
  const prompt = [
    'Você é o consultor do Painel do Estudante gerando um resumo matinal compacto para e-mail.',
    'Baseie-se apenas nos dados reais abaixo, sem inventar informações.',
    'Priorize contas/tarefas atrasadas ou de hoje, itens Q1 (Fazer Agora), provas próximas e contas perto do vencimento.',
    'Responda de forma muito direta (headline <= 10 palavras, summary em 1-2 frases, até 4 topPriorities, até 3 reminders e 1 insight curto).',
    '',
    contextText,
  ].join('\n');

  const generationConfig: Record<string, any> = {
    temperature: 0.3,
    maxOutputTokens: 1536,
    responseMimeType: 'application/json',
    responseSchema: {
      type: 'OBJECT',
      required: ['headline', 'summary', 'topPriorities', 'reminders', 'insight'],
      properties: {
        headline: { type: 'STRING' },
        summary: { type: 'STRING' },
        topPriorities: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            required: ['title', 'timeframe', 'category', 'urgency', 'reason'],
            properties: {
              title: { type: 'STRING' },
              timeframe: { type: 'STRING', enum: ['hoje', 'proximos_dias', 'semana'] },
              category: {
                type: 'STRING',
                enum: ['atividade', 'prova', 'financeiro', 'compromisso', 'revisao', 'rotina'],
              },
              urgency: { type: 'STRING', enum: ['critical', 'high', 'medium'] },
              reason: { type: 'STRING' },
            },
          },
        },
        reminders: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            required: ['title', 'dueLabel', 'category', 'detail'],
            properties: {
              title: { type: 'STRING' },
              dueLabel: { type: 'STRING' },
              category: {
                type: 'STRING',
                enum: ['financeiro', 'atividade', 'compromisso', 'prova', 'revisao'],
              },
              detail: { type: 'STRING' },
            },
          },
        },
        insight: { type: 'STRING' },
      },
    },
  };

  if (geminiModel.includes('2.5')) {
    generationConfig.thinkingConfig = { thinkingBudget: 0 };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    geminiModel
  )}:generateContent?key=${encodeURIComponent(geminiApiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Gemini HTTP ${res.status}`);
  }

  const json: any = await res.json();
  const parts: any[] = json?.candidates?.[0]?.content?.parts || [];
  const rawText = parts
    .map((p) => (typeof p?.text === 'string' ? p.text : ''))
    .join('')
    .trim();

  if (!rawText) return null;

  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    const start = rawText.indexOf('{');
    const end = rawText.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    parsed = JSON.parse(rawText.slice(start, end + 1));
  }

  return {
    headline: String(parsed?.headline || 'Prioridades do dia').slice(0, 140),
    summary: String(parsed?.summary || '').slice(0, 360),
    topPriorities: Array.isArray(parsed?.topPriorities)
      ? parsed.topPriorities.slice(0, 4).map((p: any) => ({
          title: String(p?.title || '').slice(0, 120),
          timeframe: String(p?.timeframe || 'hoje'),
          category: String(p?.category || 'rotina'),
          urgency: String(p?.urgency || 'high'),
          reason: String(p?.reason || '').slice(0, 180),
        }))
      : [],
    reminders: Array.isArray(parsed?.reminders)
      ? parsed.reminders.slice(0, 3).map((r: any) => ({
          title: String(r?.title || '').slice(0, 110),
          dueLabel: String(r?.dueLabel || 'Atenção').slice(0, 40),
          category: String(r?.category || 'atividade'),
          detail: String(r?.detail || '').slice(0, 160),
        }))
      : [],
    insight: String(parsed?.insight || '').slice(0, 260),
  };
}

function getTimeframeEmailLabel(tf: string): string {
  if (tf === 'hoje') return 'HOJE';
  if (tf === 'proximos_dias') return 'PRÓX. DIAS';
  return 'SEMANA';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Permite GET para Vercel Cron / preview ou POST para disparo manual
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    let body: any = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }
    body = body || {};

    const todayStr = getLocalDateStr(0);
    const in7DaysStr = getLocalDateStr(7);
    const in14DaysStr = getLocalDateStr(14);
    const headerDateBR = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());

    const requestedUserId =
      (req.query?.userId as string) ||
      (req.query?.uid as string) ||
      (typeof body.userId === 'string' ? body.userId : '') ||
      undefined;

    const {
      courses,
      tasks,
      topics,
      personalBills,
      personalAppointments,
      userEmail,
      targetDoc,
      firestoreMode,
    } = await fetchDashboardData(requestedUserId);

    const targetEmail =
      process.env.NOTIFICATION_EMAIL?.trim() || 'nicolasplcoelho@gmail.com';

    const recipientEmail = String(
      (req.query?.email as string) || body.email || userEmail || targetEmail
    ).trim();

    // Permite obter a chave do Resend via:
    // 1. Variável de ambiente Vercel (RESEND_API_KEY)
    // 2. Header x-resend-api-key
    // 3. Body da requisição (modal) ou query string
    const apiKey = String(
      process.env.RESEND_API_KEY ||
        (req.headers['x-resend-api-key'] as string) ||
        body.resendApiKey ||
        (req.query?.apiKey as string) ||
        ''
    ).trim();

    const fromEmail = (
      process.env.RESEND_FROM_EMAIL || 'Painel do Estudante <onboarding@resend.dev>'
    ).trim();

    const isPreviewOnly =
      req.query?.preview === 'true' ||
      req.query?.dryRun === 'true' ||
      body.preview === true;

    // 1. Tarefas atrasadas ou para hoje
    const dueTodayOrOverdue = tasks.filter(
      (t) => t.status !== 'done' && t.dueDate && t.dueDate <= todayStr
    );

    // 2. Tarefas dos próximos 7 dias
    const upcomingTasks = tasks
      .filter((t) => t.status !== 'done' && t.dueDate && t.dueDate > todayStr && t.dueDate <= in7DaysStr)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    // 3. Provas nos próximos 14 dias
    const upcomingExams = courses
      .flatMap((c) =>
        (c.grades || [])
          .filter((g) => g.date && g.date >= todayStr && g.date <= in14DaysStr)
          .map((g) => ({
            course: c,
            exam: g,
            date: g.date!,
          }))
      )
      .sort((a, b) => a.date.localeCompare(b.date));

    // 4. Revisões de hoje (Active Recall)
    const dueReviews = topics.filter((top) => top.nextReviewDate && top.nextReviewDate <= todayStr);

    // 5. Contas a pagar vencendo hoje ou atrasadas
    const dueBills = personalBills
      .filter((b) => b.status !== 'paid' && b.dueDate && b.dueDate <= todayStr)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    const totalPendencias = dueTodayOrOverdue.length + dueReviews.length + dueBills.length;

    const pendenciasSummary = {
      tarefasUrgentes: dueTodayOrOverdue.length,
      tarefasProximos7Dias: upcomingTasks.length,
      provasProximas: upcomingExams.length,
      revisoesHoje: dueReviews.length,
      contasPendentesHojeOuAtrasadas: dueBills.length,
    };

    // 6. Consultoria IA (Gemini) — degrada graciosamente caso falhe ou não haja chave
    let aiReport: AiDigestReport | null = null;
    let aiError: string | undefined;
    if (process.env.GEMINI_API_KEY?.trim()) {
      try {
        const contextText = buildCompactAiContext(
          {
            courses,
            tasks,
            topics,
            personalBills,
            personalAppointments,
          },
          todayStr
        );
        aiReport = await generateGeminiDigestReport(contextText);
      } catch (err: any) {
        aiError = err?.message || 'Falha ao consultar Gemini';
        console.warn('Consultoria IA ignorada no daily-digest:', aiError);
      }
    }

    const aiBlockHtml = aiReport
      ? `
      <!-- CONSULTORIA IA (GEMINI) -->
      <div class="section" style="background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 12px; padding: 16px;">
        <div class="section-title" style="color: #3730a3; margin-bottom: 8px;">✨ Consultoria IA — O que Priorizar</div>
        <div style="font-size: 15px; font-weight: 700; color: #1e1b4b; margin-bottom: 4px;">${escapeHtml(aiReport.headline)}</div>
        <div style="font-size: 13px; color: #312e81; line-height: 1.5; margin-bottom: 12px;">${escapeHtml(aiReport.summary)}</div>
        ${
          aiReport.topPriorities.length > 0
            ? `<div style="margin-bottom: 10px;">
                ${aiReport.topPriorities
                  .map(
                    (p, idx) => `
                  <div style="background: #ffffff; border: 1px solid #e0e7ff; border-radius: 8px; padding: 10px; margin-bottom: 6px;">
                    <div style="font-size: 13px; font-weight: 600; color: #1e293b;">
                      <span style="display: inline-block; background: #4f46e5; color: #ffffff; border-radius: 999px; padding: 1px 6px; font-size: 10px; margin-right: 6px;">${idx + 1}</span>
                      <span style="display: inline-block; background: #e0e7ff; color: #3730a3; border-radius: 4px; padding: 1px 5px; font-size: 10px; font-weight: 700; margin-right: 6px;">${escapeHtml(getTimeframeEmailLabel(p.timeframe))}</span>
                      ${escapeHtml(p.title)}
                    </div>
                    <div style="font-size: 12px; color: #475569; margin-top: 3px;">${escapeHtml(p.reason)}</div>
                  </div>`
                  )
                  .join('')}
              </div>`
            : ''
        }
        ${
          aiReport.reminders.length > 0
            ? `<div style="font-size: 12px; color: #312e81; margin-bottom: 8px;">
                <b>Lembretes:</b> ${aiReport.reminders
                  .map((r) => `${escapeHtml(r.title)} (${escapeHtml(r.dueLabel)})`)
                  .join(' • ')}
              </div>`
            : ''
        }
        ${
          aiReport.insight
            ? `<div style="font-size: 12px; color: #3730a3; background: #ffffff; border-left: 3px solid #4f46e5; padding: 8px 10px; border-radius: 4px;">
                <b>Dica do dia:</b> ${escapeHtml(aiReport.insight)}
              </div>`
            : ''
        }
      </div>`
      : '';

    // Gerar HTML do E-mail (Estilo Notion / Modern Clean)
    const emailHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f6f3; color: #37352f; margin: 0; padding: 20px; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e9e9e8; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
    .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); color: #ffffff; padding: 28px 24px; }
    .header h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 700; }
    .header p { margin: 0; font-size: 13px; color: #94a3b8; }
    .content { padding: 24px; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
    .item-card { background: #fcfbf9; border: 1px solid #e9e9e8; border-radius: 8px; padding: 12px; margin-bottom: 8px; }
    .item-title { font-weight: 600; font-size: 14px; color: #1e293b; margin-bottom: 4px; }
    .item-meta { font-size: 12px; color: #64748b; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; margin-right: 6px; }
    .badge-urgent { background: #fee2e2; color: #b91c1c; }
    .badge-upcoming { background: #fef3c7; color: #b45309; }
    .badge-exam { background: #dbeafe; color: #1d4ed8; }
    .badge-review { background: #f3e8ff; color: #7e22ce; }
    .badge-bill { background: #ffe4e6; color: #be123c; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; font-size: 13px; font-weight: 600; text-decoration: none; margin-top: 10px; }
    .footer { padding: 16px 24px; background: #faf9f6; border-top: 1px solid #f0f0ee; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📚 Resumo Diário do Estudante</h1>
      <p>${escapeHtml(headerDateBR)} • ${totalPendencias} pendência(s) prioritária(s)</p>
    </div>

    <div class="content">
      ${aiBlockHtml}
      <!-- TAREFAS DE HOJE OU ATRASADAS -->
      <div class="section">
        <div class="section-title">🚨 Prazos para Hoje / Atrasadas (${dueTodayOrOverdue.length})</div>
        ${
          dueTodayOrOverdue.length > 0
            ? dueTodayOrOverdue
                .map((t) => {
                  const c = courses.find((course) => course.id === t.courseId);
                  return `
          <div class="item-card">
            <div class="item-title">
              <span class="badge badge-urgent">${t.dueDate < todayStr ? 'Atrasada' : 'Hoje'}</span>
              ${escapeHtml(t.name)}
            </div>
            <div class="item-meta">Disciplina: <b>${escapeHtml(c ? c.code : 'Geral')}</b> • Entrega: ${escapeHtml(formatDateBR(t.dueDate))}</div>
          </div>`;
                })
                .join('')
            : '<p style="font-size: 13px; color: #64748b; margin: 0;">🎉 Nenhuma tarefa atrasada ou para hoje!</p>'
        }
      </div>

      <!-- PRÓXIMOS 7 DIAS -->
      <div class="section">
        <div class="section-title">📅 Próximas Tarefas (7 dias) (${upcomingTasks.length})</div>
        ${
          upcomingTasks.length > 0
            ? upcomingTasks
                .map((t) => {
                  const c = courses.find((course) => course.id === t.courseId);
                  return `
          <div class="item-card">
            <div class="item-title">
              <span class="badge badge-upcoming">${escapeHtml(c ? c.code : 'Geral')}</span>
              ${escapeHtml(t.name)}
            </div>
            <div class="item-meta">Tipo: ${escapeHtml(t.type)} • Entrega: <b>${escapeHtml(formatDateBR(t.dueDate))}</b></div>
          </div>`;
                })
                .join('')
            : '<p style="font-size: 13px; color: #64748b; margin: 0;">Nenhuma tarefa prevista para os próximos 7 dias.</p>'
        }
      </div>

      <!-- PROVAS PRÓXIMAS -->
      <div class="section">
        <div class="section-title">📝 Provas nos Próximos 14 Dias (${upcomingExams.length})</div>
        ${
          upcomingExams.length > 0
            ? upcomingExams
                .map(
                  (ex) => `
          <div class="item-card" style="border-left: 4px solid ${escapeHtml(ex.course.color || '#2563eb')};">
            <div class="item-title">
              <span class="badge badge-exam">${escapeHtml(ex.course.code)}</span>
              ${escapeHtml(ex.exam.name)}
            </div>
            <div class="item-meta">Data da Prova: <b>${escapeHtml(formatDateBR(ex.date))}</b> • ${escapeHtml(ex.course.name)}</div>
          </div>`
                )
                .join('')
            : '<p style="font-size: 13px; color: #64748b; margin: 0;">Nenhuma prova agendada para os próximos 14 dias.</p>'
        }
      </div>

      <!-- REVISÕES ESPAÇADAS (ACTIVE RECALL) -->
      <div class="section">
        <div class="section-title">🧠 Revisões Espaçadas de Hoje (${dueReviews.length})</div>
        ${
          dueReviews.length > 0
            ? dueReviews
                .map((r) => {
                  const c = courses.find((course) => course.id === r.courseId);
                  return `
          <div class="item-card">
            <div class="item-title">
              <span class="badge badge-review">Revisar</span>
              ${escapeHtml(r.name)}
            </div>
            <div class="item-meta">${escapeHtml(c ? c.code : 'Geral')} • Revisão pendente (${escapeHtml(formatDateBR(r.nextReviewDate))})</div>
          </div>`;
                })
                .join('')
            : '<p style="font-size: 13px; color: #64748b; margin: 0;">Nenhuma revisão de tópicos pendente para hoje.</p>'
        }
      </div>

      <!-- CONTAS A PAGAR HOJE OU ATRASADAS -->
      <div class="section">
        <div class="section-title">💳 Contas a Pagar Hoje / Atrasadas (${dueBills.length})</div>
        ${
          dueBills.length > 0
            ? dueBills
                .map(
                  (b) => `
          <div class="item-card">
            <div class="item-title">
              <span class="badge badge-bill">${b.dueDate < todayStr ? 'Atrasada' : 'Vence Hoje'}</span>
              ${escapeHtml(b.title)}
            </div>
            <div class="item-meta">Valor: <b>R$ ${Number(b.amount || 0).toFixed(2)}</b> • Vencimento: ${escapeHtml(formatDateBR(b.dueDate))}</div>
          </div>`
                )
                .join('')
            : '<p style="font-size: 13px; color: #64748b; margin: 0;">Nenhuma conta vencendo hoje ou em atraso.</p>'
        }
      </div>

      <div style="text-align: center; margin-top: 30px;">
        <a href="https://painel-de-estudo-sage.vercel.app/" class="btn">Abrir Meu Painel do Estudante →</a>
      </div>
    </div>

    <div class="footer">
      Enviado automaticamente pelo seu <b>Painel do Estudante</b> via Vercel Cron.
    </div>
  </div>
</body>
</html>
    `;

    // Envia via API REST oficial do Resend quando a chave está presente e não é preview
    if (apiKey && !isPreviewOnly) {
      const resendRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [recipientEmail],
          subject: `📚 [Painel do Estudante] Resumo de Hoje: ${totalPendencias} pendência(s)`,
          html: emailHtml,
        }),
      });

      const rawText = await resendRes.text();
      let resendJson: any = null;
      try {
        resendJson = JSON.parse(rawText);
      } catch {
        // mantém rawText
      }

      if (!resendRes.ok) {
        const errMsg = resendJson?.message || resendJson?.name || rawText || resendRes.statusText;
        return res.status(resendRes.status >= 400 ? resendRes.status : 400).json({
          success: false,
          error: `Erro do Resend (${resendRes.status}): ${errMsg}`,
          resendConfigured: true,
          targetEmail: recipientEmail,
          targetDoc,
          firestoreMode,
        });
      }

      return res.status(200).json({
        success: true,
        mode: 'sent',
        message: `E-mail diário enviado com sucesso para ${recipientEmail}!`,
        id: resendJson?.id,
        resendConfigured: true,
        aiIncluded: Boolean(aiReport),
        ...(aiError ? { aiError } : {}),
        targetEmail: recipientEmail,
        targetDoc,
        firestoreMode,
        pendencias: pendenciasSummary,
      });
    }

    // Modo preview (quando ?preview=true ou RESEND_API_KEY ausente)
    return res.status(200).json({
      success: true,
      mode: 'preview',
      resendConfigured: Boolean(apiKey),
      aiIncluded: Boolean(aiReport),
      ...(aiError ? { aiError } : {}),
      firestoreMode,
      targetDoc,
      targetEmail: recipientEmail,
      message: apiKey
        ? 'Modo preview: e-mail não enviado (RESEND_API_KEY está configurada).'
        : 'Modo preview: nenhum e-mail foi enviado porque RESEND_API_KEY não está configurada na Vercel.',
      pendencias: pendenciasSummary,
      htmlPreview: emailHtml,
    });
  } catch (error: any) {
    console.error('Erro ao executar daily-digest:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Erro interno ao processar o resumo diário',
    });
  }
}
