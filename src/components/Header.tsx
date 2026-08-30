import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Globe, Sparkles, Database, Layers, QrCode, Check, ChevronDown, Sun, Moon, Lock } from 'lucide-react';
import type { SessionMode, UserAccount } from '../types/translator';
import { UI_LANGUAGE_OPTIONS, type UILanguage, type UIStringDictionary } from '../i18n/translations';

interface HeaderProps {
  currentMode: SessionMode;
  onModeChange: (mode: SessionMode) => void;
  voiceEnabled: boolean;
  onVoiceToggle: () => void;
  userAccount: UserAccount;
  onOpenDatasets: () => void;
  onOpenQRModal: () => void;
  isPeerConnected: boolean;
  isGuestMode: boolean;
  uiLang: UILanguage;
  onUILangChange: (lang: UILanguage) => void;
  t: UIStringDictionary;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenAdminLogin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onModeChange,
  voiceEnabled,
  onVoiceToggle,
  userAccount,
  onOpenDatasets,
  onOpenQRModal,
  isPeerConnected,
  isGuestMode,
  uiLang,
  onUILangChange,
  t,
  theme,
  onToggleTheme,
  onOpenAdminLogin,
}) => {
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLangObj = UI_LANGUAGE_OPTIONS.find((l) => l.code === uiLang) || UI_LANGUAGE_OPTIONS[0];

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPlanBadge = () => {
    switch (userAccount.currentPlan) {
      case 'premium':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">👑 Premium</span>;
      case 'standard':
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">⚡ Standard</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">🌱 Lite</span>;
    }
  };

  return (
    <header className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
        
        {/* 서비스 로고 & 게스트 상태 배지 */}
        <div 
          onClick={() => onModeChange('1to1')}
          className="flex items-center gap-2 cursor-pointer select-none group shrink-0"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Globe className="w-4 h-4 sm:w-5 sm:h-5 animate-spin-slow" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-base sm:text-lg tracking-tight bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">
                {t.appTitle}
              </span>
              <span className="text-[9px] uppercase font-extrabold tracking-wider px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800">
                {t.liveTag}
              </span>
              {isGuestMode && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 border border-emerald-500/30">
                  {t.guestModeBadge}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 데스크탑 메인 모드 선택 탭 (1:1 통역 / 요금제) */}
        <nav className="hidden md:flex items-center p-1 bg-slate-100 dark:bg-slate-800/70 rounded-full border border-slate-200/60 dark:border-slate-700/60">
          <button
            onClick={() => onModeChange('1to1')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all flex items-center gap-1.5 ${
              currentMode === '1to1'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {t.tab1to1}
          </button>

          <button
            onClick={() => onModeChange('pricing')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all flex items-center gap-1.5 ${
              currentMode === 'pricing'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            {t.tabPricing}
          </button>
        </nav>

        {/* 우측 컨트롤 영역 */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          
          {/* 🔥 컴팩트 언어 선택기 (Custom Dropdown) */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-black text-xs transition-all active:scale-95 group"
              title="화면 전체 언어 변경 / Change Language"
            >
              <span className="text-base">{currentLangObj.flag}</span>
              <span className="hidden sm:inline bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent font-black">
                {currentLangObj.name}
              </span>
              <ChevronDown
                className={`w-3 h-3 text-slate-400 group-hover:text-indigo-500 transition-transform duration-200 ${
                  isLangDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* 커스텀 언어 팝오버 메뉴 */}
            {isLangDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-2 z-50 animate-fade-in backdrop-blur-xl">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span>Language / 언어 선택</span>
                  <Globe className="w-3.5 h-3.5 text-indigo-500" />
                </div>

                <div className="max-h-72 overflow-y-auto py-1 divide-y divide-slate-100 dark:divide-slate-800">
                  {['동아시아', '동남아/남아시아', '유럽', '중동/기타'].map((cat) => (
                    <div key={`drop-cat-${cat}`} className="py-1">
                      <div className="px-3 py-0.5 text-[9px] font-extrabold text-indigo-500/80 uppercase tracking-wider bg-slate-50/70 dark:bg-slate-800/40">
                        {cat}
                      </div>
                      {UI_LANGUAGE_OPTIONS.filter((opt) => opt.category === cat).map((opt) => {
                        const isSelected = opt.code === uiLang;

                        return (
                          <button
                            key={opt.code}
                            onClick={() => {
                              onUILangChange(opt.code);
                              setIsLangDropdownOpen(false);
                            }}
                            className={`w-full px-3 py-1.5 text-left text-xs font-bold flex items-center justify-between transition-colors ${
                              isSelected
                                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-extrabold'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="text-base">{opt.flag}</span>
                              <span className="truncate">{opt.name}</span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* QR 코드 상대방 초대 버튼 */}
          <button
            onClick={onOpenQRModal}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm shrink-0 ${
              isPeerConnected
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-800'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
            }`}
            title={t.qrInvite}
          >
            <QrCode className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isPeerConnected ? t.qrConnected : t.qrInvite}
            </span>
          </button>

          {/* 보이스 음성 읽기 온/오프 토글 */}
          <button
            onClick={onVoiceToggle}
            title={voiceEnabled ? t.voiceOn : t.voiceOff}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-full text-xs font-semibold border transition-all shrink-0 ${
              voiceEnabled
                ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
            }`}
          >
            {voiceEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>

          {/* ☀️ / 🌙 라이트 & 다크 모드 토글 */}
          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? t.themeLight : t.themeDark}
            className="p-1.5 sm:p-2 rounded-full text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 transition-all active:scale-95 shrink-0"
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-indigo-600" />
            )}
          </button>

          {/* 커스텀 데이터셋 버튼 (태블릿 이상) */}
          <button
            onClick={onOpenDatasets}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition shrink-0"
            title="고유명사/전문용어 커스텀 사전 관리"
          >
            <Database className="w-3.5 h-3.5 text-slate-500" />
            <span>{t.datasets}</span>
          </button>

          {/* 🔐 관리자 전용 버튼 */}
          <button
            onClick={onOpenAdminLogin}
            title="관리자 보안 CRM"
            className="p-1.5 rounded-full text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition shrink-0"
          >
            <Lock className="w-3 h-3" />
          </button>

          {/* 플랜 배지 (클릭 시 요금제 이동) */}
          <div 
            onClick={() => onModeChange('pricing')}
            className="cursor-pointer flex items-center shrink-0"
          >
            {getPlanBadge()}
          </div>

        </div>

      </div>
    </header>
  );
};
