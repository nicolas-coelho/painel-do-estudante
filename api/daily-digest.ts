import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

// Configurações padrão
const DEFAULT_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'painel-estudante-8b2c';
const DEFAULT_DASHBOARD_ID = process.env.DEFAULT_DASHBOARD_ID || 'principal';
const TARGET_EMAIL = process.env.NOTIFICATION_EMAIL || 'nicolasplcoelho@gmail.com';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

interface Task {
  id: string;
  name: string;
  courseId: string;
  status: string;
  type: string;
  dueDate: string;
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

async function fetchDashboardData(): Promise<{
  courses: Course[];
  tasks: Task[];
  topics: StudyTopic[];
}> {
  const url = `https://firestore.googleapis.com/v1/projects/${DEFAULT_PROJECT_ID}/databases/(default)/documents/student_dashboards/${DEFAULT_DASHBOARD_ID}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Falha ao buscar documento no Firestore (${res.status} ${res.statusText})`);
  }

  const rawDoc = await res.json();
  const fields = rawDoc.fields || {};
  const parsed: any = {};
  for (const [k, v] of Object.entries(fields)) {
    parsed[k] = parseFirestoreValue(v);
  }

  return {
    courses: parsed.courses || [],
    tasks: parsed.tasks || [],
    topics: parsed.topics || [],
  };
}

