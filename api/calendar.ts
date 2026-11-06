import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';

const DEFAULT_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'painel-estudante-8b2c';
const DEFAULT_DASHBOARD_ID = process.env.DEFAULT_DASHBOARD_ID || 'principal';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.VITE_FIREBASE_API_KEY || 'AIzaSyD5uzbhpcINOZpH4w_aRBzitlKW7DErEI0';

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
        else if (key === 'DTSTART') {
          currentEvent.start = parseICalDate(value);
        } else if (key === 'DTEND') {
          currentEvent.end = parseICalDate(value);
        }
      }
    }
  }

  return events;
}

function parseICalDate(val: string) {
  // Ex: 20261106T140000Z ou 20261106
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
    const iso = `${y}-${m}-${d}T${h}:${min}:${s}Z`;
    return { dateTime: iso };
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

  // 1. Obter configurações da agenda (do query param, do Firestore ou de env)
  let icalUrl = (req.query.ical as string) || process.env.GOOGLE_CALENDAR_ICAL_URL || '';
  let calendarEmail = (req.query.email as string) || (req.query.calendarId as string) || process.env.GOOGLE_CALENDAR_EMAIL || '';

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
