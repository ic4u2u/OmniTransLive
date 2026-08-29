import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, QrCode, Smartphone, RefreshCw } from 'lucide-react';
import type { UIStringDictionary } from '../i18n/translations';

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomId: string;
  isPeerConnected: boolean;
  onRegenerateRoom: () => void;
  t: UIStringDictionary;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({
  isOpen,
  onClose,
  roomId,
  isPeerConnected,
  onRegenerateRoom,
  t,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const joinUrl = `${currentOrigin}?room=${roomId}&role=guest`;

  const handleCopy = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center text-center relative">
        
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 모달 타이틀 */}
        <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 shadow-inner">
          <QrCode className="w-6 h-6" />
        </div>

        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          {t.qrModalTitle}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
          {t.qrModalDesc}
        </p>

        {/* QR 코드 렌더링 카드 */}
        <div className="my-5 p-4 rounded-2xl bg-white shadow-md border border-slate-200/80 flex flex-col items-center justify-center group relative">
          <QRCodeSVG
            value={joinUrl}
            size={180}
            level="M"
            includeMargin={true}
            imageSettings={{
              src: '/favicon.svg',
              x: undefined,
              y: undefined,
              height: 28,
              width: 28,
              excavate: true,
            }}
          />

          {/* 접속 상태 배지 */}
          <div className="mt-3 flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isPeerConnected ? 'bg-emerald-500 animate-ping' : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span>{isPeerConnected ? t.qrPeerConnected : t.qrScanningWait}</span>
          </div>
        </div>

        {/* 링크 복사 및 대화방 코드 */}
        <div className="w-full bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-700 flex items-center justify-between gap-2 mb-4">
          <div className="text-left overflow-hidden">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t.roomInviteLink}</span>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate block max-w-[220px]">
              {joinUrl}
            </span>
          </div>

          <button
            onClick={handleCopy}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shrink-0 shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>{t.linkCopied}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>{t.copyLink}</span>
              </>
            )}
          </button>
        </div>

        {/* 하단 안내 및 새로고침 */}
        <div className="w-full flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-1">
            <Smartphone className="w-3.5 h-3.5" />
            <span>{t.mobileBrowserSupported}</span>
          </div>

          <button
            onClick={onRegenerateRoom}
            className="flex items-center gap-1 text-slate-500 hover:text-indigo-600 transition"
            title={t.changeRoomCode}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{t.changeRoomCode}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
