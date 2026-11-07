import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';

const DEFAULT_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'painel-estudante-8b2c';
const DEFAULT_DASHBOARD_ID = process.env.DEFAULT_DASHBOARD_ID || 'principal';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.VITE_FIREBASE_API_KEY || 'AIzaSyD5uzbhpcINOZpH4w_aRBzitlKW7DErEI0';
const DEFAULT_SECRET_ICAL =
  process.env.GOOGLE_CALENDAR_ICAL_URL ||
  'https://calendar.google.com/calendar/ical/nicolasplcoelho%40gmail.com/private-91081ea5291f05674ec0cc5df9fd3401/basic.ics';

function getFirebaseAdminApp() {
  if (admin.apps.length > 0) return admin.apps[0]!;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      let raw = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      if (!raw.startsWith('{')) raw = Buffer.from(raw, 'base64').toString('utf-8');
      const serviceAccount = JSON.parse(raw);
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || DEFAULT_PROJECT_ID,
      });
    } catch {}
  }
  return admin.initializeApp({ projectId: DEFAULT_PROJECT_ID });
}

const DAY_MAP: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

function expandRecurringEvents(rawEvents: any[]): any[] {
  const result: any[] = [];
  const now = new Date();
  const windowStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const windowEnd = new Date(now.getFullYear(), now.getMonth() + 6, 0);

  for (const ev of rawEvents) {
    result.push(ev);
    if (!ev.rrule || !ev.rrule.includes('FREQ=WEEKLY')) continue;

    const rrule = ev.rrule;
    const byDayMatch = rrule.match(/BYDAY=([A-Z,]+)/);
    const targetDays = byDayMatch
      ? byDayMatch[1].split(',').map((d: string) => DAY_MAP[d.trim()]).filter((n: number | undefined) => n !== undefined)
      : null;

    let until = windowEnd;
    const untilMatch = rrule.match(/UNTIL=([0-9]+)/);
    if (untilMatch) {
      const raw = untilMatch[1];
      const uy = parseInt(raw.substring(0, 4), 10);
      const um = parseInt(raw.substring(4, 6), 10) - 1;
      const ud = parseInt(raw.substring(6, 8), 10);
      const untilDate = new Date(Date.UTC(uy, um, ud, 23, 59, 59));
      if (untilDate < until) until = untilDate;
    }

    const startIso = ev.start?.dateTime || ev.start?.date;
    if (!startIso) continue;
    const baseDate = new Date(startIso);
    if (isNaN(baseDate.getTime())) continue;

    const timeSuffix = ev.start?.dateTime && ev.start.dateTime.includes('T')
      ? ev.start.dateTime.substring(ev.start.dateTime.indexOf('T'))
      : '';
    const endTimeSuffix = ev.end?.dateTime && ev.end.dateTime.includes('T')
      ? ev.end.dateTime.substring(ev.end.dateTime.indexOf('T'))
      : '';

    let cur = new Date(baseDate.getTime());
    cur.setUTCDate(cur.getUTCDate() + 1);
    let count = 0;
    while (cur <= until && cur <= windowEnd && count++ < 300) {
      const dayOfWeek = cur.getUTCDay();
      if (!targetDays || targetDays.includes(dayOfWeek)) {
        if (cur >= windowStart) {
          const y = cur.getUTCFullYear();
          const m = String(cur.getUTCMonth() + 1).padStart(2, '0');
          const d = String(cur.getUTCDate()).padStart(2, '0');
          const dateStr = `${y}-${m}-${d}`;
          result.push({
            ...ev,
            id: `${ev.id}_${dateStr}`,
            start: timeSuffix ? { dateTime: `${dateStr}${timeSuffix}` } : { date: dateStr },
            end: endTimeSuffix ? { dateTime: `${dateStr}${endTimeSuffix}` } : (ev.end?.date ? { date: dateStr } : undefined),
          });
        }
      }
      cur.setUTCDate(cur.getUTCDate() + 1);
    }
  }
  return result;
}

// Parser simples e eficiente para feeds iCalendar (.ics) do Google Calendar
function parseICal(icsText: string) {
  const events: any[] = [];
  const lines = icsText.replace(/\r\n /g, '').split(/\r\n|\n|\r/);
  let currentEvent: any = null;

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      currentEvent = {};
    } else if (line.startsWith('END:VEVENT')) {
      if (currentEvent && currentEvent.summary && currentEvent.start) {
        events.push(currentEvent);
      }
      currentEvent = null;
    } else if (currentEvent) {
      const colonIdx = line.indexOf(':');
      if (colonIdx > 0) {
        const fullKey = line.substring(0, colonIdx);
        const value = line.substring(colonIdx + 1).replace(/\\,/g, ',').replace(/\\n/g, '\n');
        const key = fullKey.split(';')[0];

        if (key === 'UID') currentEvent.id = value;
        else if (key === 'SUMMARY') currentEvent.summary = value;
        else if (key === 'DESCRIPTION') currentEvent.description = value;
        else if (key === 'LOCATION') currentEvent.location = value;
        else if (key === 'RRULE') currentEvent.rrule = value;
        else if (key === 'DTSTART') {
          currentEvent.start = parseICalDate(value, fullKey);
        } else if (key === 'DTEND') {
          currentEvent.end = parseICalDate(value, fullKey);
        }
      }
    }
  }

  return expandRecurringEvents(events);
}

