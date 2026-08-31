import React, { useState, useEffect } from 'react';
import { Sparkles, Key, ExternalLink, Check, AlertCircle, Zap, ShieldCheck } from 'lucide-react';
import { geminiLiveTranslateService } from '../services/geminiLiveTranslateService';
import type { UIStringDictionary } from '../i18n/translations';

interface GeminiLiveSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  t?: UIStringDictionary;
}

export const GeminiLiveSettingsModal: React.FC<GeminiLiveSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setApiKey(geminiLiveTranslateService.getApiKey());
      setIsSaved(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      geminiLiveTranslateService.setApiKey('');
      setIsSaved(true);
      setTimeout(() => {
        onClose();
      }, 700);
      return;
    }

    if (!trimmed.startsWith('AIza') && trimmed.length < 20) {
      setError('올바른 Google Gemini API 키 형식이 아닙니다. (AIza...로 시작)');
      return;
    }

    geminiLiveTranslateService.setApiKey(trimmed);
    setIsSaved(true);
    setError(null);
    setTimeout(() => {
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
        {/* 상단 장식 그라데이션 */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-400" />

        {/* 헤더 */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Gemini Live 실시간 통역 설정
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                  gemini-3.5-live-translate
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Google의 차세대 실시간 음성-대-음성(Speech-to-Speech) 모델
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center font-bold text-sm transition"
          >
            ✕
          </button>
        </div>

        {/* 특장점 안내 배너 */}
        <div className="bg-gradient-to-r from-indigo-50/80 to-blue-50/80 dark:from-indigo-950/40 dark:to-blue-950/30 rounded-2xl p-3.5 border border-indigo-200/60 dark:border-indigo-800/60 mb-5">
          <div className="flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
            <Sparkles className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-indigo-950 dark:text-indigo-200">
                100% 실시간 양방향 오디오 동시통역
              </div>
              <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                마이크 16kHz PCM 스트리밍과 24kHz 고품질 AI 음성 스트리밍으로 화자가 말하는 즉시 번역 음성과 실시간 자막을 동시 출력합니다.
              </div>
            </div>
          </div>
        </div>

        {/* API Key 입력 폼 */}
        <div className="space-y-3 mb-5">
          <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
            Google Gemini API Key
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Key className="w-4 h-4" />
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setError(null);
                setIsSaved(false);
              }}
              placeholder="AIzaSy..."
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl pl-10 pr-4 py-3 text-xs sm:text-sm font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
            />
          </div>

          {error && (
            <div className="flex items-center gap-1.5 text-xs text-rose-500 font-bold animate-shake">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>Google AI Studio에서 무료 API 키 발급받기</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <div className="flex items-center gap-1 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>로컬 브라우저에 안전하게 저장됨</span>
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold text-white flex items-center gap-1.5 shadow-lg transition-all active:scale-95 ${
              isSaved
                ? 'bg-emerald-600 shadow-emerald-500/30'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30'
            }`}
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4" />
                <span>저장 완료!</span>
              </>
            ) : (
              <span>설정 저장하기</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
