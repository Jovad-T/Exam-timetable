import { ScheduleData, DayExamSchedule } from '../types/schedule';

export const FIXED_NOTICE = "최선을 다하기! 부정행위 금지! 책상 서랍 비우기! 수정테이프 불가!";
export const DEFAULT_BOTTOM_NOTICE = "※ 시험 시작 10분 전까지 입실을 완료하여 주시기 바랍니다 ※";

export const SUNEUNG_NOTICE = "※ 08:20 입실·조례(통신기기 수거) | 3교시 영어 영역: 13:10 정각 영어 듣기평가 시작 (13:10 타종 절대 금지 및 교내 정숙) ※";
export const SUNEUNG_BOTTOM_NOTICE = "※ 준비령에 맞추어 답안지·문제지 배부 | 3교시 영어 영역 13:10분은 듣기평가 방송이 시작되므로 타종 및 차임벨이 울리지 않습니다 ※";

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
  if (!notice) return "";
  if (
    isUnwantedBulkyNotice(notice) ||
    notice.includes('08:20 입실·조례') ||
    notice.includes('13:10 정각 영어 듣기평가') ||
    notice === SUNEUNG_NOTICE
  ) {
    return "";
  }
  return notice;
}

export function cleanScheduleData(data: ScheduleData): ScheduleData {
  if (!Array.isArray(data) || data.length === 0) return allComprehensiveScheduleData;

  // 1. Remove all Suneung schedules completely (user requested removal of 고3 수능)
  const filtered = data.filter((day) => !isSuneungSchedule(day));

  const upgraded = filtered.map((day) => {
    // 2. Preserve user-customized mock exam schedule subjects while normalizing metadata
    if (
      day.id === 'day-mock-g12' ||
      day.date === '모의고사' ||
      (day.fullTitle && (day.fullTitle.includes('전국연합학력평가') || day.fullTitle.includes('모의고사')))
    ) {
      const hasCustomSchedule = Array.isArray(day.schedule) && day.schedule.length > 0;
      return {
        ...mockDaySchedule,
        ...day,
        id: 'day-mock-g12',
        date: '모의고사',
        fullTitle: day.fullTitle && !day.fullTitle.includes('10월 20일') ? day.fullTitle : '전국연합학력평가',
        notice: cleanNoticeText(day.notice),
        bottomNotice: day.bottomNotice ?? '',
        schedule: hasCustomSchedule ? day.schedule : mockDaySchedule.schedule,
      };
    }

    return {
      ...day,
      notice: cleanNoticeText(day.notice),
    };
  });

  // Ensure date-agnostic mockDaySchedule is always present as the first item
  const mockItem = upgraded.find((d) => d.id === 'day-mock-g12' || d.date === '모의고사') || mockDaySchedule;

  return [mockItem, ...upgraded.filter((d) => d.id !== 'day-mock-g12' && d.date !== '모의고사')];
}

/**
 * Checks if a given schedule corresponds to Suneung (고3) or Mock Exam (고1·2 전국연합학력평가)
 */
export function isSuneungOrMockSchedule(day?: DayExamSchedule | null): boolean {
  if (!day) return false;
  const title = (day.fullTitle || '').toLowerCase();
  const id = (day.id || '').toLowerCase();
  const notice = (day.notice || '').toLowerCase();
  return (
    title.includes('수능') ||
    title.includes('모의고사') ||
    title.includes('학력평가') ||
    title.includes('12156') ||
    id.includes('suneung') ||
    id.includes('mock') ||
    notice.includes('듣기평가') ||
    day.date === '모의고사' ||
    day.date === '11/13'
  );
}

export function isMockSchedule(day?: DayExamSchedule | null): boolean {
  if (!day) return false;
  const title = (day.fullTitle || '').toLowerCase();
  const id = (day.id || '').toLowerCase();
  return (
    title.includes('모의고사') ||
    title.includes('학력평가') ||
    title.includes('12156') ||
    id.includes('mock') ||
    day.date === '모의고사'
  );
}

