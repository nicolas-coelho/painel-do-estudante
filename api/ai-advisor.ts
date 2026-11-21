import type { VercelRequest, VercelResponse } from '@vercel/node';

const DEFAULT_FIREBASE_WEB_API_KEY = 'AIzaSyD5uzbhpcINOZpH4w_aRBzitlKW7DErEI0';

type AdviceUrgency = 'critical' | 'high' | 'medium';
type AdviceCategory =
  | 'atividade'
  | 'prova'
  | 'financeiro'
  | 'compromisso'
  | 'revisao'
  | 'rotina';

interface AiPriorityAction {
  title: string;
  timeframe: 'hoje' | 'proximos_dias' | 'semana';
  category: AdviceCategory;
  urgency: AdviceUrgency;
  reason: string;
}

interface AiReminderItem {
  title: string;
  dueLabel: string;
  category: 'financeiro' | 'atividade' | 'compromisso' | 'prova' | 'revisao';
  detail: string;
}

interface AiAdvisoryReport {
  generatedAt: string;
  referenceDate: string;
  model: string;
  headline: string;
  summary: string;
  topPriorities: AiPriorityAction[];
  reminders: AiReminderItem[];
  insight: string;
}

const VALID_TIMEFRAMES = new Set(['hoje', 'proximos_dias', 'semana']);
const VALID_PRIORITY_CATEGORIES = new Set([
  'atividade',
  'prova',
  'financeiro',
  'compromisso',
  'revisao',
  'rotina',
]);
const VALID_REMINDER_CATEGORIES = new Set([
  'financeiro',
  'atividade',
  'compromisso',
  'prova',
  'revisao',
]);
const VALID_URGENCIES = new Set(['critical', 'high', 'medium']);

function getSaoPauloDateStr(daysOffset = 0): string {
  const target = new Date(Date.now() + daysOffset * 86400000);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(target);
}

function addDaysISO(isoDate: string, days: number): string {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return getSaoPauloDateStr(days);
  const [, y, m, d] = match;
  const utc = Date.UTC(Number(y), Number(m) - 1, Number(d) + days);
  return new Date(utc).toISOString().split('T')[0];
}

function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return 'Sem data';
  const match = String(dateStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }
  return String(dateStr);
}

function getQuadrantLabel(urgency?: string, importance?: string): string {
  if (urgency === 'high' && importance === 'high') return 'Q1 Fazer Agora';
  if (urgency === 'low' && importance === 'high') return 'Q2 Agendar';
  if (urgency === 'high' && importance === 'low') return 'Q3 Rápido';
  if (urgency === 'low' && importance === 'low') return 'Q4 Depois';
  return 'Sem classificação';
}

function getAllowedEmails(): string[] {
  const raw = process.env.ALLOWED_EMAILS || process.env.VITE_ALLOWED_EMAILS || '';
  if (!raw.trim()) return [];
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

async function verifyFirebaseIdToken(
  idToken: string
): Promise<{ uid: string; email?: string } | null> {
  const firebaseWebApiKey =
    process.env.VITE_FIREBASE_API_KEY?.trim() ||
    process.env.FIREBASE_WEB_API_KEY?.trim() ||
    DEFAULT_FIREBASE_WEB_API_KEY;

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseWebApiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!res.ok) return null;
  const data: any = await res.json().catch(() => null);
  const user = data?.users?.[0];
  if (!user?.localId) return null;

  return {
    uid: String(user.localId),
    email: user.email ? String(user.email) : undefined,
  };
}

