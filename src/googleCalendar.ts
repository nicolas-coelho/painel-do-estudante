import { getFirebaseAuth } from './firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const STORAGE_CALENDAR_TOKEN = 'google_calendar_access_token';

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
  hangoutLink?: string;
  htmlLink?: string;
}

export function getSavedCalendarToken(): string | null {
  return localStorage.getItem(STORAGE_CALENDAR_TOKEN);
}

export function saveCalendarToken(token: string) {
  localStorage.setItem(STORAGE_CALENDAR_TOKEN, token);
}

export function removeCalendarToken() {
  localStorage.removeItem(STORAGE_CALENDAR_TOKEN);
}

// Autentica solicitando permissão para acessar o Google Calendar via API
export async function connectGoogleCalendarApi(): Promise<{ token: string; email?: string }> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error('Firebase não inicializado. Verifique a configuração.');

  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/calendar.events');
  provider.setCustomParameters({ prompt: 'consent' });

  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;

    if (!token) {
      throw new Error(
        'O Google não retornou o token de acesso à API. Verifique se o provedor Google está ativo no Firebase Console.'
      );
    }

    saveCalendarToken(token);
    return { token, email: result.user.email || undefined };
  } catch (err: any) {
    console.error('Erro na autenticação com Google Calendar:', err);
    const code = err.code || '';
    if (code === 'auth/unauthorized-domain') {
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'seu domínio';
      throw new Error(
        `UNAUTHORIZED_DOMAIN: O domínio "${hostname}" não está autorizado no Firebase Authentication. Adicione-o em Firebase Console > Authentication > Settings > Authorized Domains.`
      );
    }
    if (code === 'auth/popup-blocked') {
      throw new Error('POPUP_BLOCKED: O navegador bloqueou a janela pop-up do Google. Por favor, permita pop-ups para este site.');
    }
    if (code === 'auth/popup-closed-by-user') {
      throw new Error('A janela de autorização do Google foi fechada antes de concluir o login.');
    }
    if (code === 'auth/operation-not-allowed') {
      throw new Error('OPERATION_NOT_ALLOWED: O login com Google ainda não foi ativado no Firebase Console > Authentication > Sign-in method.');
    }
    throw err;
  }
}

// Busca eventos reais diretamente da API do Google Calendar (REST com paginação completa)
export async function fetchGoogleCalendarEvents(
  token: string,
  timeMin?: string,
  timeMax?: string
): Promise<GoogleCalendarEvent[]> {
  // Padrão: inicia no 1º dia do mês corrente às 00:00:00 (descarta meses passados antigos)
  const now = new Date();
  const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0).toISOString();
  const oneYearAhead = new Date(now.getFullYear() + 1, now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const min = timeMin || firstDayThisMonth;
  const max = timeMax || oneYearAhead;

  let allItems: any[] = [];
  let pageToken: string | null = null;
  let pageCount = 0;

  do {
    pageCount++;
    let url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(
      min
    )}&timeMax=${encodeURIComponent(max)}&singleEvents=true&orderBy=startTime&maxResults=2500`;

    if (pageToken) {
      url += `&pageToken=${encodeURIComponent(pageToken)}`;
    }

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        removeCalendarToken();
        throw new Error('SESSION_EXPIRED: Sua sessão do Google Calendar expirou (o token dura 1 hora). Conecte novamente.');
      }
      const errData = await res.json().catch(() => ({}));
      const msg = errData?.error?.message || `Erro da API do Google (${res.status}): ${res.statusText}`;

      // Detecção inteligente de API desativada no Google Cloud Console
      if (
        res.status === 403 &&
        (msg.includes('calendar-json.googleapis.com') ||
          msg.includes('has not been used') ||
          msg.includes('disabled') ||
          msg.includes('PERMISSION_DENIED') ||
          msg.includes('Access Not Configured'))
      ) {
        throw new Error(
          'API_NOT_ENABLED: A API do Google Calendar ainda não foi ativada no projeto Google Cloud do Firebase. Você precisa ativá-la no Google Cloud Console com 1 clique para sincronizar os eventos.'
        );
      }

      throw new Error(msg);
    }

    const data = await res.json();
    if (data.items && Array.isArray(data.items)) {
      allItems = allItems.concat(data.items);
    }
    pageToken = data.nextPageToken || null;
  } while (pageToken && pageCount < 10);

  // Filtra itens válidos e remove cancelados/deletados
  const validItems: GoogleCalendarEvent[] = allItems.filter(
    (item: any) =>
      item &&
      item.status !== 'cancelled' &&
      item.start &&
      (item.start.dateTime || item.start.date)
  );

  return validItems;
}

// Cria um evento real diretamente no Google Calendar via API
export async function createGoogleCalendarEventDirect(
  token: string,
  event: {
    summary: string;
    description?: string;
    startDate: string; // YYYY-MM-DD
    startTime?: string; // HH:mm
    endDate?: string;
    endTime?: string;
    location?: string;
  }
): Promise<GoogleCalendarEvent> {
  let startObj: any = {};
  let endObj: any = {};

  if (event.startTime) {
    const startIso = `${event.startDate}T${event.startTime}:00`;
    const endIso = event.endTime ? `${event.endDate || event.startDate}T${event.endTime}:00` : `${event.startDate}T${event.startTime}:00`;
    startObj = { dateTime: new Date(startIso).toISOString() };
    endObj = { dateTime: new Date(endIso).toISOString() };
  } else {
    startObj = { date: event.startDate };
    endObj = { date: event.endDate || event.startDate };
  }

  const body = {
    summary: event.summary,
    description: event.description || 'Criado via Painel do Estudante',
    start: startObj,
    end: endObj,
    location: event.location,
  };

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Erro ao criar evento no Google Calendar');
  }

  return await res.json();
}
