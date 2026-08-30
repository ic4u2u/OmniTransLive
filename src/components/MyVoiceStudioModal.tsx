import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Mic, 
  Sparkles, 
  Play, 
  Square, 
  Check, 
  Volume2, 
  Trash2, 
  Radio, 
  ShieldCheck,
  Headphones,
  Activity
} from 'lucide-react';
import { 
  voiceCloneService, 
  STANDARD_RECORDING_SCRIPT, 
  RECORDING_SCRIPT_PRESETS,
  type VoiceProfile 
} from '../services/voiceCloneService';

interface MyVoiceStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  isVoiceCloneEnabled: boolean;
  onToggleVoiceClone: (enabled: boolean) => void;
  onProfileUpdated?: (profile: VoiceProfile | null) => void;
}

export const MyVoiceStudioModal: React.FC<MyVoiceStudioModalProps> = ({
  isOpen,
  onClose,
  isVoiceCloneEnabled,
  onToggleVoiceClone,
  onProfileUpdated,
}) => {
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [selectedScript, setSelectedScript] = useState<string>(STANDARD_RECORDING_SCRIPT);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [currentLivePitch, setCurrentLivePitch] = useState<number | null>(null);
  const [isPlayingSample, setIsPlayingSample] = useState<string | null>(null);
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);

  const timerRef = useRef<number | null>(null);

  // 저장된 프로필 로드
  useEffect(() => {
    if (isOpen) {
      voiceCloneService.getSavedProfile().then((p) => {
        setProfile(p);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 녹음 시작
  const handleStartRecord = async () => {
    setIsRecording(true);
    setRecordSeconds(0);
    setCurrentLivePitch(null);

    const started = await voiceCloneService.startRecording((vol, pitch) => {
      setVolumeLevel(vol);
      if (pitch) setCurrentLivePitch(pitch);
    });

    if (!started) {
      setIsRecording(false);
      return;
    }

    timerRef.current = window.setInterval(() => {
      setRecordSeconds((prev) => prev + 1);
    }, 1000);
  };

  // 녹음 완료 및 프로필 저장
  const handleStopRecord = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);

    try {
      const audioBlob = await voiceCloneService.stopRecording();
      const newProfile = await voiceCloneService.saveProfile(audioBlob, selectedScript);
      setProfile(newProfile);
      onToggleVoiceClone(true);
      onProfileUpdated?.(newProfile);
      setSaveSuccessToast(true);
      setTimeout(() => setSaveSuccessToast(false), 3000);
    } catch (e) {
      console.error('Record save error:', e);
    }
  };

  // 목소리 프로필 삭제
  const handleDeleteProfile = async () => {
    if (window.confirm('등록된 내 목소리 프로필을 삭제하시겠습니까?')) {
      await voiceCloneService.deleteProfile();
      setProfile(null);
      onToggleVoiceClone(false);
      onProfileUpdated?.(null);
    }
  };

  // 다국어 미리듣기 샘플
  const SAMPLES = [
    { lang: 'en', name: '미국 영어', flag: '🇺🇸', text: 'Hello! I am speaking to the world with my own natural voice.' },
    { lang: 'ja', name: '일본어', flag: '🇯🇵', text: 'こんにちは！私の声でリアルタイムに通訳しています。' },
    { lang: 'zh', name: '중국어', flag: '🇨🇳', text: '你好！我正在用自己的声音跨越语言障碍进行交流。' },
  ];

  const handlePlaySample = async (sample: typeof SAMPLES[0]) => {
    if (!profile) return;
    setIsPlayingSample(sample.lang);

    await voiceCloneService.generateAndPlayClonedVoice(sample.text, sample.lang, profile);
    setIsPlayingSample(null);
  };

  const getCategoryLabel = (cat?: string) => {
    switch (cat) {
      case 'bass': return '베이스 (중후한 저음)';
      case 'baritone': return '바리톤 (부드러운 중음)';
      case 'tenor': return '테너 (밝고 또렷한 고음)';
      case 'alto': return '알토 (차분한 여성 중음)';
      case 'soprano': return '소프라노 (맑은 여성 고음)';
      default: return '자연스러운 음색';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden relative">
        
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 상단 헤더 */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5">
              <span>내 목소리 3초 클론 스튜디오</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                100% 무료
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              3초만 낭독하면 내 음색/피치를 학습하여 외국어로 자동 변환합니다.
            </p>
          </div>
        </div>

        {/* 메인 콘텐츠 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          
          {/* 1. 표준 낭독 문장 카드 (프리셋 선택 지원) */}
          <div className="bg-gradient-to-br from-indigo-50/80 via-purple-50/40 to-slate-50 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900 rounded-2xl p-3.5 border border-indigo-200/80 dark:border-indigo-900/60 relative space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                표준 낭독 문장 (3초)
              </span>
              <span className="text-[10px] text-slate-400">자연스럽게 읽어주세요</span>
            </div>

            {/* 프리셋 선택 칩 3종 */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {['🌐 글로벌 소통', '✈️ 여행/비즈니스', '✨ 희망/연결'].map((label, idx) => (
                <button
                  key={`preset-${idx}`}
                  onClick={() => setSelectedScript(RECORDING_SCRIPT_PRESETS[idx])}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold shrink-0 transition ${
                    selectedScript === RECORDING_SCRIPT_PRESETS[idx]
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <p className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 leading-relaxed bg-white/90 dark:bg-slate-900/90 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/40 shadow-xs">
              "{selectedScript}"
            </p>
          </div>

          {/* 2. 대형 녹음 버튼 & 실시간 음성 주파수 게이지 */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="relative flex items-center justify-center">
              {/* 펄스 링 */}
              {isRecording && (
                <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping" />
              )}
              
              <button
                onClick={isRecording ? handleStopRecord : handleStartRecord}
                className={`w-20 h-20 rounded-full flex flex-col items-center justify-center text-white font-bold transition-all active:scale-95 shadow-xl relative z-10 ${
                  isRecording
                    ? 'bg-rose-500 ring-8 ring-rose-500/30 animate-pulse'
                    : 'bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 hover:brightness-110 shadow-indigo-500/30'
                }`}
              >
                {isRecording ? (
                  <>
                    <Square className="w-6 h-6" />
                    <span className="text-[10px] mt-1 font-extrabold">{recordSeconds}초 (완료)</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-7 h-7" />
                    <span className="text-[10px] mt-0.5 font-extrabold">3초 녹음 시작</span>
                  </>
                )}
              </button>
            </div>

            {/* 녹음 중 실시간 음향 주파수 & 볼륨 분석 피드백 */}
            {isRecording && (
              <div className="mt-3 flex flex-col items-center gap-1 w-52 bg-slate-100 dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between w-full text-[11px] font-bold">
                  <span className="text-rose-500 flex items-center gap-1">
                    <Radio className="w-3 h-3 animate-pulse" />
                    음색 주파수 감지 중:
                  </span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-mono">
                    {currentLivePitch ? `${currentLivePitch} Hz` : '감지 중...'}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden mt-0.5">
                  <div 
                    className="bg-gradient-to-r from-indigo-500 to-rose-500 h-full transition-all duration-75"
                    style={{ width: `${Math.min(100, volumeLevel * 2)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. 등록된 목소리 상태 & 다국어 미리듣기 */}
          {profile ? (
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                      내 목소리 지문 분석 완료
                    </span>
                  </div>
                  {profile.biometrics && (
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mt-0.5 flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      {profile.biometrics.pitchHz} Hz · {getCategoryLabel(profile.biometrics.pitchCategory)}
                    </span>
                  )}
                </div>

                <button
                  onClick={handleDeleteProfile}
                  className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-semibold flex items-center gap-1"
                  title="삭제 및 재녹음"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>재녹음</span>
                </button>
              </div>

              {/* 다국어 내 목소리 미리듣기 버튼 3종 */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 block mb-2 flex items-center gap-1">
                  <Headphones className="w-3 h-3 text-indigo-500" />
                  내 음색이 적용된 외국어 샘플 듣기:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {SAMPLES.map((sample) => (
                    <button
                      key={sample.lang}
                      onClick={() => handlePlaySample(sample)}
                      disabled={isPlayingSample !== null}
                      className={`p-2 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition active:scale-95 ${
                        isPlayingSample === sample.lang
                          ? 'bg-indigo-600 text-white border-indigo-600 animate-pulse'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                      }`}
                    >
                      <span className="text-base">{sample.flag}</span>
                      <span className="text-[11px] truncate">{sample.name}</span>
                      {isPlayingSample === sample.lang ? (
                        <Volume2 className="w-3.5 h-3.5 text-white animate-bounce mt-0.5" />
                      ) : (
                        <Play className="w-3 h-3 text-slate-400 mt-0.5" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* 내 목소리 통역 활성화 토글 */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-200/50 dark:border-slate-700/50">
                <div>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">
                    실시간 1:1 대화 시 내 목소리 적용
                  </span>
                  <span className="text-[10px] text-slate-400">
                    번역된 외국어가 내 목소리 톤으로 출력됩니다.
                  </span>
                </div>
                <button
                  onClick={() => onToggleVoiceClone(!isVoiceCloneEnabled)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${
                    isVoiceCloneEnabled ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      isVoiceCloneEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                위 [3초 녹음 시작] 버튼을 누르고 표준 낭독문을 읽으시면 내 목소리 생체 지문이 즉시 생성됩니다.
              </p>
            </div>
          )}

        </div>

        {/* 저장 성공 토스트 */}
        {saveSuccessToast && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-1.5 rounded-full text-xs font-extrabold shadow-xl flex items-center gap-1.5 animate-fade-in border border-slate-700 z-50">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>내 목소리 지문이 안전하게 학습 및 저장되었습니다!</span>
          </div>
        )}

      </div>
    </div>
  );
};