export function isSuneungSchedule(day?: DayExamSchedule | null): boolean {
  if (!day) return false;
  const title = (day.fullTitle || '').toLowerCase();
  const id = (day.id || '').toLowerCase();
  return (title.includes('대학수학능력시험') || id.includes('suneung') || day.date === '11/13') && !isMockSchedule(day);
}

export function isRegularSchedule(day?: DayExamSchedule | null): boolean {
  if (!day) return false;
  return !isSuneungOrMockSchedule(day);
}

// 1. 전국연합학력평가 모의고사 타종 시간표 (상시/자율 운용 · 예비령 / 준비령 / 본령 중심)
export const mockDaySchedule: DayExamSchedule = {
  id: "day-mock-g12",
  date: "모의고사",
  fullTitle: "전국연합학력평가",
  notice: "",
  bottomNotice: "",
  schedule: [
    {
      id: "p-mk-1",
      period: "1교시",
      subjects: [
        {
          id: "s-mk-1-1",
          name: "국어 영역",
          entryTime: "08:25",
          preliminaryBell: "08:25",
          prepTimeRange: "08:35",
          time: "08:40 ~ 10:00",
          duration: 80,
          endBell: "10:00",
          targetClass: "전체"
        }
      ]
    },
    {
      id: "p-mk-2",
      period: "2교시",
      subjects: [
        {
          id: "s-mk-2-1",
          name: "수학 영역",
          entryTime: "10:20",
          preliminaryBell: "10:20",
          prepTimeRange: "10:25",
          time: "10:30 ~ 12:10",
          duration: 100,
          endBell: "12:10",
          targetClass: "전체"
        }
      ]
    },
    {
      id: "p-mk-3",
      period: "3교시",
      subjects: [
        {
          id: "s-mk-3-1",
          name: "영어 영역",
          entryTime: "12:55",
          preliminaryBell: "12:55",
          prepTimeRange: "13:00",
          time: "13:10 ~ 14:20",
          duration: 70,
          endBell: "14:20",
          targetClass: "전체"
        }
      ]
    },
    {
      id: "p-mk-4",
      period: "4교시",
      subjects: [
        {
          id: "s-mk-4-1",
          name: "한국사",
          entryTime: "14:40",
          preliminaryBell: "14:40",
          prepTimeRange: "14:45",
          time: "14:50 ~ 15:20",
          duration: 30,
          endBell: "15:20",
          targetClass: "전체"
        },
        {
          id: "s-mk-4-2",
          name: "통합사회 (탐구 1)",
          entryTime: "15:25",
          preliminaryBell: "15:25",
          prepTimeRange: "15:30",
          time: "15:35 ~ 16:15",
          duration: 40,
          endBell: "16:15",
          targetClass: "전체"
        },
        {
          id: "s-mk-4-3",
          name: "통합과학 (탐구 2)",
          entryTime: "16:20",
          preliminaryBell: "16:20",
          prepTimeRange: "16:25",
          time: "16:30 ~ 17:10",
          duration: 40,
          endBell: "17:10",
          targetClass: "전체"
        }
      ]
    }
  ]
};

