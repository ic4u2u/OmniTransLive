import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Send, 
  ArrowLeftRight, 
  Volume2, 
  Copy, 
  Check, 
  Trash2, 
  Sparkles, 
  Download, 
  QrCode,
  RotateCw,
  MessageSquarePlus,
  Radio,
  Zap,
  Settings
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../types/translator';
import type { Language, TranslationMessage } from '../types/translator';
import type { UIStringDictionary } from '../i18n/translations';
import { translateText, speakText, SpeechEngine } from '../services/translatorEngine';
import { AudioVisualizer } from './AudioVisualizer';
import { geminiLiveTranslateService } from '../services/geminiLiveTranslateService';
import { GeminiLiveSettingsModal } from './GeminiLiveSettingsModal';

interface OneToOneTranslatorProps {
  messages: TranslationMessage[];
  onAddMessage: (msg: TranslationMessage) => void;
  onClearMessages: () => void;
  voiceEnabled: boolean;
  canDownload: boolean;
  onUpgradePrompt: () => void;
  customTerms: Record<string, string>;
  onDeductMinute: () => void;
  onOpenQRModal: () => void;
  isPeerConnected: boolean;
  isGuestMode: boolean;
  t: UIStringDictionary;
}

// 1:1 대화에서 자주 쓰이는 상황별 추천 표현
const QUICK_PROMPTS = [
  '안녕하세요! 반갑습니다.',
  '이것은 얼마인가요?',
  '추천해주실 수 있나요?',
  '화장실이 어디에 있나요?',
  '결제는 카드로 되나요?',
  '명함을 받을 수 있을까요?',
  '이메일로 계약서 보내주세요.',
  '도와주셔서 대단히 감사합니다!',
];