function formatDateBR(dateStr?: string | null): string {
  if (!dateStr) return '';
  const match = String(dateStr).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${d}/${m}/${y}`;
  }
  return String(dateStr);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Permite GET para Vercel Cron ou POST para disparo manual
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const now = new Date();
    // Horário de Brasília / São Paulo (UTC-3)
    const brDate = new Date(now.getTime() - 3 * 3600000);
    const todayStr = brDate.toISOString().split('T')[0];

    const in7Days = new Date(brDate.getTime() + 7 * 86400000);
    const in7DaysStr = in7Days.toISOString().split('T')[0];

    const { courses, tasks, topics } = await fetchDashboardData();

    // Permite obter a chave do Resend via:
    // 1. Variável de ambiente Vercel (RESEND_API_KEY)
    // 2. Query string ou Header
    // 3. Body da requisição (do modal do site)
    const apiKey =
      process.env.RESEND_API_KEY ||
      (req.headers['x-resend-api-key'] as string) ||
      (req.query?.apiKey as string) ||
      (req.body && req.body.resendApiKey);

    // 1. Filtrar tarefas atrasadas ou para hoje
    const dueTodayOrOverdue = tasks.filter(
      (t) => t.status !== 'done' && t.dueDate && t.dueDate <= todayStr
    );

    // 2. Tarefas dos próximos 7 dias
    const upcomingTasks = tasks.filter(
      (t) => t.status !== 'done' && t.dueDate && t.dueDate > todayStr && t.dueDate <= in7DaysStr
    );

    // 3. Provas nos próximos 14 dias
    const in14Days = new Date(brDate.getTime() + 14 * 86400000).toISOString().split('T')[0];
    const upcomingExams = courses.flatMap((c) =>
      (c.grades || [])
        .filter((g) => g.date && g.date >= todayStr && g.date <= in14Days)
        .map((g) => ({
          course: c,
          exam: g,
          date: g.date!,
        }))
    ).sort((a, b) => a.date.localeCompare(b.date));

    // 4. Revisões de hoje (Active Recall)
    const dueReviews = topics.filter((top) => top.nextReviewDate && top.nextReviewDate <= todayStr);

    const totalPendencias = dueTodayOrOverdue.length + dueReviews.length;

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
    .badge-exam { background: #dbeafe; color: #1d4ed8; }
    .badge-review { background: #f3e8ff; color: #7e22ce; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; font-size: 13px; font-weight: 600; text-decoration: none; margin-top: 10px; }
    .footer { padding: 16px 24px; background: #faf9f6; border-top: 1px solid #f0f0ee; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📚 Resumo Diário do Estudante</h1>
      <p>${brDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} • ${totalPendencias} pendência(s) prioritária(s)</p>
    </div>

    <div class="content">
      <!-- TAREFAS DE HOJE OU ATRASADAS -->
      <div class="section">
        <div class="section-title">🚨 Prazos para Hoje / Atrasadas (${dueTodayOrOverdue.length})</div>
        ${dueTodayOrOverdue.length > 0 ? dueTodayOrOverdue.map(t => {
          const c = courses.find(course => course.id === t.courseId);
          return `
          <div class="item-card">
            <div class="item-title">
              <span class="badge badge-urgent">${t.dueDate < todayStr ? 'Atrasada' : 'Hoje'}</span>
              ${t.name}
            </div>
            <div class="item-meta">Disciplina: <b>${c ? c.code : 'Geral'}</b> • Entrega: ${formatDateBR(t.dueDate)}</div>
          </div>`;
        }).join('') : '<p style="font-size: 13px; color: #64748b; margin: 0;">🎉 Nenhuma tarefa atrasada ou para hoje!</p>'}
      </div>

      <!-- PROVAS PRÓXIMAS -->
      <div class="section">
        <div class="section-title">📝 Provas nos Próximos 14 Dias (${upcomingExams.length})</div>
        ${upcomingExams.length > 0 ? upcomingExams.map(ex => `
          <div class="item-card" style="border-left: 4px solid ${ex.course.color};">
            <div class="item-title">
              <span class="badge badge-exam">${ex.course.code}</span>
              ${ex.exam.name}
            </div>
            <div class="item-meta">Data da Prova: <b>${formatDateBR(ex.date)}</b> • ${ex.course.name}</div>
          </div>
        `).join('') : '<p style="font-size: 13px; color: #64748b; margin: 0;">Nenhuma prova agendada para os próximos 14 dias.</p>'}
      </div>

      <!-- REVISÕES ESPAÇADAS (ACTIVE RECALL) -->
      <div class="section">
        <div class="section-title">🧠 Revisões Espaçadas de Hoje (${dueReviews.length})</div>
        ${dueReviews.length > 0 ? dueReviews.map(r => {
          const c = courses.find(course => course.id === r.courseId);
          return `
          <div class="item-card">
            <div class="item-title">
              <span class="badge badge-review">Revisar</span>
              ${r.name}
            </div>
            <div class="item-meta">${c ? c.code : 'Geral'} • Próxima revisão agendada para hoje</div>
          </div>`;
        }).join('') : '<p style="font-size: 13px; color: #64748b; margin: 0;">Nenhuma revisão de tópicos pendente para hoje.</p>'}
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

    // Se a chave do Resend estiver configurada, faz o envio real
    if (apiKey) {
      const resend = new Resend(apiKey);
      const emailResult = await resend.emails.send({
        from: 'Painel do Estudante <onboarding@resend.dev>',
        to: TARGET_EMAIL,
        subject: `📚 [Painel do Estudante] Resumo de Hoje: ${totalPendencias} pendência(s)`,
        html: emailHtml,
      });

      if (emailResult.error) {
        return res.status(400).json({
          success: false,
          error: `Erro do Resend: ${emailResult.error.message}`,
        });
      }

      return res.status(200).json({
        success: true,
        message: `E-mail diário enviado com sucesso para ${TARGET_EMAIL}!`,
        id: emailResult.data?.id,
        pendencias: {
          tarefasUrgentes: dueTodayOrOverdue.length,
          provasProximas: upcomingExams.length,
          revisoesHoje: dueReviews.length,
        },
      });
    }

    // Caso o RESEND_API_KEY ainda não tenha sido adicionado no Vercel Dashboard
    return res.status(200).json({
      success: true,
      mode: 'preview',
      message: 'Resumo gerado com sucesso! Para envio real por e-mail, adicione a variável RESEND_API_KEY no painel da Vercel.',
      targetEmail: TARGET_EMAIL,
      pendencias: {
        tarefasUrgentes: dueTodayOrOverdue.length,
        provasProximas: upcomingExams.length,
        revisoesHoje: dueReviews.length,
      },
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
