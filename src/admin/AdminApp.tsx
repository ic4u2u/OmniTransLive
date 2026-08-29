import React, { useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  ShieldAlert,
  ArrowRight,
  Send,
  ExternalLink,
} from 'lucide-react';
import { AdminDashboard } from '../components/AdminDashboard';
import { TelegramBotSettingsModal } from './components/TelegramBotSettingsModal';

export const AdminApp: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('omnitrans_admin_auth') === 'true';
    }
    return false;
  });

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (password === '7777' || password === 'admin2026' || password === 'omnitrans77') {
      setIsAuthenticated(true);
      sessionStorage.setItem('omnitrans_admin_auth', 'true');
      setErrorMessage('');
      setPassword('');
      showToast('🛡️ 관리자 보안 인증이 완료되었습니다. ADMIN CRM에 오신 것을 환영합니다.');
    } else {
      setErrorMessage('잘못된 관리자 마스터 비밀번호입니다. 다시 확인해 주세요.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('omnitrans_admin_auth');
    showToast('🔒 관리자 로그아웃이 완료되었습니다.');
  };

  // 1. 미인증 상태: 독립 관리자 로그인 화면
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 antialiased">
        
        {/* 토스트 알림 */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-bold animate-fade-in flex items-center gap-2 border border-slate-700">
            <span>🔔</span>
            <span>{toastMessage}</span>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-8 shadow-2xl relative text-center">
          
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>

          <div className="inline-block px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-700/60 text-indigo-400 text-xs font-black mb-2">
            OMNITRANS LIVE
          </div>

          <h2 className="text-2xl font-black text-white tracking-tight">
            독립 관리자 CRM 콘솔
          </h2>
          <p className="text-xs text-slate-400 mt-1 mb-6">
            고객 개인정보 및 실시간 매출 관제를 위한 보안 시스템입니다.
          </p>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <div className="flex items-center justify-between mb-1.5 px-1">
                <label className="text-xs font-bold text-slate-300">
                  마스터 보안 비밀번호
                </label>
                <span className="text-[11px] text-indigo-400 font-bold">
                  초기 PIN: 7777
                </span>
              </div>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="마스터 비밀번호 입력..."
                  autoFocus
                  className="w-full pl-10 pr-10 py-3 rounded-2xl bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white font-mono text-sm tracking-wider focus:outline-none placeholder-slate-600 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400 font-bold bg-rose-950/40 p-2.5 rounded-xl border border-rose-900/60 animate-shake">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 active:scale-95"
            >
              <span>어드민 시스템 로그인</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* 고객용 라이브 서비스로 이동 */}
          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <a
              href="/"
              className="text-xs text-slate-400 hover:text-indigo-400 font-bold transition inline-flex items-center gap-1"
            >
              <span>고객용 실시간 통역 서비스 화면으로 이동</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

        </div>
      </div>
    );
  }

  // 2. 인증 완료 상태: 독립 어드민 CRM 대시보드
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col antialiased">
      
      {/* 텔레그램 연동 퀵 바 */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-4 py-2 text-white text-xs font-bold flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <Send className="w-3.5 h-3.5 animate-bounce" />
          <span>📱 모바일 텔레그램 실시간 알림 봇 연동 활성화</span>
        </div>
        <button
          onClick={() => setIsTelegramModalOpen(true)}
          className="px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 text-white text-[11px] font-black transition active:scale-95 flex items-center gap-1"
        >
          <span>봇 토큰 설정 & 테스트 발송</span>
        </button>
      </div>

      {/* 토스트 알림 */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-bold animate-fade-in flex items-center gap-2 border border-slate-700">
          <span>🔔</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 메인 어드민 대시보드 */}
      <AdminDashboard
        onBackToService={() => {
          window.location.href = '/';
        }}
        onLogout={handleLogout}
        showToast={showToast}
      />

      {/* 텔레그램 봇 설정 모달 */}
      <TelegramBotSettingsModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        showToast={showToast}
      />

    </div>
  );
};

export default AdminApp;