// 2. 고3 대학수학능력시험 (수능) 공식 표준 시간표
export const suneungDaySchedule: DayExamSchedule = {
  id: "day-suneung-g3",
  date: "11/13",
  fullTitle: "2027학년도 대학수학능력시험(고3 수능) 표준 시간표",
  notice: SUNEUNG_NOTICE,
  bottomNotice: SUNEUNG_BOTTOM_NOTICE,
  schedule: [
    {
      id: "p-sn-1",
      period: "1교시 (국어)",
      subjects: [
        {
          id: "s-sn-1-1",
          name: "국어 영역",
          entryTime: "08:10",
          prepTimeRange: "08:25 ~ 08:40",
          time: "08:40 ~ 10:00",
          duration: 80,
          proceedGuide: "08:10 입실완료 / 08:25 예비령 / 08:35 준비령 / 08:40 본령",
          supervisorInfo: "1교시 감독관",
          targetClass: "수험생 전체 (08:10 입실완료 / 08:25 예비령 / 08:35 준비령 / 08:40 본령 / 09:50 예령 / 10:00 종료령)"
        }
      ]
    },
    {
      id: "p-sn-break-1",
      period: "휴식시간",
      subjects: [
        {
          id: "s-sn-b1-1",
          name: "1교시 종료 후 휴식 (2교시 입실 완료: 10:20)",
          entryTime: "10:20",
          time: "10:00 ~ 10:20",
          duration: 20,
          targetClass: "전체 (다음 교시: 2교시 수학 영역)"
        }
      ]
    },
    {
      id: "p-sn-2",
      period: "2교시 (수학)",
      subjects: [
        {
          id: "s-sn-2-1",
          name: "수학 영역",
          entryTime: "10:20",
          prepTimeRange: "10:25 ~ 10:30",
          time: "10:30 ~ 12:10",
          duration: 100,
          proceedGuide: "10:20 입실완료 / 10:25 준비령 / 10:30 본령",
          supervisorInfo: "2교시 감독관",
          targetClass: "수험생 전체 (10:20 입실완료 / 10:25 준비령 / 10:30 본령 / 12:00 예령 / 12:10 종료령)"
        }
      ]
    },
    {
      id: "p-sn-lunch",
      period: "점심시간",
      subjects: [
        {
          id: "s-sn-lunch-1",
          name: "중식 및 휴식 (3교시 입실 완료: 13:00까지 필히 입실)",
          entryTime: "13:00",
          time: "12:10 ~ 13:00",
          duration: 50,
          targetClass: "전체 수험생 (중식 후 13:00 정각 전원 착석 완료)"
        }
      ]
    },
    {
      id: "p-sn-3",
      period: "3교시 (영어)",
      subjects: [
        {
          id: "s-sn-3-1",
          name: "영어 영역 (13:10 정각 듣기평가 시작 · 타종 절대 금지)",
          entryTime: "13:00",
          prepTimeRange: "13:00 ~ 13:10",
          time: "13:10 ~ 14:20",
          duration: 70,
          proceedGuide: "13:00 입실완료 / 13:07 준비령 / 13:10 무타종 듣기평가 방송",
          supervisorInfo: "3교시 감독관",
          targetClass: "수험생 전체 (13:00 입실완료 / 13:07 준비령 / 13:10 본령 타종 없이 즉시 듣기평가 방송 / 14:10 예령 / 14:20 종료령)"
        }
      ]
    },
    {
      id: "p-sn-break-2",
      period: "휴식시간",
      subjects: [
        {
          id: "s-sn-b2-1",
          name: "3교시 종료 후 휴식 (4교시 입실 완료: 14:40)",
          entryTime: "14:40",
          time: "14:20 ~ 14:40",
          duration: 20,
          targetClass: "전체 (다음 교시: 4교시 한국사 및 탐구 영역)"
        }
      ]
    },
    {
      id: "p-sn-4",
      period: "4교시 (탐구)",
      subjects: [
        {
          id: "s-sn-4-1",
          name: "한국사 영역 (필수 응시)",
          entryTime: "14:40",
          prepTimeRange: "14:45 ~ 14:50",
          time: "14:50 ~ 15:20",
          duration: 30,
          proceedGuide: "14:40 입실완료 / 14:45 준비령 / 14:50 본령",
          supervisorInfo: "4교시 감독관",
          targetClass: "수험생 전체 (14:40 입실완료 / 14:45 준비령 / 14:50 본령 / 15:15 예령 / 15:20 종료령)"
        },
        {
          id: "s-sn-4-2",
          name: "한국사 문답지 회수 및 탐구 문제지 배부",
          entryTime: "15:20",
          time: "15:20 ~ 15:35",
          duration: 15,
          targetClass: "전체 수험생 (15분간 정숙 유지 및 문제지 이상 유무 확인)"
        },
        {
          id: "s-sn-4-3",
          name: "탐구 영역 제1선택 과목",
          entryTime: "15:35",
          time: "15:35 ~ 16:05",
          duration: 30,
          targetClass: "사회·과학·직업탐구 응시자 (15:35 본령 / 16:00 예령 / 16:05 종료령)"
        },
        {
          id: "s-sn-4-4",
          name: "문제지 회수 및 제2선택 과목 교체",
          entryTime: "16:05",
          time: "16:05 ~ 16:07",
          duration: 2,
          targetClass: "2과목 선택자 문제지 교체 (정숙)"
        },
        {
          id: "s-sn-4-5",
          name: "탐구 영역 제2선택 과목",
          entryTime: "16:07",
          time: "16:07 ~ 16:37",
          duration: 30,
          targetClass: "사회·과학·직업탐구 2과목 선택자 (16:07 본령 / 16:32 예령 / 16:37 종료령)"
        }
      ]
    },
    {
      id: "p-sn-break-3",
      period: "휴식시간",
      subjects: [
        {
          id: "s-sn-b3-1",
          name: "4교시 종료 후 휴식 (5교시 입실 완료: 16:55)",
          entryTime: "16:55",
          time: "16:37 ~ 16:55",
          duration: 18,
          targetClass: "5교시 미응시자는 본부 안내에 따라 귀가"
        }
      ]
    },
    {
      id: "p-sn-5",
      period: "5교시",
      subjects: [
        {
          id: "s-sn-5-1",
          name: "제2외국어 / 한문 영역",
          entryTime: "16:55",
          prepTimeRange: "16:55 ~ 17:05",
          time: "17:05 ~ 17:45",
          duration: 40,
          targetClass: "선택 수험생 (16:55 입실완료 / 17:00 준비령 / 17:05 본령 / 17:35 예령 / 17:45 종료령)"
        }
      ]
    }
  ]
};