function parseICalDate(val: string, fullKey?: string) {
  if (val.length === 8) {
    const y = val.substring(0, 4);
    const m = val.substring(4, 6);
    const d = val.substring(6, 8);
    return { date: `${y}-${m}-${d}` };
  }
  if (val.includes('T')) {
    const clean = val.replace(/[^0-9T]/g, '');
    const y = clean.substring(0, 4);
    const m = clean.substring(4, 6);
    const d = clean.substring(6, 8);
    const h = clean.substring(9, 11) || '00';
    const min = clean.substring(11, 13) || '00';
    const s = clean.substring(13, 15) || '00';
    if (val.endsWith('Z')) {
      return { dateTime: `${y}-${m}-${d}T${h}:${min}:${s}Z` };
    }
    // Timezone local Brasil (UTC-3)
    return { dateTime: `${y}-${m}-${d}T${h}:${min}:${s}-03:00` };
  }
  return { date: val };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 1. Obter configurações da agenda (do query param, do Firestore ou de env/default)
  let icalUrl =
    (req.query.ical as string) ||
    process.env.GOOGLE_CALENDAR_ICAL_URL ||
    DEFAULT_SECRET_ICAL;
  let calendarEmail =
    (req.query.email as string) ||
    (req.query.calendarId as string) ||
    process.env.GOOGLE_CALENDAR_EMAIL ||
    'nicolasplcoelho@gmail.com';

  // Se não foi passado via query nem env, tenta ler do Firestore
  if (!icalUrl && !calendarEmail) {
    try {
      getFirebaseAdminApp();
      const snap = await admin.firestore().collection('student_dashboards').doc(DEFAULT_DASHBOARD_ID).get();
      if (snap.exists) {
        const data = snap.data() || {};
        if (data.calendarIcalUrl) icalUrl = data.calendarIcalUrl;
        if (data.calendarId) calendarEmail = data.calendarId;
      }
    } catch (e) {
      console.warn('Não foi possível ler do Firestore no /api/calendar:', e);
    }
  }

  // Fallback para e-mail padrão do projeto se nada configurado
  if (!calendarEmail) {
    calendarEmail = 'nicolasplcoelho@gmail.com';
  }

  // 2. Se temos uma URL iCal configurada (Endereço Secreto iCal do Google), busca direto
  if (icalUrl) {
    try {
      const response = await fetch(icalUrl);
      if (response.ok) {
        const icsText = await response.text();
        const events = parseICal(icsText);
        res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=600');
        return res.status(200).json({ source: 'ical', events });
      }
    } catch (err: any) {
      console.error('Erro ao buscar feed iCal do Google:', err);
    }
  }

  // 3. Tentar via Google Calendar API REST pública com API Key
  if (calendarEmail && GOOGLE_API_KEY) {
    try {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).toISOString();
      const nextYear = new Date(now.getFullYear() + 1, now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const apiUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calendarEmail
      )}/events?timeMin=${encodeURIComponent(firstDay)}&timeMax=${encodeURIComponent(nextYear)}&singleEvents=true&orderBy=startTime&maxResults=2500&key=${GOOGLE_API_KEY}`;

      const apiRes = await fetch(apiUrl);
      if (apiRes.ok) {
        const data = await apiRes.json();
        const validItems = (data.items || []).filter(
          (i: any) => i && i.status !== 'cancelled' && i.start && (i.start.dateTime || i.start.date)
        );
        res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=600');
        return res.status(200).json({ source: 'google_api_key', events: validItems });
      }
    } catch (err) {
      console.warn('Erro ao consultar via Google API Key:', err);
    }
  }

  // Se nenhuma fonte retornou eventos, retorna lista vazia e guia de conexão permanente
  return res.status(200).json({
    source: 'none',
    events: [],
    message: 'Nenhum feed permanente configurado ainda.',
    setupGuide: {
      step1: 'Acesse o Google Calendar no computador > Configurações da sua agenda.',
      step2: 'Role até "Integrar agenda" e copie o "Endereço secreto no formato iCal".',
      step3: 'Cole nas Configurações da Agenda do Painel para sincronizar 24/7 sem login.',
    },
  });
}
