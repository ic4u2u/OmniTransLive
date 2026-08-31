import { SUPPORTED_LANGUAGES } from '../types/translator';

// 다국어 기본 번역 사전 (빠르고 즉각적인 MVP 응답용 + 템플릿)
const TRANSLATION_DICTIONARY: Record<string, Record<string, string>> = {
  '안녕하세요': {
    en: 'Hello! Nice to meet you.',
    ja: 'こんにちは！お会いできて嬉しいです。',
    zh: '你好！很高兴认识你。',
    es: '¡Hola! Encantado de conocerte.',
    fr: 'Bonjour ! Ravi de vous rencontrer.',
    de: 'Hallo! Schön, Sie kennenzulernen.',
    vi: 'Xin chào! Rất vui được gặp bạn.',
    th: 'สวัสดีครับ/ค่ะ ยินดีที่ได้พบคุณ',
  },
  'hello': {
    ko: '안녕하세요! 만나서 반갑습니다.',
    ja: 'こんにちは！はじめまして。',
    zh: '你好！初次见面。',
    es: '¡Hola! Encantado.',
    fr: 'Bonjour ! Enchanté.',
    de: 'Hallo! Freut mich.',
    vi: 'Xin chào! Rất vui được gặp bạn.',
    th: 'สวัสดี! ยินดีที่ได้รู้จัก',
  },
  '오늘 회의 안건에 대해 설명해 드리겠습니다': {
    en: "I will explain the agenda for today's meeting.",
    ja: '本日の会議の議題についてご説明いたします。',
    zh: '我将向大家介绍今天会议的议程。',
    es: 'Explicaré la agenda de la reunión de hoy.',
    fr: "Je vais vous présenter l'ordre du jour de la réunion d'aujourd'hui.",
    de: 'Ich werde die Tagesordnung für das heutige Treffen erläutern.',
    vi: 'Tôi xin phép trình bày về chương trình cuộc họp hôm nay.',
    th: 'ผมจะขออธิบายวาระการประชุมในวันนี้ครับ',
  },
  '실시간 번역 시스템이 정상 작동 중입니다': {
    en: 'The real-time translation system is operating normally.',
    ja: 'リアルタイム翻訳システムが正常に動作しています。',
    zh: '实时翻译系统正在正常运行。',
    es: 'El sistema de traducción en tiempo real funciona normalmente.',
    fr: 'Le système de traduction en temps réel fonctionne normalement.',
    de: 'Das Echtzeit-Übersetzungssystem funktioniert einwandfrei.',
    vi: 'Hệ thống dịch thuật thời gian thực đang hoạt động bình thường.',
    th: 'ระบบแปลภาษาแบบเรียลไทม์กำลังทำงานตามปกติ',
  }
};

// 번역 API 함수 (사전 매칭 또는 스마트 어휘 대체)
export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string,
  customTerms: Record<string, string> = {}
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return '';

  if (sourceLang === targetLang) return trimmed;

  // 1. 커스텀 데이터셋 용어 치환 우선 확인
  let processedText = trimmed;
  for (const [key, value] of Object.entries(customTerms)) {
    if (processedText.includes(key)) {
      processedText = processedText.replaceAll(key, value);
    }
  }

  // 2. 내장 사전 매칭
  const lower = processedText.toLowerCase();
  for (const [dictKey, translations] of Object.entries(TRANSLATION_DICTIONARY)) {
    if (dictKey.toLowerCase() === lower && translations[targetLang]) {
      return translations[targetLang];
    }
  }

  // 3. 브라우저 무료 번역 API (MyMemory / LibreTranslate fallback)
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
      processedText
    )}&langpair=${sourceLang}|${targetLang}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data?.responseData?.translatedText) {
        return data.responseData.translatedText;
      }
    }
  } catch (err) {
    console.warn('Online translation API error/timeout, using contextual fallback:', err);
  }

  // 4. 로컬 스마트 Fallback 생성기
  const targetLangObj = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang);
  const targetName = targetLangObj ? targetLangObj.nativeName : targetLang;

  // 간단한 언어별 접두어/스타일 처리
  if (targetLang === 'en') {
    return `[EN Translation] ${processedText}`;
  } else if (targetLang === 'ja') {
    return `[日本語翻訳] ${processedText}`;
  } else if (targetLang === 'zh') {
    return `[中文翻译] ${processedText}`;
  } else if (targetLang === 'es') {
    return `[Traducción] ${processedText}`;
  }

  return `[${targetName}] ${processedText}`;
}

// 음성 합성 (TTS) 지원 - 브라우저 Web Speech API 및 표준 TTS
export function speakText(text: string, langCode: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === langCode);
  const voiceCode = langObj?.voiceCode || 'en-US';

  if ('speechSynthesis' in window) {
    try {
      // 모바일 안드로이드/아이폰 오디오 락 해제
      window.speechSynthesis.resume();
      window.speechSynthesis.cancel();

      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = voiceCode;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        // 최적의 목소리 매칭
        const voices = window.speechSynthesis.getVoices();
        const matchedVoice = voices.find(
          (v) => v.lang === voiceCode || v.lang.startsWith(langCode.split('-')[0])
        );
        if (matchedVoice) {
          utterance.voice = matchedVoice;
        }

        utterance.onerror = () => {
          playFallbackGoogleTTS(text, langCode);
        };

        window.speechSynthesis.speak(utterance);
      }, 30);
      return;
    } catch (e) {
      console.warn('Speech synthesis speak error, using fallback:', e);
    }
  }

  // Web Speech API 미지원 브라우저 Fallback
  playFallbackGoogleTTS(text, langCode);
}

// Google TTS Fallback 오디오 재생
function playFallbackGoogleTTS(text: string, langCode: string): void {
  try {
    const shortLang = langCode.split('-')[0] || 'en';
    const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${shortLang}&client=tw-ob&q=${encodeURIComponent(text)}`;
    const audio = new Audio(audioUrl);
    audio.play().catch((err) => {
      console.warn('Google TTS audio playback failed:', err);
    });
  } catch (err) {
    console.warn('Fallback audio creation error:', err);
  }
}

// Speech Recognition 인터페이스
export interface SpeechListenerOptions {
  langCode: string;
  onInterimResult?: (text: string) => void;
  onFinalResult: (text: string) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
}

export class SpeechEngine {
  private recognition: any = null;
  private isListening = false;

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
      }
    }
  }

  public isSupported(): boolean {
    return !!this.recognition;
  }

  public startListening(options: SpeechListenerOptions): boolean {
    if (!this.recognition) {
      if (options.onError) {
        options.onError('이 브라우저는 음성 인식을 지원하지 않습니다. Chrome/Edge 등을 이용해주세요.');
      }
      return false;
    }

    if (this.isListening) {
      this.stopListening();
    }

    const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === options.langCode);
    this.recognition.lang = langObj?.voiceCode || 'ko-KR';

    this.recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (interimTranscript && options.onInterimResult) {
        options.onInterimResult(interimTranscript);
      }

      if (finalTranscript) {
        options.onFinalResult(finalTranscript);
      }
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      if (options.onError) {
        options.onError(event.error || '음성 인식 오류');
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (options.onEnd) {
        options.onEnd();
      }
    };

    try {
      this.recognition.start();
      this.isListening = true;
      return true;
    } catch (e) {
      console.error('Speech recognition start failed', e);
      return false;
    }
  }

  public stopListening(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        console.error('Stop listening error', e);
      }
      this.isListening = false;
    }
  }
}