// 3. 정기고사 (중간고사 / 기말고사) 전용 시간표
export const regularScheduleData: ScheduleData = [
  {
    id: "day-1012",
    date: "10/12",
    fullTitle: "2026학년도 2학기 1차 정기고사(중간고사) 시간표(10/12)",
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
            entryTime: "09:20",
            time: "09:30~10:20",
            duration: 50,
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
            name: "미적분I(01)",
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
  },
  {
    id: "day-1013",
    date: "10/13",
    fullTitle: "2026학년도 2학기 1차 정기고사(중간고사) 시간표(10/13)",
    notice: FIXED_NOTICE,
    bottomNotice: DEFAULT_BOTTOM_NOTICE,
    schedule: [
      {
        id: "p-1013-1",
        period: "1교시",
        subjects: [
          {
            id: "s-1013-1-1",
            name: "자습",
            time: "08:30 ~ 09:00",
            duration: 30,
            targetClass: "전체"
          }
        ]
      },
      {
        id: "p-1013-2",
        period: "2교시",
        subjects: [
          {
            id: "s-1013-2-1",
            name: "문학(02)",
            entryTime: "09:20",
            time: "09:30~10:20",
            duration: 50,
            targetClass: "전체"
          }
        ]
      },
      {
        id: "p-1013-3",
        period: "3교시",
        subjects: [
          {
            id: "s-1013-3-1",
            name: "한국지리(06)",
            entryTime: "11:10",
            time: "11:20~12:10",
            duration: 50,
            targetClass: "1~4반"
          },
          {
            id: "s-1013-3-2",
            name: "물리학I(09)",
            entryTime: "11:10",
            time: "11:20~12:10",
            duration: 50,
            targetClass: "5~8반"
          }
        ]
      }
    ]
  },
  {
    id: "day-1014",
    date: "10/14",
    fullTitle: "2026학년도 2학기 1차 정기고사(중간고사) 시간표(10/14)",
    notice: FIXED_NOTICE,
    bottomNotice: DEFAULT_BOTTOM_NOTICE,
    schedule: [
      {
        id: "p-1014-1",
        period: "1교시",
        subjects: [
          {
            id: "s-1014-1-1",
            name: "자습",
            time: "08:30 ~ 09:00",
            duration: 30,
            targetClass: "전체"
          }
        ]
      },
      {
        id: "p-1014-2",
        period: "2교시",
        subjects: [
          {
            id: "s-1014-2-1",
            name: "영어II(05)",
            entryTime: "09:20",
            time: "09:30~10:20",
            duration: 50,
            targetClass: "전체"
          }
        ]
      },
      {
        id: "p-1014-3",
        period: "3교시",
        subjects: [
          {
            id: "s-1014-3-1",
            name: "화학I(11)",
            entryTime: "11:10",
            time: "11:20~12:10",
            duration: 50,
            targetClass: "1~5반"
          },
          {
            id: "s-1014-3-2",
            name: "자습",
            entryTime: "11:10",
            time: "11:20~12:10",
            duration: 50,
            targetClass: "6~8반"
          }
        ]
      }
    ]
  },
  {
    id: "day-1015",
    date: "10/15",
    fullTitle: "2026학년도 2학기 1차 정기고사(중간고사) 시간표(10/15)",
    notice: FIXED_NOTICE,
    bottomNotice: DEFAULT_BOTTOM_NOTICE,
    schedule: [
      {
        id: "p-1015-1",
        period: "1교시",
        subjects: [
          {
            id: "s-1015-1-1",
            name: "자습",
            time: "08:30 ~ 09:00",
            duration: 30,
            targetClass: "전체"
          }
        ]
      },
      {
        id: "p-1015-2",
        period: "2교시",
        subjects: [
          {
            id: "s-1015-2-1",
            name: "경제수학(04)",
            entryTime: "09:20",
            time: "09:30~10:20",
            duration: 50,
            targetClass: "행정학급"
          }
        ]
      },
      {
        id: "p-1015-3",
        period: "3교시",
        subjects: [
          {
            id: "s-1015-3-1",
            name: "윤리와 사상(08)",
            entryTime: "11:00",
            time: "11:10~12:00",
            duration: 50,
            targetClass: "1~4반"
          },
          {
            id: "s-1015-3-2",
            name: "역학과 에너지(10)",
            entryTime: "11:00",
            time: "11:10~12:00",
            duration: 50,
            targetClass: "5반"
          },
          {
            id: "s-1015-3-3",
            name: "자습",
            entryTime: "11:00",
            time: "11:10~12:00",
            duration: 50,
            targetClass: "6~8반"
          }
        ]
      }
    ]
  },
  {
    id: "day-1016",
    date: "10/16",
    fullTitle: "2026학년도 2학기 1차 정기고사(중간고사) 시간표(10/16)",
    notice: FIXED_NOTICE,
    bottomNotice: DEFAULT_BOTTOM_NOTICE,
    schedule: [
      {
        id: "p-1016-1",
        period: "1교시",
        subjects: [
          {
            id: "s-1016-1-1",
            name: "자습",
            time: "08:30 ~ 09:00",
            duration: 30,
            targetClass: "전체"
          }
        ]
      },
      {
        id: "p-1016-2",
        period: "2교시",
        subjects: [
          {
            id: "s-1016-2-1",
            name: "세포와 물질대사(12)",
            entryTime: "09:20",
            time: "09:30~10:20",
            duration: 50,
            targetClass: "1~3반"
          },
          {
            id: "s-1016-2-2",
            name: "자습",
            entryTime: "09:20",
            time: "09:30~10:20",
            duration: 50,
            targetClass: "4~8반"
          }
        ]
      },
      {
        id: "p-1016-3",
        period: "3교시",
        subjects: [
          {
            id: "s-1016-3-1",
            name: "일본어회화(19) / 프랑스어회화(18)",
            entryTime: "11:10",
            time: "11:20~12:00",
            duration: 40,
            targetClass: "행정학급"
          }
        ]
      }
    ]
  }
];

// 모의고사 전용 데이터 (전국연합학력평가 상시 타종 모드)
export const mockScheduleData: ScheduleData = [mockDaySchedule];

// 모의고사 & 정기고사 통합 표준 종합 데이터 (수능 모드는 사용자 요청으로 삭제됨)
export const allComprehensiveScheduleData: ScheduleData = [
  mockDaySchedule,
  ...regularScheduleData
];

// 기본 내보내기
export const defaultScheduleData: ScheduleData = allComprehensiveScheduleData;