function buildCompactContext(payload: any, todayStr: string): string {
  const courses: any[] = Array.isArray(payload?.courses) ? payload.courses : [];
  const tasks: any[] = Array.isArray(payload?.tasks) ? payload.tasks : [];
  const topics: any[] = Array.isArray(payload?.topics) ? payload.topics : [];
  const sessions: any[] = Array.isArray(payload?.sessions) ? payload.sessions : [];
  const bills: any[] = Array.isArray(payload?.personalBills) ? payload.personalBills : [];
  const appointments: any[] = Array.isArray(payload?.personalAppointments)
    ? payload.personalAppointments
    : [];

  const courseMap = new Map<string, any>();
  for (const c of courses) {
    if (c?.id) courseMap.set(c.id, c);
  }

  // 1. Atividades pendentes (até 25)
  const allPendingTasks = tasks.filter((t) => t && t.status !== 'done');
  const unclassifiedCount = allPendingTasks.filter(
    (t) =>
      (t.urgency !== 'high' && t.urgency !== 'low') ||
      (t.importance !== 'high' && t.importance !== 'low')
  ).length;

  const sortedPendingTasks = [...allPendingTasks].sort((a, b) => {
    const da = a?.dueDate || '9999-99-99';
    const db = b?.dueDate || '9999-99-99';
    return String(da).localeCompare(String(db));
  });

  const taskLines = sortedPendingTasks.slice(0, 25).map((t) => {
    const course = courseMap.get(t.courseId);
    const due = String(t.dueDate || '');
    const prazoTag = !due
      ? 'sem_prazo'
      : due < todayStr
      ? 'ATRASADA'
      : due === todayStr
      ? 'HOJE'
      : 'no_prazo';
    const quad = getQuadrantLabel(t.urgency, t.importance);
    return `- "${t.name}" | ${course?.code || 'Geral'} | ${t.type || 'Atividade'} | status:${t.status} | entrega:${formatDateBR(due)} (${prazoTag}) | matriz:${quad}`;
  });

  // 2. Próximas provas (+21 dias) & disciplinas abaixo da meta
  const in21Days = addDaysISO(todayStr, 21);
  const upcomingExams = courses
    .flatMap((c) =>
      (Array.isArray(c?.grades) ? c.grades : [])
        .filter((g: any) => g?.date && String(g.date) >= todayStr && String(g.date) <= in21Days)
        .map((g: any) => ({
          courseCode: c.code || 'DISC',
          courseName: c.name || '',
          examName: g.name || 'Avaliação',
          date: String(g.date),
          weight: g.weight,
        }))
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 10);

  const examLines = upcomingExams.map(
    (e) =>
      `- ${formatDateBR(e.date)} | [${e.courseCode}] ${e.examName}${e.weight ? ` (peso ${e.weight})` : ''}`
  );

  const lowAvgCourses: string[] = [];
  for (const c of courses) {
    if (c?.inProgress === false) continue;
    const graded = (Array.isArray(c?.grades) ? c.grades : []).filter(
      (g: any) => typeof g?.grade === 'number' && !Number.isNaN(g.grade)
    );
    if (graded.length === 0) continue;
    let sumW = 0;
    let sumGW = 0;
    for (const g of graded) {
      const w = typeof g.weight === 'number' && g.weight > 0 ? g.weight : 1;
      const maxG = typeof g.maxGrade === 'number' && g.maxGrade > 0 ? g.maxGrade : 10;
      const normalized = (g.grade / maxG) * 10;
      sumGW += normalized * w;
      sumW += w;
    }
    const avg = sumW > 0 ? sumGW / sumW : 0;
    const target = typeof c.targetAverage === 'number' ? c.targetAverage : 7.0;
    if (avg < target) {
      lowAvgCourses.push(
        `- [${c.code || c.name}] média parcial ${avg.toFixed(1)} (meta ${target.toFixed(1)})`
      );
    }
  }

  // 3. Contas pessoais pendentes (atrasadas + próximos 15 dias, até 15)
  const pendingBills = bills.filter((b) => b && b.status !== 'paid');
  const totalPendingAmount = pendingBills.reduce(
    (acc, b) => acc + (Number(b.amount) || 0),
    0
  );
  const in15Days = addDaysISO(todayStr, 15);
  const relevantBills = [...pendingBills]
    .filter((b) => !b.dueDate || String(b.dueDate) <= in15Days)
    .sort((a, b) => String(a.dueDate || '').localeCompare(String(b.dueDate || '')))
    .slice(0, 15);

  const billLines = relevantBills.map((b) => {
    const due = String(b.dueDate || '');
    const tag = !due
      ? 'sem_data'
      : due < todayStr
      ? 'ATRASADA'
      : due === todayStr
      ? 'VENCE_HOJE'
      : 'proxima';
    return `- "${b.title}" | R$ ${Number(b.amount || 0).toFixed(2)} | venc:${formatDateBR(due)} (${tag}) | cat:${b.category || 'outros'}`;
  });

  // 4. Compromissos pessoais pendentes (atrasados + próximos 7 dias, até 12)
  const in7Days = addDaysISO(todayStr, 7);
  const relevantApps = appointments
    .filter((a) => a && !a.completed && (!a.date || String(a.date) <= in7Days))
    .sort((a, b) => {
      const cmp = String(a.date || '').localeCompare(String(b.date || ''));
      if (cmp !== 0) return cmp;
      return String(a.time || '').localeCompare(String(b.time || ''));
    })
    .slice(0, 12);

  const appLines = relevantApps.map((a) => {
    const dt = String(a.date || '');
    const tag = dt && dt < todayStr ? 'atrasado' : dt === todayStr ? 'HOJE' : 'proximo';
    return `- "${a.title}" | ${formatDateBR(dt)}${a.time ? ` às ${a.time}` : ''} (${tag})${a.location ? ` | ${a.location}` : ''} | cat:${a.category || 'pessoal'}`;
  });

  // 5. Revisões de Recuperação Ativa vencidas ou de hoje (até 10)
  const dueReviews = topics
    .filter((t) => t && t.nextReviewDate && String(t.nextReviewDate) <= todayStr)
    .sort((a, b) => String(a.nextReviewDate).localeCompare(String(b.nextReviewDate)))
    .slice(0, 10);

  const reviewLines = dueReviews.map((r) => {
    const course = courseMap.get(r.courseId);
    return `- "${r.name}" (${course?.code || 'Geral'}) | prevista:${formatDateBR(r.nextReviewDate)}`;
  });

  // 6. Tempo de estudo recente
  const sevenDaysAgo = addDaysISO(todayStr, -6);
  const studiedTodayMin = sessions
    .filter((s) => s?.date === todayStr)
    .reduce((acc, s) => acc + (Number(s?.durationMinutes) || 0), 0);
  const studied7DaysMin = sessions
    .filter((s) => s?.date && String(s.date) >= sevenDaysAgo && String(s.date) <= todayStr)
    .reduce((acc, s) => acc + (Number(s?.durationMinutes) || 0), 0);

  return [
    `DATA DE REFERÊNCIA (Brasília): ${formatDateBR(todayStr)} (${todayStr})`,
    `ESTUDO RECENTE: ${studiedTodayMin} min hoje | ${studied7DaysMin} min nos últimos 7 dias.`,
    '',
    `ATIVIDADES PENDENTES (total: ${allPendingTasks.length}, sem classificação Eisenhower: ${unclassifiedCount}):`,
    taskLines.length > 0 ? taskLines.join('\n') : '- Nenhuma atividade pendente.',
    '',
    `PRÓXIMAS PROVAS (próximos 21 dias):`,
    examLines.length > 0 ? examLines.join('\n') : '- Nenhuma prova nos próximos 21 dias.',
    ...(lowAvgCourses.length > 0
      ? ['', 'DISCIPLINAS COM MÉDIA ABAIXO DA META:', lowAvgCourses.join('\n')]
      : []),
    '',
    `CONTAS PESSOAIS PENDENTES (total pendente geral: R$ ${totalPendingAmount.toFixed(2)} em ${pendingBills.length} conta(s)):`,
    billLines.length > 0 ? billLines.join('\n') : '- Nenhuma conta vencida ou nos próximos 15 dias.',
    '',
    `COMPROMISSOS PESSOAIS (até 7 dias):`,
    appLines.length > 0 ? appLines.join('\n') : '- Nenhum compromisso pendente nos próximos 7 dias.',
    '',
    `REVISÕES DE RECUPERAÇÃO ATIVA VENCIDAS/HOJE:`,
    reviewLines.length > 0 ? reviewLines.join('\n') : '- Nenhuma revisão vencida para hoje.',
  ].join('\n');
}

