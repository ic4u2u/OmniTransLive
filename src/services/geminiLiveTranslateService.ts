/**
 * Google Gemini Live API (gemini-3.5-live-translate-preview) 실시간 번역 서비스
 * - 초저지연 양방향 WebSocket 음성-대-음성 (Speech-to-Speech) 실시간 동시통역
 * - 16kHz 16-bit PCM 마이크 입력 스트리밍
 * - 24kHz 16-bit PCM 번역 오디오 실시간 갭리스(Gapless) 버퍼 재생
 * - inputAudioTranscription / outputAudioTranscription 실시간 자막 이벤트
 */

// BCP-47 표준 언어 코드 매핑
export function mapToGeminiLanguageCode(code: string): string {
  const mapping: Record<string, string> = {
    ko: 'ko',
    en: 'en',
    ja: 'ja',
    'zh-CN': 'zh-Hans',
    'zh-TW': 'zh-Hant',
    zh: 'zh-Hans',
    yue: 'zh-Hant',
    vi: 'vi',
    th: 'th',
    id: 'id',
    ms: 'ms',
    tl: 'fil',
    hi: 'hi',
    es: 'es',
    fr: 'fr',
    de: 'de',
    it: 'it',
    pt: 'pt-BR',
    ru: 'ru',
    nl: 'nl',
    pl: 'pl',
    sv: 'sv',
    ar: 'ar',
    tr: 'tr',
    he: 'he',
    fa: 'fa',
  };

  return mapping[code] || code.split('-')[0] || 'en';
}

export interface GeminiLiveCallbacks {
  onInputTranscription?: (text: string) => void;
  onOutputTranscription?: (text: string) => void;
  onTurnComplete?: () => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: 'idle' | 'connecting' | 'connected' | 'error') => void;
}

export class GeminiLiveTranslateService {
  private ws: WebSocket | null = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  
  private nextPlayTime = 0;
  private isSessionActive = false;
  private pcmChunkBuffer: Int16Array[] = [];
  private accumulatedSamples = 0;
  private callbacks: GeminiLiveCallbacks = {};

  // 기본 Gemini API 키 로드 (사용자 설정 우선, 없으면 .env 환경 변수)
  public getApiKey(): string {
    if (typeof window !== 'undefined') {
      const customKey = localStorage.getItem('omnitrans_gemini_api_key');
      if (customKey && customKey.trim().length > 10) {
        return customKey.trim();
      }
    }
    const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (envKey && typeof envKey === 'string' && envKey.trim().length > 10) {
      return envKey.trim();
    }
    return '';
  }

