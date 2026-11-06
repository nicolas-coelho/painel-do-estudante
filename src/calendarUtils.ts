import { Course } from './types';
import { GoogleCalendarEvent } from './googleCalendar';

export interface CourseClassSession {
  course: Course;
  time: string;
  room: string;
}

/**
 * Retorna as aulas programadas para um determinado dia da semana com base no campo `schedule` das matérias ativas.
 * @param courses Lista de disciplinas
 * @param dayOfWeek Dia da semana (0 = Domingo, 1 = Segunda, 2 = Terça, 3 = Quarta, 4 = Quinta, 5 = Sexta, 6 = Sábado)
 */
export function getClassesForDayOfWeek(courses: Course[], dayOfWeek: number): CourseClassSession[] {
  const patterns: { [key: number]: RegExp } = {
    0: /dom(ingo)?/i,
    1: /seg(unda)?/i,
    2: /ter(ça|ca)?/i,
    3: /qua(rta)?/i,
    4: /qui(nta)?/i,
    5: /sex(ta)?/i,
    6: /s[aá]b(ado)?/i,
  };

  const pattern = patterns[dayOfWeek];
  if (!pattern) return [];

  return courses
    .filter((c) => c.inProgress !== false && c.schedule && pattern.test(c.schedule))
    .map((c) => {
      // Extrai o horário se existir (ex: 10:00 - 12:00)
      const timeMatch = c.schedule.match(/\d{1,2}:\d{2}\s*(-|às|a)\s*\d{1,2}:\d{2}/i);
      return {
        course: c,
        time: timeMatch ? timeMatch[0] : c.schedule,
        room: c.roomOrLink || 'Sala a definir',
      };
    });
}

/**
 * Extrai de forma segura a data no formato YYYY-MM-DD no fuso local a partir de um evento do Google Calendar
 */
export function getEventDateStr(ev: GoogleCalendarEvent): string {
  if (!ev || !ev.start) return '';
  if (ev.start.date) return ev.start.date;
  if (ev.start.dateTime) {
    const d = new Date(ev.start.dateTime);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }
  }
  return '';
}

/**
 * Extrai a hora de início formatada (HH:mm) de um evento do Google Calendar
 */
export function getEventTimeStr(ev: GoogleCalendarEvent): string {
  if (!ev || !ev.start?.dateTime) return '';
  const d = new Date(ev.start.dateTime);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