export const OneToOneTranslator: React.FC<OneToOneTranslatorProps> = ({
  messages,
  onAddMessage,
  onClearMessages,
  voiceEnabled,
  canDownload,
  onUpgradePrompt,
  customTerms,
  onDeductMinute,
  onOpenQRModal,
  isPeerConnected,
  isGuestMode,
  t,
}) => {
  // 언어 설정: 화자 A (기본 한국어), 화자 B (기본 영어)
  const [langA, setLangA] = useState<Language>(
    SUPPORTED_LANGUAGES.find((l) => l.code === 'ko') || SUPPORTED_LANGUAGES[0]
  );
  const [langB, setLangB] = useState<Language>(
    SUPPORTED_LANGUAGES.find((l) => l.code === 'en') || SUPPORTED_LANGUAGES[1]
  );

  // 마주보기 듀얼 스플릿 뷰 (테이블 맞은편 상대방 방향 180도 회전)
  const [isFaceToFace, setIsFaceToFace] = useState(false);

  // 텍스트 입력
  const [inputTextA, setInputTextA] = useState('');
  const [inputTextB, setInputTextB] = useState('');

  // 음성인식 상태
  const [activeMic, setActiveMic] = useState<'A' | 'B' | null>(null);
  const [interimSpeech, setInterimSpeech] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const speechEngineRef = useRef<SpeechEngine | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Gemini Live 실시간 번역 모드 상태
  const [isGeminiLiveMode, setIsGeminiLiveMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('omnitrans_gemini_live_mode');
      return saved !== 'false'; // 기본 ON
    }
    return true;
  });
  const [geminiStatus, setGeminiStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [isGeminiSettingsOpen, setIsGeminiSettingsOpen] = useState(false);
  const [liveInputTranscript, setLiveInputTranscript] = useState('');
  const [liveOutputTranscript, setLiveOutputTranscript] = useState('');

  const geminiSpeakerRef = useRef<'A' | 'B' | null>(null);
  const liveInputRef = useRef('');
  const liveOutputRef = useRef('');

  useEffect(() => {
    liveInputRef.current = liveInputTranscript;
  }, [liveInputTranscript]);

  useEffect(() => {
    liveOutputRef.current = liveOutputTranscript;
  }, [liveOutputTranscript]);

  const handleToggleGeminiLiveMode = (enabled: boolean) => {
    setIsGeminiLiveMode(enabled);
    if (typeof window !== 'undefined') {
      localStorage.setItem('omnitrans_gemini_live_mode', String(enabled));
    }
    if (activeMic) {
      if (isGeminiLiveMode) {
        geminiLiveTranslateService.stopSession();
      } else {
        speechEngineRef.current?.stopListening();
      }
      setActiveMic(null);
    }
  };

  // 음성 엔진 초기화
  useEffect(() => {
    speechEngineRef.current = new SpeechEngine();
    return () => {
      speechEngineRef.current?.stopListening();
      geminiLiveTranslateService.stopSession();
    };
  }, []);

  // 새 메시지 시 자동 스크롤
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimSpeech, liveInputTranscript, liveOutputTranscript]);

  // 언어 교환
  const handleSwapLanguages = () => {
    const temp = langA;
    setLangA(langB);
    setLangB(temp);
  };

  // Gemini Live 완료 시 최종 메시지 기록
  const finalizeGeminiTurn = () => {
    const spk = geminiSpeakerRef.current;
    const inText = liveInputRef.current.trim();
    const outText = liveOutputRef.current.trim();

    if (spk && inText && outText) {
      const sourceLang = spk === 'A' ? langA.code : langB.code;
      const targetLang = spk === 'A' ? langB.code : langA.code;
      const speakerName =
        spk === 'A'
          ? `${t.speakerA} (${langA.name})`
          : isPeerConnected
          ? `${t.peerPhone} (${langB.name})`
          : `${t.speakerB} (${langB.name})`;

      const newMsg: TranslationMessage = {
        id: 'msg_gemini_' + Date.now() + Math.random().toString(36).substring(2, 6),
        speakerId: spk,
        speakerName,
        originalText: inText,
        sourceLang,
        targetLang,
        translatedText: outText,
        timestamp: new Date(),
      };

      onAddMessage(newMsg);
      onDeductMinute();
      setLiveInputTranscript('');
      setLiveOutputTranscript('');
    }
  };

  // 번역 실행 및 메시지 전송 (텍스트 입력 및 일반 STT 모드용)
  const processTranslation = async (speaker: 'A' | 'B', text: string) => {
    if (!text.trim() || isTranslating) return;

    const sourceLang = speaker === 'A' ? langA.code : langB.code;
    const targetLang = speaker === 'A' ? langB.code : langA.code;
    const speakerName =
      speaker === 'A'
        ? `${t.speakerA} (${langA.name})`
        : isPeerConnected
        ? `${t.peerPhone} (${langB.name})`
        : `${t.speakerB} (${langB.name})`;

    setIsTranslating(true);
    try {
      const translated = await translateText(text, sourceLang, targetLang, customTerms);
      
      const newMsg: TranslationMessage = {
        id: 'msg_' + Date.now() + Math.random().toString(36).substring(2, 6),
        speakerId: speaker,
        speakerName,
        originalText: text,
        sourceLang,
        targetLang,
        translatedText: translated,
        timestamp: new Date(),
      };

      onAddMessage(newMsg);
      onDeductMinute();

      if (voiceEnabled) {
        speakText(translated, targetLang);
      }
    } catch (err) {
      console.error('Translation error:', err);
    } finally {
      setIsTranslating(false);
      setInterimSpeech('');
    }
  };

  // 텍스트 모달/바텀 인풋 상태
  const [isTextInputOpen, setIsTextInputOpen] = useState(false);
  const [textInputSpeaker, setTextInputSpeaker] = useState<'A' | 'B'>('A');

  // 마이크 토글
  const toggleMic = async (speaker: 'A' | 'B') => {
    if (activeMic === speaker) {
      if (isGeminiLiveMode) {
        geminiLiveTranslateService.stopSession();
        finalizeGeminiTurn();
      } else {
        speechEngineRef.current?.stopListening();
      }
      setActiveMic(null);
      setInterimSpeech('');
      return;
    }

    if (activeMic !== null) {
      if (isGeminiLiveMode) {
        geminiLiveTranslateService.stopSession();
        finalizeGeminiTurn();
      } else {
        speechEngineRef.current?.stopListening();
      }
    }

    setActiveMic(speaker);
    geminiSpeakerRef.current = speaker;
    setLiveInputTranscript('');
    setLiveOutputTranscript('');
    setInterimSpeech('');

    // 1. ⚡ Gemini Live 초저지연 실시간 동시통역 모드
    if (isGeminiLiveMode) {
      if (!geminiLiveTranslateService.isKeyConfigured()) {
        setIsGeminiSettingsOpen(true);
        setActiveMic(null);
        return;
      }

      const targetLangCode = speaker === 'A' ? langB.code : langA.code;
      const started = await geminiLiveTranslateService.startSession(targetLangCode, {
        onInputTranscription: (text) => {
          setLiveInputTranscript((prev) => (prev ? prev + ' ' + text : text));
        },
        onOutputTranscription: (text) => {
          setLiveOutputTranscript((prev) => (prev ? prev + ' ' + text : text));
        },
        onTurnComplete: () => {
          finalizeGeminiTurn();
        },
        onError: (error) => {
          console.warn('Gemini Live Error:', error);
          setActiveMic(null);
        },
        onStatusChange: (status) => {
          setGeminiStatus(status);
        },
      });

      if (!started) {
        setActiveMic(null);
      }
      return;
    }

    // 2. 브라우저 내장 음성인식 모드
    const sourceLangCode = speaker === 'A' ? langA.code : langB.code;
    const started = speechEngineRef.current?.startListening({
      langCode: sourceLangCode,
      onInterimResult: (interim) => {
        setInterimSpeech(interim);
      },
      onFinalResult: (finalText) => {
        setActiveMic(null);
        processTranslation(speaker, finalText);
      },
      onError: (error) => {
        console.warn('Speech recognition error:', error);
        setActiveMic(null);
        setInterimSpeech('');
      },
      onEnd: () => {
        setActiveMic(null);
        setInterimSpeech('');
      },
    });

    if (!started) {
      setActiveMic(null);
    }
  };

  // 텍스트 전송
  const handleSendText = (speaker: 'A' | 'B') => {
    const text = speaker === 'A' ? inputTextA : inputTextB;
    if (!text.trim()) return;
    processTranslation(speaker, text);
    if (speaker === 'A') setInputTextA('');
    else setInputTextB('');
    setIsTextInputOpen(false);
  };

  // 텍스트 복사
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 대화 기록 다운로드
  const handleDownload = () => {
    if (!canDownload) {
      onUpgradePrompt();
      return;
    }

    if (messages.length === 0) return;

    const content = messages
      .map(
        (m) =>
          `[${m.timestamp.toLocaleTimeString()}] ${m.speakerName}\n원문: ${m.originalText}\n통역: ${m.translatedText}\n`
      )
      .join('\n----------------------------------------\n\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `1to1_translation_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ===================== [ 1. 마주보기(Face-to-Face) 50:50 분할 모드 ] =====================
  if (isFaceToFace) {
    const messagesA = messages.filter((m) => m.speakerId === 'A');
    const messagesB = messages.filter((m) => m.speakerId === 'B');
    const lastMsgA = messagesA[messagesA.length - 1];
    const lastMsgB = messagesB[messagesB.length - 1];

    return (
      <div className="fixed inset-0 z-40 bg-slate-950 text-white flex flex-col select-none overflow-hidden animate-fade-in">
        {/* 상단: 맞은편 상대방 영역 (180도 반전) */}
        <div className="flex-1 bg-gradient-to-b from-purple-950/40 via-slate-900 to-slate-950 p-4 flex flex-col justify-between rotate-180 border-b border-purple-500/20 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-purple-900/40 px-3 py-1.5 rounded-full border border-purple-500/30">
              <span className="text-xl">{langB.flag}</span>
              <span className="text-sm font-black text-purple-300">{langB.name}</span>
            </div>
            <span className="text-xs font-bold text-slate-400">
              {isPeerConnected ? t.peerPhone : t.speakerB}
            </span>
          </div>

          {/* 상대방 최근 대화 표시 */}
          <div className="flex-1 flex flex-col items-center justify-center my-2 text-center overflow-y-auto px-2">
            {activeMic === 'B' && interimSpeech ? (
              <div className="bg-purple-500/20 border-2 border-dashed border-purple-400 p-4 rounded-3xl animate-pulse w-full max-w-sm">
                <p className="text-xs text-purple-300 font-bold mb-1">Listening...</p>
                <p className="text-base font-extrabold text-white">"{interimSpeech}"</p>
              </div>
            ) : lastMsgA ? (
              <div className="bg-purple-900/40 border border-purple-500/30 p-4 rounded-3xl max-w-sm w-full shadow-lg">
                <p className="text-xs text-slate-400 mb-1">상대방이 한 말 번역:</p>
                <p className="text-lg font-black text-white">{lastMsgA.translatedText}</p>
                <p className="text-xs text-slate-400 mt-1">({lastMsgA.originalText})</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500 font-medium">
                아래 마이크를 누르고 말씀하세요
              </p>
            )}
          </div>

          {/* 상대방 마이크 버튼 */}
          <div className="flex items-center justify-center">
            <button
              onClick={() => toggleMic('B')}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-xl ${
                activeMic === 'B'
                  ? 'bg-rose-500 text-white ring-8 ring-rose-500/30 animate-pulse'
                  : 'bg-gradient-to-tr from-purple-600 to-pink-500 text-white shadow-purple-500/30'
              }`}
            >
              {activeMic === 'B' ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </button>
          </div>
        </div>

        {/* 중앙 분할선 & 나가기 바 */}
        <div className="h-10 bg-slate-900 border-y border-slate-800 flex items-center justify-between px-4 z-10 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold">
            <RotateCw className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
            <span>마주보기 50:50 모드</span>
          </div>
          <button
            onClick={() => setIsFaceToFace(false)}
            className="text-xs font-bold px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-full border border-slate-700 transition"
          >
            일반 모드로 복귀
          </button>
        </div>

        {/* 하단: 내 영역 (정방향) */}
        <div className="flex-1 bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/40 p-4 flex flex-col justify-between border-t border-indigo-500/20 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-indigo-900/40 px-3 py-1.5 rounded-full border border-indigo-500/30">
              <span className="text-xl">{langA.flag}</span>
              <span className="text-sm font-black text-indigo-300">{langA.name}</span>
            </div>
            <span className="text-xs font-bold text-slate-400">{t.speakerA} (나)</span>
          </div>

          {/* 내 방향 최근 번역 대화 표시 */}
          <div className="flex-1 flex flex-col items-center justify-center my-2 text-center overflow-y-auto px-2">
            {activeMic === 'A' && interimSpeech ? (
              <div className="bg-indigo-500/20 border-2 border-dashed border-indigo-400 p-4 rounded-3xl animate-pulse w-full max-w-sm">
                <p className="text-xs text-indigo-300 font-bold mb-1">음성 듣는 중...</p>
                <p className="text-base font-extrabold text-white">"{interimSpeech}"</p>
              </div>
            ) : lastMsgB ? (
              <div className="bg-indigo-900/40 border border-indigo-500/30 p-4 rounded-3xl max-w-sm w-full shadow-lg">
                <p className="text-xs text-slate-400 mb-1">상대방이 한 말 번역:</p>
                <p className="text-lg font-black text-white">{lastMsgB.translatedText}</p>
                <p className="text-xs text-slate-400 mt-1">({lastMsgB.originalText})</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500 font-medium">
                아래 마이크를 누르고 한국어로 말씀하세요
              </p>
            )}
          </div>

          {/* 내 마이크 버튼 */}
          <div className="flex items-center justify-center">
            <button
              onClick={() => toggleMic('A')}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-xl ${
                activeMic === 'A'
                  ? 'bg-rose-500 text-white ring-8 ring-rose-500/30 animate-pulse'
                  : 'bg-gradient-to-tr from-indigo-600 to-cyan-500 text-white shadow-indigo-500/30'
              }`}
            >
              {activeMic === 'A' ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===================== [ 2. 일반 모바일 최적화 뷰 ] =====================
  return (
    <div className="flex-1 flex flex-col h-full min-h-0 relative pb-24 md:pb-6">
      
      {/* 상대방 QR 연결 라이브 상태 배너 */}
      {isPeerConnected && (
        <div className="mb-2 bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 px-3.5 py-2 rounded-2xl flex items-center justify-between text-xs font-bold shadow-sm animate-fade-in shrink-0">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="truncate">{t.peerLiveBanner}</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 font-extrabold uppercase shrink-0">
            LIVE SYNC
          </span>
        </div>
      )}

      {/* 🚀 상단 슬림 언어 셀렉터 & 모바일 퀵 툴바 */}
      <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-2.5 sm:p-3.5 shadow-sm border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0 mb-3">
        
        {/* 언어 선택 캡슐 (좌: 화자 A ⇄ 우: 화자 B) */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
          
          {/* 화자 A 언어 드롭다운 */}
          <div className="flex-1 min-w-0 flex items-center gap-1 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl shadow-xs">
            <span className="text-base shrink-0">{langA.flag}</span>
            <select
              value={langA.code}
              onChange={(e) => {
                const found = SUPPORTED_LANGUAGES.find((l) => l.code === e.target.value);
                if (found) setLangA(found);
              }}
              className="w-full bg-transparent text-xs font-black text-indigo-600 dark:text-indigo-400 border-none p-0 focus:ring-0 cursor-pointer truncate"
            >
              {['동아시아', '동남아/남아시아', '유럽', '중동/기타'].map((cat) => (
                <optgroup key={`a-cat-${cat}`} label={`--- ${cat} ---`} className="font-bold text-slate-400 bg-white dark:bg-slate-900">
                  {SUPPORTED_LANGUAGES.filter((l) => l.category === cat).map((l) => (
                    <option key={`a-${l.code}`} value={l.code} className="text-slate-800 dark:text-slate-200">
                      {l.flag} {l.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* 언어 교환 버튼 */}
          <button
            onClick={handleSwapLanguages}
            className="p-2 rounded-xl bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 shadow-xs transition-all active:scale-90 shrink-0"
            title={t.swapLanguages}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>

          {/* 화자 B 언어 드롭다운 */}
          <div className="flex-1 min-w-0 flex items-center gap-1 bg-white dark:bg-slate-900 px-2.5 py-1.5 rounded-xl shadow-xs">
            <span className="text-base shrink-0">{langB.flag}</span>
            <select
              value={langB.code}
              onChange={(e) => {
                const found = SUPPORTED_LANGUAGES.find((l) => l.code === e.target.value);
                if (found) setLangB(found);
              }}
              className="w-full bg-transparent text-xs font-black text-purple-600 dark:text-purple-400 border-none p-0 focus:ring-0 cursor-pointer truncate"
            >
              {['동아시아', '동남아/남아시아', '유럽', '중동/기타'].map((cat) => (
                <optgroup key={`b-cat-${cat}`} label={`--- ${cat} ---`} className="font-bold text-slate-400 bg-white dark:bg-slate-900">
                  {SUPPORTED_LANGUAGES.filter((l) => l.category === cat).map((l) => (
                    <option key={`b-${l.code}`} value={l.code} className="text-slate-800 dark:text-slate-200">
                      {l.flag} {l.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {/* 퀵 툴 액션 버튼 그룹 */}
        <div className="flex items-center gap-1 shrink-0">
          
          {/* QR 코드 상대방 초대 버튼 (호스트 전용) */}
          {!isGuestMode && (
            <button
              onClick={onOpenQRModal}
              className={`p-2 rounded-xl border transition-all active:scale-90 ${
                isPeerConnected
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                  : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
              }`}
              title="상대방 스마트폰 QR 연결"
            >
              <QrCode className="w-4 h-4" />
            </button>
          )}

          {/* 마주보기 듀얼 스플릿 뷰 토글 */}
          <button
            onClick={() => setIsFaceToFace(true)}
            className="p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 transition-all active:scale-90"
            title="마주보기 50:50 테이블 모드"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* 대화 다운로드 */}
          <button
            onClick={handleDownload}
            disabled={messages.length === 0}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
            title={t.downloadChat}
          >
            <Download className="w-4 h-4" />
          </button>

          {/* 대화 초기화 */}
          <button
            onClick={onClearMessages}
            disabled={messages.length === 0}
            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-30 transition-colors"
            title={t.clearHistory}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* 💬 실시간 대화 피드 (모바일 화면 최대 활용) */}
      <div className="flex-1 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-3xl p-3.5 sm:p-5 shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-y-auto flex flex-col gap-3 min-h-[300px] relative">
        
        {messages.length === 0 && !activeMic && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4 my-auto">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center mb-3 text-indigo-600 dark:text-indigo-400 shadow-inner">
              <Sparkles className="w-7 h-7 animate-pulse" />
            </div>
            <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 mb-1">
              {t.historyEmptyTitle}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed mb-5">
              {t.historyEmptyDesc}
            </p>

            {/* 빠른 추천 대화 칩 */}
            <div className="w-full max-w-md">
              <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-slate-400 mb-2">
                <MessageSquarePlus className="w-3.5 h-3.5 text-indigo-500" />
                <span>원터치 빠른 추천 문장:</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {QUICK_PROMPTS.slice(0, 6).map((prompt, idx) => (
                  <button
                    key={`quick-${idx}`}
                    onClick={() => processTranslation('A', prompt)}
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 transition active:scale-95"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 1:1 대화 버블 리스트 */}
        {messages.map((msg) => {
          const isA = msg.speakerId === 'A';

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isA ? 'items-start' : 'items-end'} animate-fade-in`}
            >
              {/* 화자 라벨 */}
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 mb-1 px-1">
                <span>{isA ? langA.flag : langB.flag}</span>
                <span>{msg.speakerName}</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* 통역 카드 */}
              <div
                className={`max-w-[88%] sm:max-w-[75%] rounded-3xl p-3.5 sm:p-4 shadow-sm border ${
                  isA
                    ? 'bg-gradient-to-br from-indigo-50/95 to-blue-50/70 dark:from-indigo-950/60 dark:to-slate-850 border-indigo-200/80 dark:border-indigo-900/60 text-slate-900 dark:text-slate-100'
                    : 'bg-gradient-to-br from-purple-50/95 to-pink-50/70 dark:from-purple-950/60 dark:to-slate-850 border-purple-200/80 dark:border-purple-900/60 text-slate-900 dark:text-slate-100'
                }`}
              >
                {/* 원문 */}
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1.5 border-b border-slate-200/60 dark:border-slate-700/60 pb-1.5">
                  {msg.originalText}
                </p>

                {/* 실시간 통역문 (크고 선명하게) */}
                <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-relaxed">
                  {msg.translatedText}
                </p>

                {/* 하단 컨트롤 */}
                <div className="flex items-center justify-between gap-3 mt-2.5 pt-1.5 text-xs">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 dark:text-indigo-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    <span>AI LIVE</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* TTS 다시듣기 */}
                    <button
                      onClick={() => speakText(msg.translatedText, msg.targetLang)}
                      className="p-1 rounded-lg hover:bg-white/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition active:scale-90"
                      title={t.speakAgain}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>

                    {/* 복사 */}
                    <button
                      onClick={() => handleCopy(msg.id, msg.translatedText)}
                      className="p-1 rounded-lg hover:bg-white/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition active:scale-90"
                      title={t.copy}
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* 실시간 음성 인식 중 인터림 버블 */}
        {/* ⚡ Gemini Live 초저지연 실시간 동시통역 버블 */}
        {activeMic && isGeminiLiveMode && (liveInputTranscript || liveOutputTranscript) && (
          <div
            className={`flex flex-col ${activeMic === 'A' ? 'items-start' : 'items-end'} animate-fade-in`}
          >
            <div className="flex items-center gap-1.5 text-xs font-black bg-gradient-to-r from-blue-500 to-indigo-500 bg-clip-text text-transparent mb-1 px-1">
              <Zap className="w-3.5 h-3.5 text-indigo-500 animate-bounce" />
              <span>Gemini 3.5 Live 동시통역 스트리밍 중</span>
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500" />
              </span>
            </div>

            <div className="max-w-[90%] sm:max-w-[80%] rounded-3xl p-4 bg-gradient-to-br from-indigo-900/90 to-slate-900/95 text-white shadow-2xl border-2 border-indigo-500/50 backdrop-blur-xl flex flex-col gap-2.5">
              {liveInputTranscript && (
                <div>
                  <div className="text-[10px] uppercase font-extrabold tracking-wider text-indigo-300/80 mb-0.5">
                    Original Speech (16kHz PCM)
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 font-medium italic leading-relaxed">
                    "{liveInputTranscript}"
                  </p>
                </div>
              )}

              {liveOutputTranscript && (
                <div className="pt-2 border-t border-indigo-500/30">
                  <div className="text-[10px] uppercase font-extrabold tracking-wider text-cyan-300/90 mb-0.5 flex items-center gap-1">
                    <span>Translated Audio & Subtitles (24kHz AI Voice)</span>
                  </div>
                  <p className="text-sm sm:text-base font-black text-white leading-relaxed">
                    {liveOutputTranscript}
                  </p>
                </div>
              )}

              <div className="h-4 flex items-center justify-between pt-1">
                <AudioVisualizer isListening={true} />
                <span className="text-[10px] font-bold text-indigo-400">
                  말을 끝내려면 마이크 버튼을 다시 탭하세요
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 일반 Web Speech API 음성 인식 중 인터림 버블 */}
        {activeMic && !isGeminiLiveMode && interimSpeech && (
          <div
            className={`flex flex-col ${activeMic === 'A' ? 'items-start' : 'items-end'} animate-fade-in`}
          >
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-500 mb-1 px-1">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>{t.micListening}</span>
            </div>
            <div className="max-w-[85%] rounded-3xl p-3.5 bg-indigo-500/10 border-2 border-dashed border-indigo-500 text-indigo-900 dark:text-indigo-200 shadow-md flex flex-col gap-2">
              <p className="text-sm font-bold italic animate-pulse">
                "{interimSpeech}"
              </p>
              <div className="h-4 flex items-center">
                <AudioVisualizer isListening={true} />
              </div>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* 🎙️ [모바일 핵심 혁신] 엄지손가락 친화적 듀얼 보이스 액션 독 (Dual Voice Action Dock) */}
      <div className="fixed bottom-3 inset-x-3 sm:inset-x-auto sm:right-6 sm:left-auto sm:w-[480px] z-30 flex flex-col gap-1.5">
        
        {/* ⚡ Gemini Live 실시간 동시통역 퀵 컨트롤 바 */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/90 dark:bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-indigo-500/40 text-xs shadow-lg">
          <div 
            onClick={() => setIsGeminiSettingsOpen(true)}
            className="flex items-center gap-1.5 cursor-pointer group select-none"
            title="Gemini API 키 및 모델 설정"
          >
            <span className="flex h-2 w-2 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isGeminiLiveMode ? 'bg-cyan-400' : 'bg-slate-500'} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${isGeminiLiveMode ? 'bg-cyan-500' : 'bg-slate-400'}`} />
            </span>
            <span className="font-extrabold bg-gradient-to-r from-blue-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent group-hover:brightness-125 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Gemini 3.5 Live 동시통역</span>
            </span>
            <span className="text-[10px] text-indigo-300 underline decoration-dotted flex items-center gap-0.5">
              <Settings className="w-3 h-3" />
              <span>설정</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-300 hidden xs:inline">
              {isGeminiLiveMode
                ? geminiStatus === 'connecting'
                  ? '연결 중...'
                  : geminiStatus === 'connected'
                  ? '⚡ 스트리밍 중'
                  : 'Live 스트리밍 ON'
                : '브라우저 모드'}
            </span>
            <button
              onClick={() => handleToggleGeminiLiveMode(!isGeminiLiveMode)}
              className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                isGeminiLiveMode ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : 'bg-slate-700'
              }`}
              title="Gemini Live 동시통역 ON/OFF"
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${
                  isGeminiLiveMode ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* 듀얼 마이크 액션 버튼 바 */}
        <div className="bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-2xl p-2.5 rounded-3xl shadow-2xl border border-slate-700/80 flex items-center justify-between gap-2">
          
          {/* 화자 A 원터치 마이크 버튼 */}
          <button
            onClick={() => toggleMic('A')}
            className={`flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 font-black text-xs sm:text-sm transition-all active:scale-95 relative overflow-hidden ${
              activeMic === 'A'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 animate-pulse ring-2 ring-white'
                : 'bg-gradient-to-tr from-indigo-600 to-blue-500 text-white shadow-md shadow-indigo-500/30 hover:brightness-110'
            }`}
          >
            {activeMic === 'A' ? (
              <>
                <MicOff className="w-5 h-5 animate-bounce" />
                <span>듣는 중 (완료 시 탭)</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                <span className="truncate">{langA.flag} {langA.name} 말하기</span>
              </>
            )}
          </button>

          {/* 중앙 텍스트 입력 토글 버튼 */}
          <button
            onClick={() => {
              setIsTextInputOpen(!isTextInputOpen);
            }}
            className={`w-12 h-14 rounded-2xl flex flex-col items-center justify-center text-slate-300 hover:text-white border transition-all active:scale-90 shrink-0 ${
              isTextInputOpen
                ? 'bg-indigo-600 border-indigo-400 text-white'
                : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
            }`}
            title="텍스트 직접 입력"
          >
            <Send className="w-4 h-4" />
            <span className="text-[9px] font-bold mt-0.5">글입력</span>
          </button>

          {/* 화자 B 원터치 마이크 버튼 */}
          <button
            onClick={() => toggleMic('B')}
            className={`flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 font-black text-xs sm:text-sm transition-all active:scale-95 relative overflow-hidden ${
              activeMic === 'B'
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 animate-pulse ring-2 ring-white'
                : 'bg-gradient-to-tr from-purple-600 to-pink-500 text-white shadow-md shadow-purple-500/30 hover:brightness-110'
            }`}
          >
            {activeMic === 'B' ? (
              <>
                <MicOff className="w-5 h-5 animate-bounce" />
                <span>Listening (Tap to stop)</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                <span className="truncate">{langB.flag} {langB.name} Speak</span>
              </>
            )}
          </button>

        </div>

        {/* ⌨️ 팝업 슬라이드업 텍스트 입력 바텀 시트 */}
        {isTextInputOpen && (
          <div className="absolute bottom-28 inset-x-0 bg-white dark:bg-slate-900 rounded-3xl p-3.5 shadow-2xl border-2 border-indigo-500/30 animate-fade-in z-40 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setTextInputSpeaker('A')}
                  className={`px-3 py-1 rounded-full text-xs font-extrabold transition ${
                    textInputSpeaker === 'A'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {langA.flag} {langA.name}
                </button>
                <button
                  onClick={() => setTextInputSpeaker('B')}
                  className={`px-3 py-1 rounded-full text-xs font-extrabold transition ${
                    textInputSpeaker === 'B'
                      ? 'bg-purple-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {langB.flag} {langB.name}
                </button>
              </div>
              <button
                onClick={() => setIsTextInputOpen(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 p-1"
              >
                ✕ 닫기
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                autoFocus
                value={textInputSpeaker === 'A' ? inputTextA : inputTextB}
                onChange={(e) => {
                  if (textInputSpeaker === 'A') setInputTextA(e.target.value);
                  else setInputTextB(e.target.value);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleSendText(textInputSpeaker)}
                placeholder={
                  textInputSpeaker === 'A'
                    ? `${langA.name} 문장을 입력하세요...`
                    : `Enter ${langB.name} sentence...`
                }
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <button
                onClick={() => handleSendText(textInputSpeaker)}
                disabled={
                  !(textInputSpeaker === 'A' ? inputTextA.trim() : inputTextB.trim()) ||
                  isTranslating
                }
                className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs disabled:opacity-40 transition shrink-0 shadow-md"
              >
                전송
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ⚡ Gemini Live 설정 모달 */}
      <GeminiLiveSettingsModal
        isOpen={isGeminiSettingsOpen}
        onClose={() => setIsGeminiSettingsOpen(false)}
        t={t}
      />

    </div>
  );
};

export default OneToOneTranslator;
