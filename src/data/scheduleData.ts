import { ScheduleData } from '../types/schedule';

export const FIXED_NOTICE = "최선을 다하기! 부정행위 금지! 책상 서랍 비우기! 수정테이프 불가!";
export const DEFAULT_BOTTOM_NOTICE = "※ 시험 시작 10분 전까지 입실을 완료하여 주시기 바랍니다 ※";

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
  },
  {
    id: "day-1013",
    date: "10/13",
    fullTitle: "2026학년도 2학기 1차 고사 시간표(10/13)",
    notice: FIXED_NOTICE,
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
            name: "경제수학(04)",
            entryTime: "09:10",
            time: "09:20~10:20",
            duration: 60,
            targetClass: "A206"
          },
          {
            id: "s-1013-2-2",
            name: "물질과 에너지(11)",
            entryTime: "09:20",
            time: "09:30~10:20",
            duration: 50,
            targetClass: "1~3반"
          },
          {
            id: "s-1013-2-3",
            name: "자습",
            entryTime: "09:10",
            time: "09:20~10:20",
            duration: 60,
            targetClass: "5~8반"
          }
        ]
      },
      {
        id: "p-1013-3",
        period: "3교시",
        subjects: [
          {
            id: "s-1013-3-1",
            name: "독서와 작문(01)",
            entryTime: "10:50",
            time: "11:00~12:00",
            duration: 60,
            targetClass: "행정학급"
          }
        ]
      }
    ]
  },
  {
    id: "day-1014",
    date: "10/14",
    fullTitle: "2026학년도 2학기 1차 고사 시간표(10/14)",
    notice: FIXED_NOTICE,
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
            name: "국제관계의 이해(09)",
            entryTime: "09:20",
            time: "09:30~10:20",
            duration: 50,
            targetClass: "1~4반"
          },
          {
            id: "s-1014-2-2",
            name: "자습",
            entryTime: "09:20",
            time: "09:30~10:20",
            duration: 50,
            targetClass: "5~8반"
          }
        ]
      },
      {
        id: "p-1014-3",
        period: "3교시",
        subjects: [
          {
            id: "s-1014-3-1",
            name: "영어2(06)",
            entryTime: "10:50",
            time: "11:00~12:00",
            duration: 60,
            targetClass: "행정학급"
          }
        ]
      }
    ]
  },
  {
    id: "day-1015",
    date: "10/15",
    fullTitle: "2026학년도 2학기 1차 고사 시간표(10/15)",
    notice: FIXED_NOTICE,
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
            name: "인공지능수학(05)",
            entryTime: "09:10",
            time: "09:20~10:20",
            duration: 60,
            targetClass: "1~2반"
          },
          {
            id: "s-1015-2-2",
            name: "자습",
            entryTime: "09:10",
            time: "09:20~10:20",
            duration: 60,
            targetClass: "3~8반"
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
    fullTitle: "2026학년도 2학기 1차 고사 시간표(10/16)",
    notice: FIXED_NOTICE,
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
