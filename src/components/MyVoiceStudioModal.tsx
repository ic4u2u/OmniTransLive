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
  Server, 
  Radio, 
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { 
  voiceCloneService, 
  STANDARD_RECORDING_SCRIPT, 
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
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [isPlayingSample, setIsPlayingSample] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'studio' | 'server'>('studio');
  const [backendUrlInput, setBackendUrlInput] = useState('');
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);

  const timerRef = useRef<number | null>(null);

  // 저장된 프로필 로드
  useEffect(() => {
    if (isOpen) {
      voiceCloneService.getSavedProfile().then((p) => {
        setProfile(p);
      });
      setBackendUrlInput(voiceCloneService.getBackendUrl());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 녹음 시작
  const handleStartRecord = async () => {
    setIsRecording(true);
    setRecordSeconds(0);

    const started = await voiceCloneService.startRecording((vol) => {
      setVolumeLevel(vol);
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
      const newProfile = await voiceCloneService.saveProfile(audioBlob, STANDARD_RECORDING_SCRIPT);
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

  // 백엔드 URL 저장
  const handleSaveBackendUrl = () => {
    voiceCloneService.setBackendUrl(backendUrlInput);
    setSaveSuccessToast(true);
    setTimeout(() => setSaveSuccessToast(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] overflow-hidden relative">
        
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 상단 타이틀 & 탭 */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>내 목소리 보이스 클론 스튜디오</span>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 uppercase">
                Qwen AI
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              3초만 녹음하면 전 세계 외국어를 내 목소리 톤 그대로 말합니다.
            </p>
          </div>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-4">
          <button
            onClick={() => setActiveTab('studio')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'studio'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Mic className="w-3.5 h-3.5" />
            <span>3초 목소리 등록 & 테스트</span>
          </button>
          <button
            onClick={() => setActiveTab('server')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 ${
              activeTab === 'server'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>무료 Colab 연동 설정</span>
          </button>
        </div>

        {/* 메인 콘텐츠 스크롤 영역 */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          
          {activeTab === 'studio' && (
            <>
              {/* 1. 표준 낭독 문장 카드 */}
              <div className="bg-gradient-to-br from-indigo-50/80 via-purple-50/40 to-slate-50 dark:from-indigo-950/40 dark:via-purple-950/20 dark:to-slate-900 rounded-2xl p-3.5 border border-indigo-200/80 dark:border-indigo-900/60 relative">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    AI 음향 분석 최적화 표준 낭독문
                  </span>
                  <span className="text-[10px] text-slate-400">약 3~4초 분량</span>
                </div>
                <p className="text-xs sm:text-sm font-black text-slate-800 dark:text-slate-100 leading-relaxed bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40 shadow-xs">
                  "{STANDARD_RECORDING_SCRIPT}"
                </p>
              </div>

              {/* 2. 대형 녹음 버튼 & 사운드 파형 */}
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
                        <span className="text-[10px] mt-0.5 font-extrabold">녹음 시작</span>
                      </>
                    )}
                  </button>
                </div>

                {/* 녹음 중 실시간 음량 게이지 */}
                {isRecording && (
                  <div className="mt-3 flex items-center gap-1.5 w-48 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                    <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                    <div className="flex-1 bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-indigo-500 to-rose-500 h-full transition-all duration-75"
                        style={{ width: `${Math.min(100, volumeLevel * 2)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-500">{recordSeconds}s</span>
                  </div>
                )}
              </div>

              {/* 3. 등록된 목소리 상태 & 다국어 미리듣기 */}
              {profile ? (
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        내 목소리 지문 등록 완료 ({new Date(profile.createdAt).toLocaleDateString()})
                      </span>
                    </div>

                    <button
                      onClick={handleDeleteProfile}
                      className="p-1 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-semibold flex items-center gap-1"
                      title="삭제"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>재녹음</span>
                    </button>
                  </div>

                  {/* 다국어 내 목소리 미리듣기 버튼 3종 */}
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 block mb-2">
                      🌐 내 목소리로 외국어 미리듣기:
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
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      실시간 1:1 대화 시 내 목소리 적용
                    </span>
                    <button
                      onClick={() => onToggleVoiceClone(!isVoiceCloneEnabled)}
                      className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
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
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    위 녹음 버튼을 눌러 표준 낭독문을 읽으시면 내 목소리 프로필이 생성됩니다.
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === 'server' && (
            <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="bg-indigo-50/70 dark:bg-indigo-950/40 p-3.5 rounded-2xl border border-indigo-200/80 dark:border-indigo-800">
                <h4 className="font-extrabold text-indigo-700 dark:text-indigo-300 mb-1 flex items-center gap-1.5">
                  <Server className="w-4 h-4" />
                  무료 Google Colab T4 GPU 연동 가이드
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed mb-2.5">
                  Google Colab에서 무료 T4 GPU로 Qwen-TTS 백엔드를 구동하여 비용 0원으로 무제한 초고음질 제로샷 클로닝을 사용할 수 있습니다.
                </p>
                <a
                  href="/server_qwen_tts.py"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-[11px] hover:bg-indigo-700 transition shadow-xs"
                >
                  <span>파이썬 서버 코드 다운로드</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Colab URL 등록 인풋 */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 block">
                  Colab / 로컬 서버 ngrok 엔드포인트 URL
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={backendUrlInput}
                    onChange={(e) => setBackendUrlInput(e.target.value)}
                    placeholder="https://xxxx.ngrok-free.app 또는 http://localhost:8000"
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <button
                    onClick={handleSaveBackendUrl}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-xs shrink-0"
                  >
                    연결 저장
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  * URL을 입력하지 않아도 브라우저 내장 스마트 DSP 엔진으로 즉시 무료 체험 가능합니다.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* 저장 성공 토스트 */}
        {saveSuccessToast && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-1.5 rounded-full text-xs font-extrabold shadow-xl flex items-center gap-1.5 animate-fade-in border border-slate-700 z-50">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            <span>내 목소리 프로필이 안전하게 저장되었습니다!</span>
          </div>
        )}

      </div>
    </div>
  );
};
