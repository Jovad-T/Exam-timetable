/**
 * Web Audio API based School Chime & Warning Bell Synthesizer
 * Plays high-quality, authentic school bells and warning chimes without external audio assets.
 */

class AudioAlertManager {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Play Korean school chime (딩동댕동 차임벨) or warning bell
   */
  public playAlertSound(type: 'chime' | 'bell' | 'electronic' = 'chime', volume: number = 0.7) {
    const ctx = this.getContext();
    if (!ctx) return;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(Math.max(0.1, Math.min(1.0, volume)), ctx.currentTime);
    masterGain.connect(ctx.destination);

    if (type === 'chime') {
      // Classic 4-note Westminster / School Chime (솔 - 도 - 레 - 솔 / E5, C5, D5, G4)
      // Notes: G4 (392Hz), C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz)
      const notes = [
        { freq: 523.25, time: 0.0, dur: 0.9 }, // C5
        { freq: 659.25, time: 0.45, dur: 0.9 }, // E5
        { freq: 783.99, time: 0.9, dur: 0.9 }, // G5
        { freq: 1046.5, time: 1.35, dur: 1.4 }, // C6
      ];

      notes.forEach(({ freq, time, dur }) => {
        this.playBellTone(ctx, masterGain, freq, ctx.currentTime + time, dur);
      });
    } else if (type === 'bell') {
      // 2-tone Notice Gong Bell (딩-동)
      const notes = [
        { freq: 587.33, time: 0.0, dur: 1.1 }, // D5
        { freq: 880.0, time: 0.45, dur: 1.5 }, // A5
      ];
      notes.forEach(({ freq, time, dur }) => {
        this.playBellTone(ctx, masterGain, freq, ctx.currentTime + time, dur);
      });
    } else {
      // Electronic Alert Beep (부드러운 전자 알림음)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.5, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);

      setTimeout(() => {
        if (!ctx) return;
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1046.5, ctx.currentTime);
        gain2.gain.setValueAtTime(0.5, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc2.connect(gain2);
        gain2.connect(masterGain);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.6);
      }, 200);
    }
  }

  /**
   * Helper to synthesize a rich physical bell tone with harmonics
   */
  private playBellTone(
    ctx: AudioContext,
    destination: AudioNode,
    fundamental: number,
    startTime: number,
    duration: number
  ) {
    // 3 harmonics for tubular bell / school chime timbre
    const harmonics = [
      { ratio: 1.0, amp: 0.7 },
      { ratio: 2.0, amp: 0.35 },
      { ratio: 3.0, amp: 0.15 },
    ];

    harmonics.forEach(({ ratio, amp }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(fundamental * ratio, startTime);

      // Bell envelope: instant attack, exponential smooth ring-out decay
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.linearRampToValueAtTime(amp, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }

  /**
   * Speak TTS announcement in Korean (Web Speech API)
   * 사용자 요청: "종료 10분 전 알림 멘트는 원하는 문구를 텍스트로 주면 TTS로 만들어서 넣을 수 있어?"
   */
  public speakTTS(
    text: string,
    options: {
      volume?: number;
      rate?: number;
      pitch?: number;
      voiceStyle?: 'announcer' | 'friendly' | 'calm' | 'energetic' | 'warning';
      onEnd?: () => void;
    } = {}
  ) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return false;
    }

    try {
      window.speechSynthesis.cancel();

      const trimmed = text.trim();
      if (!trimmed) return false;

      // Make speech sound extremely natural and human-like by adding slight natural pauses at sentence boundaries
      let naturalText = trimmed
        .replace(/([.?!])\s*/g, '$1... ')
        .replace(/([,은는이가을를을])\s+/g, '$1 ');

      // Add emotional intonation / preamble if needed
      if (options.voiceStyle === 'warning') {
        naturalText = '주의해 주십시오! ' + naturalText;
      }

      const utterance = new SpeechSynthesisUtterance(naturalText);
      utterance.lang = 'ko-KR';
      utterance.volume = Math.max(0.1, Math.min(1.0, options.volume ?? 1.0));

      let baseRate = options.rate ?? 1.0;
      let basePitch = options.pitch ?? 1.0;

      // Adjust rate and pitch based on human-like voice style version & emotion (차분함, 활기참, 경고조 등)
      switch (options.voiceStyle) {
        case 'announcer':
          baseRate = 0.95; // 정중하고 또렷한 속도
          basePitch = 1.05; // 약간 신뢰감 있는 톤
          break;
        case 'friendly':
          baseRate = 1.02; // 부드럽고 친근한 속도
          basePitch = 1.15; // 밝은 톤
          break;
        case 'calm':
          baseRate = 0.88; // 차분하고 진중한 속도
          basePitch = 0.90; // 낮고 차분한 톤 (차분함)
          break;
        case 'energetic':
          baseRate = 1.08; // 힘차고 생동감 있는 속도
          basePitch = 1.20; // 높은 톤 (활기참)
          break;
        case 'warning':
          baseRate = 0.98; // 또렷하고 단호한 속도
          basePitch = 0.85; // 낮고 엄숙한 경고 톤 (경고조)
          break;
        default:
          break;
      }

      utterance.rate = Math.max(0.7, Math.min(1.4, baseRate));
      utterance.pitch = Math.max(0.5, Math.min(1.5, basePitch));

      const voices = window.speechSynthesis.getVoices();
      const koVoice =
        (Array.isArray(voices) ? voices.find((v) => v.lang === 'ko-KR' || v.lang === 'ko_KR') : undefined) ||
        (Array.isArray(voices) ? voices.find((v) => v.lang.startsWith('ko')) : undefined);
      if (koVoice) {
        utterance.voice = koVoice;
      }

      if (options.onEnd) {
        utterance.onend = options.onEnd;
      }

      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err) {
      console.warn('TTS SpeechSynthesis error:', err);
      return false;
    }
  }

  /**
   * Stop any ongoing speech
   */
  public stopTTS() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }
}

export const audioAlert = new AudioAlertManager();
