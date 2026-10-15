import { ScheduleData, DayExamSchedule } from '../types/schedule';

/**
 * Returns current date and time components, prioritizing Korea Standard Time (Asia/Seoul).
 */
export function getKoreaDate(baseDate: Date = new Date()): {
  year: number;
  month: number;
  day: number;
  dayName: string;
  hours: number;
  minutes: number;
  seconds: number;
  formattedClock: string;
  formattedFullDate: string;
} {
  const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

  try {
    const kstFormatter = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      weekday: 'long',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });
    const parts = kstFormatter.formatToParts(baseDate);
    const getPart = (type: string) => Array.isArray(parts) ? parts.find((p: any) => p.type === type)?.value : undefined;

    const year = Number(getPart('year')) || baseDate.getFullYear();
    const month = Number(getPart('month')) || (baseDate.getMonth() + 1);
    const day = Number(getPart('day')) || baseDate.getDate();
    const dayName = getPart('weekday') || dayNames[baseDate.getDay()];
    const hours = Number(getPart('hour')) ?? baseDate.getHours();
    const minutes = Number(getPart('minute')) ?? baseDate.getMinutes();
    const seconds = Number(getPart('second')) ?? baseDate.getSeconds();

    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');

    return {
      year,
      month,
      day,
      dayName,
      hours,
      minutes,
      seconds,
      formattedClock: `${hh}:${mm}:${ss}`,
      formattedFullDate: `${year}년 ${month}월 ${day}일 ${dayName}`,
    };
  } catch {
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth() + 1;
    const day = baseDate.getDate();
    const dayName = dayNames[baseDate.getDay()];
    const hours = baseDate.getHours();
    const minutes = baseDate.getMinutes();
    const seconds = baseDate.getSeconds();
    const hh = String(hours).padStart(2, '0');
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');

    return {
      year,
      month,
      day,
      dayName,
      hours,
      minutes,
      seconds,
      formattedClock: `${hh}:${mm}:${ss}`,
      formattedFullDate: `${year}년 ${month}월 ${day}일 ${dayName}`,
    };
  }
}

/**
 * Checks if a specific day schedule matches a target month & day.
 */
export function matchesDayDate(dayItem: DayExamSchedule, targetMonth: number, targetDay: number): boolean {
  if (!dayItem) return false;

  const m2 = String(targetMonth).padStart(2, '0');
  const d2 = String(targetDay).padStart(2, '0');
  const m1 = String(targetMonth);
  const d1 = String(targetDay);

  const patterns = [
    `${m2}/${d2}`,
    `${m1}/${d1}`,
    `${m2}.${d2}`,
    `${m1}.${d1}`,
    `${m2}-${d2}`,
    `${m1}-${d1}`,
    `${m1}월 ${d1}일`,
    `${m1}월${d1}일`,
    `${m2}${d2}`,
  ];

  const dateStr = (dayItem.date || '').trim();
  const idStr = (dayItem.id || '').trim();
  const titleStr = (dayItem.fullTitle || '').trim();

  // 1. Direct patterns in date, id, or fullTitle
  for (const pat of patterns) {
    if (dateStr.includes(pat) || idStr.includes(pat) || titleStr.includes(pat)) {
      return true;
    }
  }

  // 2. Numeric regex extraction on dateStr (e.g. "10/14", "10.14", "10-14", "10월 14일 (수)")
  const regex = /(\d{1,2})[^\d]+(\d{1,2})/;
  const match = dateStr.match(regex);
  if (match) {
    const parsedM = parseInt(match[1], 10);
    const parsedD = parseInt(match[2], 10);
    if (parsedM === targetMonth && parsedD === targetDay) {
      return true;
    }
  }

  // 3. Regex on fullTitle
  const titleMatch = titleStr.match(regex);
  if (titleMatch) {
    const parsedM = parseInt(titleMatch[1], 10);
    const parsedD = parseInt(titleMatch[2], 10);
    if (parsedM === targetMonth && parsedD === targetDay) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a dayItem corresponds to today's date (checking both KST and local client date).
 */
export function isTodayScheduleDay(dayItem: DayExamSchedule): boolean {
  if (!dayItem) return false;

  const kst = getKoreaDate();
  if (matchesDayDate(dayItem, kst.month, kst.day)) return true;

  const now = new Date();
  if (matchesDayDate(dayItem, now.getMonth() + 1, now.getDate())) return true;

  return false;
}

/**
 * Automatically finds the exam schedule for today from the list of schedules.
 * Checks Korea Standard Time (Asia/Seoul) first, then local client time.
 */
export function findTodayScheduleDay(schedules: ScheduleData): DayExamSchedule | undefined {
  if (!schedules || schedules.length === 0) return undefined;

  // Candidates: 1. KST date, 2. Local device date
  const kst = getKoreaDate();
  const now = new Date();
  const candidates = [
    { month: kst.month, day: kst.day },
    { month: now.getMonth() + 1, day: now.getDate() },
  ];

  for (const { month, day } of candidates) {
    const found = schedules.find((s) => matchesDayDate(s, month, day));
    if (found) return found;
  }

  return undefined;
}

/**
 * Gets the active tab ID for today's schedule, or the first day as fallback.
 */
export function getTodayActiveTabId(schedules: ScheduleData): string {
  if (!schedules || schedules.length === 0) return 'day-1012';
  const todayDay = findTodayScheduleDay(schedules);
  if (todayDay) {
    return todayDay.id || todayDay.date;
  }
  return schedules[0]?.id || schedules[0]?.date || 'day-1012';
}
