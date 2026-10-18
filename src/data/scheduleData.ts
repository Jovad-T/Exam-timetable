import { ScheduleData } from '../types/schedule';

export const FIXED_NOTICE = "수능 및 대학수학능력시험 모의고사 전용 시스템입니다. 영어 영역 듣기평가 시간 정숙!";
export const DEFAULT_BOTTOM_NOTICE = "※ 3교시 영어 영역: 13:10 정각 영어 듣기평가 방송 송출 (13:10 종 타종 금지) ※";

export function isUnwantedBulkyNotice(text?: string): boolean {
  if (!text) return false;
  return (
    text.includes('다양한 과목 선택') ||
    text.includes('일률적으로 할 수 없음') ||
    text.includes('체험학습 불가') ||
    text.includes('자습 시작 직후 방송 지시') ||
    (text.length > 50 && /1\.\s*다양한/.test(text)) ||
    (text.length > 70 && /1\..*2\./.test(text))
  );
}

export function cleanNoticeText(notice?: string): string {
  if (!notice || isUnwantedBulkyNotice(notice)) {
    return FIXED_NOTICE;
  }
  return notice;
}

export function cleanScheduleData(data: ScheduleData): ScheduleData {
  if (!Array.isArray(data)) return data;
  return data.map((day) => ({
    ...day,
    notice: cleanNoticeText(day.notice),
  }));
}

export const defaultScheduleData: ScheduleData = [
  {
    id: "day-suneung",
    date: "11/13",
    fullTitle: "2027학년도 대학수학능력시험(수능) 전용 시간표",
    notice: FIXED_NOTICE,
    bottomNotice: "※ 3교시 영어 영역: 13:10 정각 영어 듣기평가 시작 (13:10 종 타종 금지) ※",
    schedule: [
      {
        id: "p-suneung-1",
        period: "1교시 (국어 영역)",
        subjects: [
          {
            id: "s-suneung-1-1",
            name: "국어 영역",
            entryTime: "08:10",
            time: "08:40 ~ 10:00",
            duration: 80,
            targetClass: "전체 수험생"
          }
        ]
      },
      {
        id: "p-suneung-2",
        period: "2교시 (수학 영역)",
        subjects: [
          {
            id: "s-suneung-2-1",
            name: "수학 영역",
            entryTime: "10:30",
            time: "10:30 ~ 12:10",
            duration: 100,
            targetClass: "전체 수험생"
          }
        ]
      },
      {
        id: "p-suneung-3",
        period: "점심시간 (중식 및 휴식)",
        subjects: [
          {
            id: "s-suneung-3-1",
            name: "중식 및 휴식",
            entryTime: "12:10",
            time: "12:10 ~ 13:00",
            duration: 50,
            targetClass: "전체 수험생"
          }
        ]
      },
      {
        id: "p-suneung-4",
        period: "3교시 (영어 영역 - 듣기평가 포함)",
        subjects: [
          {
            id: "s-suneung-4-1",
            name: "영어 영역 (13:10 정각 듣기평가 시작)",
            entryTime: "13:10",
            time: "13:10 ~ 14:20",
            duration: 70,
            targetClass: "전체 수험생 (정숙 필수)"
          }
        ]
      },
      {
        id: "p-suneung-5",
        period: "4교시 (한국사 및 탐구 영역)",
        subjects: [
          {
            id: "s-suneung-5-1",
            name: "한국사 / 탐구 영역",
            entryTime: "14:30",
            time: "14:30 ~ 16:37",
            duration: 127,
            targetClass: "전체 수험생"
          }
        ]
      },
      {
        id: "p-suneung-6",
        period: "5교시 (제2외국어 / 한문)",
        subjects: [
          {
            id: "s-suneung-6-1",
            name: "제2외국어 / 한문 영역",
            entryTime: "17:05",
            time: "17:05 ~ 17:45",
            duration: 40,
            targetClass: "선택 수험생"
          }
        ]
      }
    ]
  },
  {
    id: "day-mock-12",
    date: "11/18",
    fullTitle: "2026학년도 고1·고2 전국연합학력평가 시간표",
    notice: FIXED_NOTICE,
    bottomNotice: "※ 1교시 시작 전 입실을 완료하여 주시기 바랍니다 ※",
    schedule: [
      {
        id: "p-mock-1",
        period: "1교시",
        subjects: [
          {
            id: "s-mock-1-1",
            name: "국어 영역",
            entryTime: "08:10",
            time: "08:40 ~ 10:00",
            duration: 80,
            targetClass: "1학년, 2학년"
          }
        ]
      },
      {
        id: "p-mock-2",
        period: "2교시",
        subjects: [
          {
            id: "s-mock-2-1",
            name: "수학 영역",
            entryTime: "10:20",
            time: "10:30 ~ 12:10",
            duration: 100,
            targetClass: "1학년, 2학년"
          }
        ]
      },
      {
        id: "p-mock-3",
        period: "점심시간",
        subjects: [
          {
            id: "s-mock-3-1",
            name: "중식 및 휴식",
            entryTime: "12:10",
            time: "12:10 ~ 13:00",
            duration: 50,
            targetClass: "전체"
          }
        ]
      },
      {
        id: "p-mock-4",
        period: "3교시",
        subjects: [
          {
            id: "s-mock-4-1",
            name: "영어 영역",
            entryTime: "13:00",
            time: "13:10 ~ 14:20",
            duration: 70,
            targetClass: "1학년, 2학년"
          }
        ]
      },
      {
        id: "p-mock-5",
        period: "4교시",
        subjects: [
          {
            id: "s-mock-5-1",
            name: "한국사 및 탐구(사회/과학) 영역",
            entryTime: "14:25",
            time: "14:30 ~ 16:40",
            duration: 130,
            targetClass: "1학년, 2학년"
          }
        ]
      }
    ]
  },
  {
    id: "day-1012",
    date: "10/12",
    fullTitle: "2026학년도 2학기 1차 고사 시간표(10/12)",
    notice: FIXED_NOTICE,
    bottomNotice: DEFAULT_BOTTOM_NOTICE,
    schedule: [
      {
        id: "p-1012-1",
        period: "1교시",
        subjects: [
          {
            id: "s-1012-1-1",
            name: "자습",
            time: "08:30 ~ 09:00",
            duration: 30,
            targetClass: "전체"
          }
        ]
      },
      {
        id: "p-1012-2",
        period: "2교시",
        subjects: [
          {
            id: "s-1012-2-1",
            name: "기하(03)",
            entryTime: "09:10",
            time: "09:20~10:20",
            duration: 60,
            targetClass: "A206"
          },
          {
            id: "s-1012-2-2",
            name: "세계시민과 지리(07)",
            entryTime: "09:20",
            time: "09:30~10:20",
            duration: 50,
            targetClass: "1~3반"
          },
          {
            id: "s-1012-2-3",
            name: "자습",
            entryTime: "09:10",
            time: "09:20~10:20",
            duration: 60,
            targetClass: "4~8반"
          }
        ]
      },
      {
        id: "p-1012-3",
        period: "3교시",
        subjects: [
          {
            id: "s-1012-3-1",
            name: "미적분1(02)",
            entryTime: "10:50",
            time: "11:00~12:00",
            duration: 60,
            targetClass: "지정반"
          },
          {
            id: "s-1012-3-2",
            name: "자습",
            entryTime: "10:50",
            time: "11:00~12:00",
            duration: 60,
            targetClass: "A205"
          }
        ]
      }
    ]
  }
];
