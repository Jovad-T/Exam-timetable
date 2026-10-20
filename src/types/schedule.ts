export interface SubjectItem {
  id?: string;
  name: string;             // 예: "기하", "세계시민과 지리", "국어"
  subjectCode?: string;     // 예: "03", "07", "02" (과목코드)
  entryTime?: string;       // 예: "08:30", "10:25" (입실시간 / 준비령 시각)
  preliminaryBell?: string; // 예: "08:25" (예비령 시각)
  prepTimeRange?: string;   // 예: "08:35" 또는 "08:35 ~ 08:40" (준비령 시각/구간)
  time: string;             // 예: "08:40 ~ 10:00" (본령 / 진행시간)
  duration: number;         // 예: 80, 100, 70, 30, 40 (분)
  endBell?: string;         // 예: "10:00" (종료령 시각)
  targetClass: string;      // 예: "1~3반", "A206", "전체"
  proceedGuide?: string;    // 예: "문제풀이, 답안작성 (준비령: 답안지·문제지배부)"
  supervisorInfo?: string;  // 예: "1교시 08:30-09:15(45분) / 2교시 09:15-10:00(45분)"
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
  date: string;          // 예: "10/20", "11/13", "10/12"
  fullTitle?: string;    // 예: "2026년 10월 고1, 2 전국연합학력평가 시험 시간표 - 10월 20일(화) (코드 12156)"
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
  audioUrl?: string;            // 네이버 클로바 더빙 등에서 다운로드한 MP3/WAV 오디오 데이터 URL
  audioName?: string;           // 업로드된 오디오 파일명 (예: "종료10분전_클로바더빙.mp3")
}

export interface ExamAlertSettings {
  enabled: boolean;             // 경고 알림 표시 여부
  soundEnabled: boolean;        // 알림 소리 켜기/끄기
  alertMinutes: 5 | 10;         // 알림 시간: 5분전 또는 10분전
  soundType?: 'chime' | 'bell' | 'electronic'; // 알림음 종류
  volume?: number;              // 음량 (0.1 ~ 1.0)
  ttsEnabled?: boolean;         // TTS 음성 안내 켜기/끄기 (사용자 요청: 원하는 문구 TTS 생성)
  ttsMessage?: string;          // TTS 안내 문구 텍스트
  ttsAudioUrl?: string;         // 종료 N분 전 클로바 더빙 등 커스텀 음성 파일 (MP3/WAV Data URL)
  ttsAudioName?: string;        // 종료 N분 전 업로드된 음성 파일명
  ttsVoiceSpeed?: number;       // 음성 재생 속도 (0.8 ~ 1.2)
  ttsVoiceStyle?: 'announcer' | 'friendly' | 'calm' | 'energetic' | 'warning'; // AI 사람다운 낭독 스타일 및 감정 표현 (차분함, 활기참, 경고조 등)
  ttsPitch?: number;            // 음성 고저 (0.8 ~ 1.2)
  startAlertEnabled?: boolean;  // 시험 시작 10분 전 자동 알림 켜기/끄기
  startTtsMessage?: string;     // 시험 시작 10분 전 TTS 멘트 ("곧 시험이 시작됩니다...")
  startTtsAudioUrl?: string;    // 시험 시작 10분 전 클로바 더빙 등 커스텀 음성 파일 (MP3/WAV Data URL)
  startTtsAudioName?: string;   // 시험 시작 10분 전 업로드된 음성 파일명
  announcementTemplates?: AnnouncementTemplate[]; // 사용자 맞춤형 시험 안내 멘트 템플릿 목록
}

