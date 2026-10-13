export interface SubjectItem {
  id?: string;
  name: string;          // 예: "기하", "세계시민과 지리", "자습"
  subjectCode?: string;  // 예: "03", "07", "02" (과목코드)
  entryTime?: string;    // 예: "09:10", "09:20", "10:50" (입실시간)
  time: string;          // 예: "09:20~10:20" (시험시간)
  duration: number;      // 예: 60, 50, 40 (분)
  targetClass: string;   // 예: "1~3반", "A206", "지정반", "행정학급"
}

export interface PeriodSchedule {
  id?: string;
  period: string;        // 예: "1교시", "2교시", "3교시"
  subjects: SubjectItem[];
}

export interface ClassAttendance {
  grade: string;         // 예: "2"
  classNum: string;      // 예: "3"
  totalCount: string;    // 예: "28"
  presentCount: string;  // 예: "27"
  absentNotes: string;   // 예: "14번(병결)" 또는 "없음"
  lastNum: string;       // 예: "28"
}

export interface DayExamSchedule {
  id?: string;
  date: string;          // 예: "10/12", "10/13", "10/14", "10/15", "10/16"
  fullTitle?: string;    // 예: "2026학년도 2학기 1차 고사 시간표(10/12)"
  notice: string;        // 고정: "최선을 다하기! 부정행위 금지! 책상 서랍 비우기! 수정테이프 불가!"
  bottomNotice?: string; // 하단 안내 멘트: "※ 시험 시작 10분 전까지 입실을 완료하여 주시기 바랍니다 ※"
  schedule: PeriodSchedule[];
}

export type ScheduleData = DayExamSchedule[];

export interface AnnouncementTemplate {
  id: string;
  category: '시험시작' | '시험종료' | '주의사항' | '일반안내';
  title: string;
  text: string;
}

export interface ExamAlertSettings {
  enabled: boolean;             // 경고 알림 표시 여부
  soundEnabled: boolean;        // 알림 소리 켜기/끄기
  alertMinutes: 5 | 10;         // 알림 시간: 5분전 또는 10분전
  soundType?: 'chime' | 'bell' | 'electronic'; // 알림음 종류
  volume?: number;              // 음량 (0.1 ~ 1.0)
  ttsEnabled?: boolean;         // TTS 음성 안내 켜기/끄기 (사용자 요청: 원하는 문구 TTS 생성)
  ttsMessage?: string;          // TTS 안내 문구 텍스트
  ttsVoiceSpeed?: number;       // 음성 재생 속도 (0.8 ~ 1.2)
  ttsVoiceStyle?: 'announcer' | 'friendly' | 'calm' | 'energetic' | 'warning'; // AI 사람다운 낭독 스타일 및 감정 표현 (차분함, 활기참, 경고조 등)
  ttsPitch?: number;            // 음성 고저 (0.8 ~ 1.2)
  startAlertEnabled?: boolean;  // 시험 시작 10분 전 자동 알림 켜기/끄기
  startTtsMessage?: string;     // 시험 시작 10분 전 TTS 멘트 ("곧 시험이 시작됩니다...")
  announcementTemplates?: AnnouncementTemplate[]; // 사용자 맞춤형 시험 안내 멘트 템플릿 목록
}
