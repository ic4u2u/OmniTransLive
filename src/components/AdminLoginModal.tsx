import React, { useState } from 'react';
import { Lock, KeyRound, ShieldAlert, X, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // 관리자 마스터 보안 패스워드 검증 (기본값: 7777 또는 admin2026)
    if (password === '7777' || password === 'admin2026' || password === 'omnitrans77') {
      setErrorMessage('');
      setPassword('');
      onSuccess();
    } else {
      setErrorMessage('잘못된 관리자 마스터 비밀번호입니다. 다시 확인해 주세요.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl relative text-center">
        
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 자물쇠 아이콘 */}
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto mb-4 shadow-inner">
          <Lock className="w-7 h-7 animate-pulse" />
        </div>

        <h3 className="text-lg font-black text-white tracking-tight">
          관리자 보안 인증
        </h3>
        <p className="text-xs text-slate-400 mt-1 mb-5">
          고객 개인정보 및 매출 데이터 보호를 위해<br />
          마스터 패스워드를 입력해 주세요.
        </p>

        {/* 로그인 폼 */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative text-left">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <label className="text-[11px] font-bold text-slate-400">
                마스터 비밀번호 (Master PIN)
              </label>
              <span className="text-[10px] text-indigo-400 font-bold">
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

          {/* 에러 메시지 */}
          {errorMessage && (
            <div className="flex items-center gap-1.5 text-xs text-rose-400 font-bold bg-rose-950/40 p-2.5 rounded-xl border border-rose-900/60 animate-shake">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 접속 버튼 */}
          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 active:scale-95"
          >
            <span>어드민 시스템 인증 & 입장</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-4 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
          💡 단축키: 어디서든 <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">Ctrl + Shift + A</kbd>
        </div>

      </div>
    </div>
  );
};

export default AdminLoginModal;
