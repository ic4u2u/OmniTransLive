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
  Radio
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../types/translator';
import type { Language, TranslationMessage } from '../types/translator';
import type { UIStringDictionary } from '../i18n/translations';
import { translateText, speakText, SpeechEngine } from '../services/translatorEngine';
import { AudioVisualizer } from './AudioVisualizer';

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

  // 음성 엔진 초기화
  useEffect(() => {
    speechEngineRef.current = new SpeechEngine();
    return () => {
      speechEngineRef.current?.stopListening();
    };
  }, []);

  // 새 메시지 시 자동 스크롤
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimSpeech]);

  // 언어 교환
  const handleSwapLanguages = () => {
    const temp = langA;
    setLangA(langB);
    setLangB(temp);
  };

  // 번역 실행 및 메시지 전송
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

  // 마이크 토글
  const toggleMic = (speaker: 'A' | 'B') => {
    if (activeMic === speaker) {
      speechEngineRef.current?.stopListening();
      setActiveMic(null);
      setInterimSpeech('');
      return;
    }

    if (activeMic !== null) {
      speechEngineRef.current?.stopListening();
    }

    setActiveMic(speaker);
    const targetLangCode = speaker === 'A' ? langA.code : langB.code;

    const started = speechEngineRef.current?.startListening({
      langCode: targetLangCode,
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

  return (
    <div className="flex-1 flex flex-col gap-3 min-h-0">
      
      {/* 상대방 QR 연결 라이브 상태 배너 */}
      {isPeerConnected && (
        <div className="bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 px-4 py-2.5 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-bold shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>{t.peerLiveBanner}</span>
          </div>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 font-extrabold uppercase">
            LIVE SYNC
          </span>
        </div>
      )}

      {/* 1:1 통역 상단 헤더 컨트롤 바 */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-3 sm:p-4 shadow-sm border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        
        {/* 언어 선택 및 교환 컨트롤 */}
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          
          {/* 화자 A 언어 */}
          <div className="flex-1 flex items-center gap-1.5 bg-indigo-50/60 dark:bg-indigo-950/40 px-3 py-1.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/60">
            <span className="text-lg">{langA.flag}</span>
            <select
              value={langA.code}
              onChange={(e) => {
                const found = SUPPORTED_LANGUAGES.find((l) => l.code === e.target.value);
                if (found) setLangA(found);
              }}
              className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 border-none p-0 focus:ring-0 cursor-pointer"
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
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all active:scale-90 shrink-0"
            title={t.swapLanguages}
          >
            <ArrowLeftRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </button>

          {/* 화자 B 언어 */}
          <div className="flex-1 flex items-center gap-1.5 bg-purple-50/60 dark:bg-purple-950/40 px-3 py-1.5 rounded-2xl border border-purple-100 dark:border-purple-900/60">
            <span className="text-lg">{langB.flag}</span>
            <select
              value={langB.code}
              onChange={(e) => {
                const found = SUPPORTED_LANGUAGES.find((l) => l.code === e.target.value);
                if (found) setLangB(found);
              }}
              className="w-full bg-transparent text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 border-none p-0 focus:ring-0 cursor-pointer"
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

        {/* 1:1 특화 도구 모음 */}
        <div className="flex items-center gap-2">
          
          {/* 마주보기 듀얼 스플릿 뷰 토글 */}
          <button
            onClick={() => setIsFaceToFace(!isFaceToFace)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
              isFaceToFace
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/20'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
            }`}
            title={t.faceToFaceMode}
          >
            <RotateCw className={`w-3.5 h-3.5 ${isFaceToFace ? 'animate-spin-slow text-amber-300' : ''}`} />
            <span className="hidden sm:inline">{t.faceToFaceMode}</span>
          </button>

          {/* QR 코드 상대방 초대 버튼 */}
          {!isGuestMode && (
            <button
              onClick={onOpenQRModal}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                isPeerConnected
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                  : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
              }`}
              title="상대방 스마트폰 QR 연결"
            >
              <QrCode className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden sm:inline">
                {isPeerConnected ? t.qrConnected : t.qrInvite}
              </span>
            </button>
          )}

          {/* 대화 다운로드 */}
          <button
            onClick={handleDownload}
            disabled={messages.length === 0}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
            title={t.downloadChat}
          >
            <Download className="w-4 h-4" />
          </button>

          {/* 대화 초기화 */}
          <button
            onClick={onClearMessages}
            disabled={messages.length === 0}
            className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-40 transition-colors"
            title={t.clearHistory}
          >
            <Trash2 className="w-4 h-4" />
          </button>

        </div>

      </div>

      {/* 1:1 실시간 통역 메인 채팅 캔버스 */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl p-4 sm:p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 overflow-y-auto flex flex-col gap-4 min-h-[380px] max-h-[calc(100vh-390px)] relative">
        
        {messages.length === 0 && !activeMic && (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 my-auto">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400 shadow-inner">
              <Sparkles className="w-8 h-8 animate-pulse" />
            </div>
            <h3 className="text-base sm:text-lg font-black text-slate-800 dark:text-slate-100 mb-2">
              {t.historyEmptyTitle}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md leading-relaxed mb-6">
              {t.historyEmptyDesc}
            </p>

            {/* 빠른 추천 대화 칩 */}
            <div className="w-full max-w-lg">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 mb-3">
                <MessageSquarePlus className="w-3.5 h-3.5 text-indigo-500" />
                <span>자주 쓰는 1:1 표현 바로 말하기:</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={`quick-${idx}`}
                    onClick={() => processTranslation('A', prompt)}
                    className="text-xs font-medium px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 transition hover:border-indigo-300"
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
          const isFlipped = isFaceToFace && !isA; // 마주보기 모드일 때 상대방(B)의 메시지는 180도 회전

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isA ? 'items-start' : 'items-end'} transition-all ${
                isFlipped ? 'rotate-180 mb-2' : ''
              }`}
            >
              {/* 화자 라벨 */}
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 mb-1 px-1">
                <span>{isA ? langA.flag : langB.flag}</span>
                <span>{msg.speakerName}</span>
                <span className="text-[10px] text-slate-400 font-normal">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* 통역 카드 */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 shadow-sm border ${
                  isA
                    ? 'bg-gradient-to-br from-indigo-50/90 to-blue-50/50 dark:from-indigo-950/50 dark:to-slate-800/80 border-indigo-100 dark:border-indigo-900/60 text-slate-900 dark:text-slate-100'
                    : 'bg-gradient-to-br from-purple-50/90 to-pink-50/50 dark:from-purple-950/50 dark:to-slate-800/80 border-purple-100 dark:border-purple-900/60 text-slate-900 dark:text-slate-100'
                }`}
              >
                {/* 원문 */}
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mb-2 border-b border-slate-200/50 dark:border-slate-700/50 pb-2">
                  {msg.originalText}
                </p>

                {/* 실시간 통역문 (크고 선명하게) */}
                <p className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white leading-relaxed">
                  {msg.translatedText}
                </p>

                {/* 하단 컨트롤 */}
                <div className="flex items-center justify-between gap-3 mt-3 pt-2 text-xs">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                    <span>AI LIVE</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* TTS 다시듣기 */}
                    <button
                      onClick={() => speakText(msg.translatedText, msg.targetLang)}
                      className="p-1.5 rounded-lg hover:bg-white/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                      title={t.speakAgain}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>

                    {/* 복사 */}
                    <button
                      onClick={() => handleCopy(msg.id, msg.translatedText)}
                      className="p-1.5 rounded-lg hover:bg-white/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
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
        {activeMic && interimSpeech && (
          <div
            className={`flex flex-col ${activeMic === 'A' ? 'items-start' : 'items-end'} animate-fade-in ${
              isFaceToFace && activeMic === 'B' ? 'rotate-180' : ''
            }`}
          >
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-500 mb-1 px-1">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>{t.micListening}</span>
            </div>
            <div className="max-w-[80%] rounded-3xl p-4 bg-indigo-500/10 border-2 border-dashed border-indigo-500 text-indigo-900 dark:text-indigo-200">
              <p className="text-sm sm:text-base font-bold italic animate-pulse">
                "{interimSpeech}"
              </p>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* 1:1 양방향 대화 입력 및 마이크 패널 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        
        {/* 화자 A 입력 패널 (내 스마트폰 / 한국어 등) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-3 sm:p-4 shadow-sm border border-indigo-100 dark:border-indigo-950/80 flex flex-col gap-2 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">{langA.flag}</span>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {t.speakerA} ({langA.name})
              </span>
            </div>
            {activeMic === 'A' && (
              <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                {t.recording}
              </span>
            )}
          </div>

          {/* 파형 시각화 */}
          {activeMic === 'A' && (
            <div className="h-6 flex items-center justify-center">
              <AudioVisualizer isListening={true} />
            </div>
          )}

          {/* 입력창 & 버튼 */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputTextA}
              onChange={(e) => setInputTextA(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendText('A')}
              placeholder={t.textPlaceholderA}
              className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />

            <button
              onClick={() => handleSendText('A')}
              disabled={!inputTextA.trim() || isTranslating}
              className="p-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 transition-all active:scale-95 shrink-0 shadow-sm"
              title="전송"
            >
              <Send className="w-4 h-4" />
            </button>

            {/* 마이크 원터치 버튼 */}
            <button
              onClick={() => toggleMic('A')}
              className={`p-2.5 rounded-2xl border transition-all active:scale-90 shrink-0 ${
                activeMic === 'A'
                  ? 'bg-rose-500 border-rose-600 text-white shadow-lg shadow-rose-500/30 animate-pulse'
                  : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
              }`}
              title="화자 A 마이크"
            >
              {activeMic === 'A' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* 화자 B 입력 패널 (상대방 / 외국어) */}
        <div className={`bg-white dark:bg-slate-900 rounded-3xl p-3 sm:p-4 shadow-sm border border-purple-100 dark:border-purple-950/80 flex flex-col gap-2 relative ${
          isFaceToFace ? 'rotate-180' : ''
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">{langB.flag}</span>
              <span className="text-xs font-bold text-purple-600 dark:text-purple-400">
                {isPeerConnected ? t.peerPhone : t.speakerB} ({langB.name})
              </span>
            </div>
            {activeMic === 'B' && (
              <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                {t.recording}
              </span>
            )}
          </div>

          {/* 파형 시각화 */}
          {activeMic === 'B' && (
            <div className="h-6 flex items-center justify-center">
              <AudioVisualizer isListening={true} />
            </div>
          )}

          {/* 입력창 & 버튼 */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputTextB}
              onChange={(e) => setInputTextB(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendText('B')}
              placeholder={t.textPlaceholderB}
              className="flex-1 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />

            <button
              onClick={() => handleSendText('B')}
              disabled={!inputTextB.trim() || isTranslating}
              className="p-2.5 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-40 transition-all active:scale-95 shrink-0 shadow-sm"
              title="전송"
            >
              <Send className="w-4 h-4" />
            </button>

            {/* 마이크 원터치 버튼 */}
            <button
              onClick={() => toggleMic('B')}
              className={`p-2.5 rounded-2xl border transition-all active:scale-90 shrink-0 ${
                activeMic === 'B'
                  ? 'bg-rose-500 border-rose-600 text-white shadow-lg shadow-rose-500/30 animate-pulse'
                  : 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/60 dark:hover:bg-purple-900 text-purple-600 dark:text-purple-300 border-purple-200 dark:border-purple-800'
              }`}
              title="화자 B 마이크"
            >
              {activeMic === 'B' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};

export default OneToOneTranslator;