function parseJsonFromGemini(rawText: string): any {
  const trimmed = rawText.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error('Resposta da IA não retornou JSON válido.');
  }
}

function normalizeReport(
  raw: any,
  todayStr: string,
  model: string
): AiAdvisoryReport {
  const headline =
    typeof raw?.headline === 'string' && raw.headline.trim()
      ? raw.headline.trim().slice(0, 140)
      : 'Resumo diário de prioridades';

  const summary =
    typeof raw?.summary === 'string' && raw.summary.trim()
      ? raw.summary.trim().slice(0, 360)
      : 'Foque primeiro nas entregas e contas de hoje, mantendo espaço para o quadrante Q2.';

  const rawPriorities: any[] = Array.isArray(raw?.topPriorities) ? raw.topPriorities : [];
  const topPriorities: AiPriorityAction[] = rawPriorities
    .filter((p) => p && typeof p.title === 'string' && p.title.trim())
    .slice(0, 4)
    .map((p) => ({
      title: String(p.title).trim().slice(0, 120),
      timeframe: VALID_TIMEFRAMES.has(p.timeframe) ? p.timeframe : 'hoje',
      category: VALID_PRIORITY_CATEGORIES.has(p.category) ? p.category : 'rotina',
      urgency: VALID_URGENCIES.has(p.urgency) ? p.urgency : 'high',
      reason:
        typeof p.reason === 'string' && p.reason.trim()
          ? p.reason.trim().slice(0, 180)
          : 'Prioridade recomendada para o período.',
    }));

  const rawReminders: any[] = Array.isArray(raw?.reminders) ? raw.reminders : [];
  const reminders: AiReminderItem[] = rawReminders
    .filter((r) => r && typeof r.title === 'string' && r.title.trim())
    .slice(0, 4)
    .map((r) => ({
      title: String(r.title).trim().slice(0, 110),
      dueLabel:
        typeof r.dueLabel === 'string' && r.dueLabel.trim()
          ? r.dueLabel.trim().slice(0, 40)
          : 'Atenção',
      category: VALID_REMINDER_CATEGORIES.has(r.category) ? r.category : 'atividade',
      detail:
        typeof r.detail === 'string' && r.detail.trim()
          ? r.detail.trim().slice(0, 160)
          : '',
    }));

  const insight =
    typeof raw?.insight === 'string' && raw.insight.trim()
      ? raw.insight.trim().slice(0, 260)
      : 'Revise seus itens Q1 pela manhã e reserve blocos curtos para contas e revisões.';

  return {
    generatedAt: new Date().toISOString(),
    referenceDate: todayStr,
    model,
    headline,
    summary,
    topPriorities,
    reminders,
    insight,
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido. Use POST.' });
  }

  const geminiApiKey = process.env.GEMINI_API_KEY?.trim() || '';
  const geminiModel = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';

  if (!geminiApiKey) {
    return res.status(503).json({
      success: false,
      code: 'MISSING_API_KEY',
      error: 'A variável de ambiente GEMINI_API_KEY não está configurada na Vercel.',
    });
  }

  const authHeader = Array.isArray(req.headers.authorization)
    ? req.headers.authorization[0]
    : req.headers.authorization || '';
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!bearerMatch?.[1]) {
    return res.status(401).json({
      success: false,
      error: 'Token de autenticação Firebase ausente.',
    });
  }

  let authUser: { uid: string; email?: string } | null = null;
  try {
    authUser = await verifyFirebaseIdToken(bearerMatch[1].trim());
  } catch {
    authUser = null;
  }

  if (!authUser) {
    return res.status(401).json({
      success: false,
      error: 'Sessão inválida ou expirada. Faça login novamente.',
    });
  }

  const allowedEmails = getAllowedEmails();
  if (allowedEmails.length > 0) {
    const email = authUser.email?.trim().toLowerCase() || '';
    if (!email || !allowedEmails.includes(email)) {
      return res.status(403).json({
        success: false,
        error: 'Usuário não autorizado a acessar a consultoria.',
      });
    }
  }

  let body: any = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ success: false, error: 'Corpo JSON inválido.' });
    }
  }

  const rawToday = typeof body?.todayStr === 'string' ? body.todayStr.trim() : '';
  const todayStr = /^\d{4}-\d{2}-\d{2}$/.test(rawToday) ? rawToday : getSaoPauloDateStr();
  const contextText = buildCompactContext(body || {}, todayStr);

  const prompt = [
    'Você é o consultor pessoal de produtividade acadêmica e finanças do Painel do Estudante.',
    'Analise exclusivamente os dados reais abaixo e gere um RESUMO COMPACTO em português brasileiro.',
    'Regras obrigatórias:',
    '1. Não invente tarefas, valores, datas ou disciplinas que não estejam nos dados.',
    '2. Ordem de prioridade: (a) contas/entregas/compromissos atrasados ou de hoje, (b) atividades Q1 (Fazer Agora), (c) provas nos próximos dias e contas perto do vencimento, (d) atividades Q2 (Agendar) e revisões vencidas.',
    '3. Se houver atividades sem classificação Eisenhower, lembre brevemente nos lembretes.',
    '4. Seja conciso e acionável: headline curta (<= 10 palavras), summary em 1-2 frases, até 4 itens em topPriorities e até 4 itens em reminders.',
    '',
    'DADOS DO ESTUDANTE:',
    contextText,
  ].join('\n');

  const generationConfig: Record<string, any> = {
    temperature: 0.3,
    maxOutputTokens: 2048,
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
              timeframe: {
                type: 'STRING',
                enum: ['hoje', 'proximos_dias', 'semana'],
              },
              category: {
                type: 'STRING',
                enum: [
                  'atividade',
                  'prova',
                  'financeiro',
                  'compromisso',
                  'revisao',
                  'rotina',
                ],
              },
              urgency: {
                type: 'STRING',
                enum: ['critical', 'high', 'medium'],
              },
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

  try {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(geminiModel)}:generateContent?key=${encodeURIComponent(geminiApiKey)}`;
    const geminiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig,
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (geminiRes.status === 429) {
      return res.status(429).json({
        success: false,
        error: 'Limite temporário da API do Gemini atingido. Tente novamente em alguns minutos.',
      });
    }

    if (!geminiRes.ok) {
      const errText = await geminiRes.text().catch(() => '');
      return res.status(502).json({
        success: false,
        error: `Falha ao consultar Gemini (HTTP ${geminiRes.status}): ${errText.slice(0, 200)}`,
      });
    }

    const geminiJson: any = await geminiRes.json();
    const parts: any[] = geminiJson?.candidates?.[0]?.content?.parts || [];
    const text = parts
      .map((p) => (typeof p?.text === 'string' ? p.text : ''))
      .join('')
      .trim();

    if (!text) {
      return res.status(502).json({
        success: false,
        error: 'O Gemini retornou uma resposta vazia.',
      });
    }

    const parsed = parseJsonFromGemini(text);
    const report = normalizeReport(parsed, todayStr, geminiModel);

    return res.status(200).json({
      success: true,
      report,
    });
  } catch (err: any) {
    const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
    return res.status(isTimeout ? 504 : 500).json({
      success: false,
      error: isTimeout
        ? 'A consultoria com o Gemini demorou mais que o esperado. Tente novamente.'
        : err?.message || 'Erro interno ao gerar consultoria.',
    });
  }
}