  public setApiKey(key: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('omnitrans_gemini_api_key', key.trim());
    }
  }

  public isKeyConfigured(): boolean {
    return this.getApiKey().length > 0;
  }

  /**
   * Gemini Live Translate 세션 시작
   */
  public async startSession(
    targetLanguageCode: string,
    callbacks: GeminiLiveCallbacks
  ): Promise<boolean> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      callbacks.onError?.('Gemini API 키가 설정되지 않았습니다. 상단 Gemini 설정에서 API 키를 입력해주세요.');
      return false;
    }

    this.stopSession();
    this.callbacks = callbacks;
    this.callbacks.onStatusChange?.('connecting');

    const mappedTarget = mapToGeminiLanguageCode(targetLanguageCode);
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(
      apiKey
    )}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.sendSetupMessage(mappedTarget);
      };

      this.ws.onmessage = async (event: MessageEvent) => {
        try {
          let msgData: any;
          if (event.data instanceof Blob) {
            const text = await event.data.text();
            msgData = JSON.parse(text);
          } else {
            msgData = JSON.parse(event.data);
          }
          this.handleServerMessage(msgData);
        } catch (err) {
          console.warn('Gemini Live WS parse message error:', err);
        }
      };

      this.ws.onerror = (err) => {
        console.error('Gemini Live WebSocket Error:', err);
        this.callbacks.onError?.('Gemini Live API 연결에 실패했습니다. API 키 및 네트워크 상태를 확인해주세요.');
        this.callbacks.onStatusChange?.('error');
        this.stopSession();
      };

      this.ws.onclose = (event) => {
        if (this.isSessionActive) {
          console.log('Gemini Live WebSocket closed:', event.code, event.reason);
          this.callbacks.onStatusChange?.('idle');
          this.stopSession();
        }
      };

      // 오디오 출력 컨텍스트 초기화 (24kHz)
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.outputAudioContext = new AudioCtx({ sampleRate: 24000 });
      if (this.outputAudioContext.state === 'suspended') {
        await this.outputAudioContext.resume();
      }
      this.nextPlayTime = this.outputAudioContext.currentTime;

      // 마이크 캡처 시작 (16kHz PCM 스트리밍)
      await this.startMicrophoneCapture();
      this.isSessionActive = true;
      return true;
    } catch (err: any) {
      console.error('Gemini Live Session Start Exception:', err);
      this.callbacks.onError?.(err?.message || 'Gemini Live 세션 시작 중 오류가 발생했습니다.');
      this.callbacks.onStatusChange?.('error');
      this.stopSession();
      return false;
    }
  }

  /**
   * Setup 메시지 전송
   */
  private sendSetupMessage(targetLanguageCode: string): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const setupMsg = {
      setup: {
        model: 'models/gemini-3.5-live-translate-preview',
        generationConfig: {
          responseModalities: ['AUDIO'],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          translationConfig: {
            targetLanguageCode: targetLanguageCode,
            echoTargetLanguage: true,
          },
        },
      },
    };

    this.ws.send(JSON.stringify(setupMsg));
    this.callbacks.onStatusChange?.('connected');
  }

  /**
   * 마이크 오디오 캡처 및 16kHz PCM 변환 스트리밍
   */
  private async startMicrophoneCapture(): Promise<void> {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    this.inputAudioContext = new AudioCtx({ sampleRate: 16000 });

    if (this.inputAudioContext.state === 'suspended') {
      await this.inputAudioContext.resume();
    }

    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.sourceNode = this.inputAudioContext.createMediaStreamSource(this.mediaStream);
    // 버퍼 사이즈 2048 (~128ms at 16kHz)
    this.scriptProcessor = this.inputAudioContext.createScriptProcessor(2048, 1, 1);

    this.scriptProcessor.onaudioprocess = (e) => {
      if (!this.isSessionActive || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

      const inputFloat32 = e.inputBuffer.getChannelData(0);
      const pcm16 = this.float32ToInt16(inputFloat32);

      this.pcmChunkBuffer.push(pcm16);
      this.accumulatedSamples += pcm16.length;

      // 100ms 이상 (1600 샘플) 모였을 때 전송
      if (this.accumulatedSamples >= 1600) {
        this.flushAudioBuffer();
      }
    };

    this.sourceNode.connect(this.scriptProcessor);
    this.scriptProcessor.connect(this.inputAudioContext.destination);
  }

  private flushAudioBuffer(): void {
    if (this.pcmChunkBuffer.length === 0) return;

    // 모든 버퍼 결합
    const merged = new Int16Array(this.accumulatedSamples);
    let offset = 0;
    for (const chunk of this.pcmChunkBuffer) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    this.pcmChunkBuffer = [];
    this.accumulatedSamples = 0;

    const base64Data = this.int16ArrayToBase64(merged);

    const realtimePayload = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: base64Data,
          },
        ],
      },
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(realtimePayload));
    }
  }

  /**
   * Float32Array를 16비트 정수 PCM(Int16Array)으로 변환
   */
  private float32ToInt16(input: Float32Array): Int16Array {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return output;
  }

  /**
   * Int16Array -> Little-Endian Base64 문자열
   */
  private int16ArrayToBase64(int16Arr: Int16Array): string {
    const buffer = int16Arr.buffer;
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Base64 문자열 -> Float32Array (24kHz 출력용)
   */
  private base64ToFloat32(base64: string): Float32Array {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16Arr = new Int16Array(bytes.buffer);
    const float32Arr = new Float32Array(int16Arr.length);
    for (let i = 0; i < int16Arr.length; i++) {
      float32Arr[i] = int16Arr[i] / 32768.0;
    }
    return float32Arr;
  }

  /**
   * 서버로부터 받은 실시간 메시지 처리
   */
  private handleServerMessage(msg: any): void {
    if (!msg) return;

    const serverContent = msg.serverContent;
    if (!serverContent) return;

    // 1. 원본 입력 음성 실시간 스크립트 (inputAudioTranscription or inputTranscription)
    const inText =
      serverContent.inputAudioTranscription?.text ||
      serverContent.inputTranscription?.text;
    if (inText && this.callbacks.onInputTranscription) {
      this.callbacks.onInputTranscription(inText);
    }

    // 2. 번역 출력 실시간 스크립트 (outputAudioTranscription or outputTranscription)
    const outText =
      serverContent.outputAudioTranscription?.text ||
      serverContent.outputTranscription?.text;
    if (outText && this.callbacks.onOutputTranscription) {
      this.callbacks.onOutputTranscription(outText);
    }

    // 3. 번역된 24kHz PCM 오디오 스트리밍 청크 재생
    if (serverContent.modelTurn?.parts) {
      for (const part of serverContent.modelTurn.parts) {
        if (part.inlineData?.data) {
          this.playAudioChunk(part.inlineData.data);
        }
      }
    }

    // 4. 한 문장/턴 완료
    if (serverContent.turnComplete) {
      if (this.callbacks.onTurnComplete) {
        this.callbacks.onTurnComplete();
      }
    }
  }

  /**
   * 24kHz PCM 오디오 청크를 끊김 없이 스케줄링 재생
   */
  private playAudioChunk(base64Audio: string): void {
    if (!this.outputAudioContext) return;

    try {
      const float32Data = this.base64ToFloat32(base64Audio);
      if (float32Data.length === 0) return;

      const audioBuffer = this.outputAudioContext.createBuffer(
        1,
        float32Data.length,
        24000
      );
      audioBuffer.getChannelData(0).set(float32Data);

      const source = this.outputAudioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.outputAudioContext.destination);

      const currentTime = this.outputAudioContext.currentTime;
      if (this.nextPlayTime < currentTime) {
        this.nextPlayTime = currentTime;
      }

      source.start(this.nextPlayTime);
      this.nextPlayTime += audioBuffer.duration;
    } catch (err) {
      console.warn('Error playing audio chunk:', err);
    }
  }

  /**
   * 세션 종료 및 리소스 해제
   */
  public stopSession(): void {
    this.isSessionActive = false;

    if (this.pcmChunkBuffer.length > 0) {
      this.flushAudioBuffer();
    }

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    if (this.scriptProcessor) {
      try {
        this.scriptProcessor.disconnect();
      } catch {}
      this.scriptProcessor = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.inputAudioContext) {
      try {
        this.inputAudioContext.close();
      } catch {}
      this.inputAudioContext = null;
    }

    if (this.outputAudioContext) {
      try {
        this.outputAudioContext.close();
      } catch {}
      this.outputAudioContext = null;
    }

    this.pcmChunkBuffer = [];
    this.accumulatedSamples = 0;
    this.callbacks.onStatusChange?.('idle');
  }
}

export const geminiLiveTranslateService = new GeminiLiveTranslateService();
