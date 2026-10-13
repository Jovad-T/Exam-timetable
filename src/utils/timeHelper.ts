// Helper to calculate entryTime and time strings from previous period end time or period number

export function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  // Format "09:00" or "9:00"
  const clean = timeStr.trim();
  const match = clean.match(/(\d{1,2}):(\d{2})/);
  if (!match) return timeStr;

  let hours = parseInt(match[1], 10);
  let mins = parseInt(match[2], 10);

  mins += minutesToAdd;
  while (mins >= 60) {
    mins -= 60;
    hours += 1;
  }
  while (mins < 0) {
    mins += 60;
    hours -= 1;
  }

  const hStr = String(hours).padStart(2, '0');
  const mStr = String(mins).padStart(2, '0');
  return `${hStr}:${mStr}`;
}

export function extractEndTimeFromSubjectTime(timeRangeStr: string): string | null {
  // e.g. "08:30 ~ 09:00" -> "09:00", "09:20~10:20" -> "10:20", "09:30~10:20(50분)" -> "10:20"
  if (!timeRangeStr) return null;

  const matches = timeRangeStr.match(/(\d{1,2}:\d{2})\s*~\s*(\d{1,2}:\d{2})/);
  if (matches && matches[2]) {
    return matches[2];
  }
  return null;
}

export interface SuggestedTimeConfig {
  suggestedEntryTime: string;
  suggestedStartTime: string;
  suggestedEndTime: string;
  suggestedTimeRange: string;
  suggestedDuration: number;
}

export function getSuggestedTime(
  periodName: string,
  prevPeriodEndTime?: string | null,
  durationMinutes: number = 50
): SuggestedTimeConfig {
  if (prevPeriodEndTime) {
    // Break 10m for entry, 20m for exam start
    const entry = addMinutesToTime(prevPeriodEndTime, 10);
    const start = addMinutesToTime(prevPeriodEndTime, 20);
    const end = addMinutesToTime(start, durationMinutes);

    return {
      suggestedEntryTime: entry,
      suggestedStartTime: start,
      suggestedEndTime: end,
      suggestedTimeRange: `${start}~${end}`,
      suggestedDuration: durationMinutes,
    };
  }

  // Default presets based on period name
  if (periodName.includes('1')) {
    return {
      suggestedEntryTime: '08:30',
      suggestedStartTime: '08:30',
      suggestedEndTime: '09:00',
      suggestedTimeRange: '08:30 ~ 09:00',
      suggestedDuration: 30,
    };
  } else if (periodName.includes('2')) {
    const end = addMinutesToTime('09:20', durationMinutes);
    return {
      suggestedEntryTime: '09:10',
      suggestedStartTime: '09:20',
      suggestedEndTime: end,
      suggestedTimeRange: `09:20~${end}`,
      suggestedDuration: durationMinutes,
    };
  } else if (periodName.includes('3')) {
    const end = addMinutesToTime('11:00', durationMinutes);
    return {
      suggestedEntryTime: '10:50',
      suggestedStartTime: '11:00',
      suggestedEndTime: end,
      suggestedTimeRange: `11:00~${end}`,
      suggestedDuration: durationMinutes,
    };
  }

  // Fallback
  return {
    suggestedEntryTime: '09:00',
    suggestedStartTime: '09:10',
    suggestedEndTime: '10:00',
    suggestedTimeRange: '09:10~10:00',
    suggestedDuration: 50,
  };
}
