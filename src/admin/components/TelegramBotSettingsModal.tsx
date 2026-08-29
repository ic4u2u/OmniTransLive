import React, { useState, useEffect } from 'react';
import { Send, Key, MessageSquare, Check, X, Sparkles, HelpCircle } from 'lucide-react';
import { getTelegramConfig, sendAdminNotification } from '../../services/adminNotification';

interface TelegramBotSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export const TelegramBotSettingsModal: React.FC<TelegramBotSettingsModalProps> = ({
  isOpen,
  onClose,
  showToast,
}) => {
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const cfg = getTelegramConfig();
      setBotToken(cfg.botToken || '');
      setChatId(cfg.chatId || '');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('omnitrans_tg_bot_token', botToken.trim());
      localStorage.setItem('omnitrans_tg_chat_id', chatId.trim());
    }
    setIsSaved(true);
    showToast('💾 텔레그램 봇 설정이 저장되었습니다.');
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleSendTestMessage = async () => {
    if (!botToken || !chatId) {
      showToast('⚠️ 먼저 Bot Token과 Chat ID를 입력하고 저장해 주세요.');
      return;
    }

    setIsSendingTest(true);
    try {
      const success = await sendAdminNotification({
        type: 'PAYMENT',
        customerName: '홍길동 (테스트 고객)',
        country: '대한민국 🇰🇷',
        plan: 'premium',
        amount: 99.99,
        currency: 'USD',
        pgProvider: 'Toss Payments',
      });

      if (success) {
        showToast('📲 대표님 텔레그램으로 테스트 결제 알림이 전송되었습니다!');
      } else {
        showToast('❌ 전송 실패: Bot Token이나 Chat ID를 확인해 주세요.');
      }
    } catch (e) {
      showToast('❌ 오류가 발생했습니다.');
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative text-slate-200">
        
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Send className="w-6 h-6 -translate-x-0.5 translate-y-0.5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">
              대표님 전용 모바일 텔레그램 알림 봇 연동
            </h3>
            <p className="text-xs text-slate-400">
              결제, 10분 무료 소진, 고객 문의를 실시간으로 받아보세요.
            </p>
          </div>
        </div>

        {/* 설정 폼 */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
              <Key className="w-3.5 h-3.5 text-blue-400" />
              <span>텔레그램 Bot Token</span>
            </label>
            <input
              type="text"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="예: 7123456789:AAHk..."
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 focus:border-blue-500 text-xs font-mono text-white placeholder-slate-600 focus:outline-none transition"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 mb-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
              <span>대표님 텔레그램 Chat ID (채널 또는 개인 ID)</span>
            </label>
            <input
              type="text"
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="예: 123456789 또는 @mychannel"
              className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-950 border border-slate-800 focus:border-blue-500 text-xs font-mono text-white placeholder-slate-600 focus:outline-none transition"
            />
          </div>

          {/* 저장 및 테스트 발송 버튼 */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow-md shadow-blue-600/30 transition flex items-center justify-center gap-1.5 active:scale-95"
            >
              {isSaved ? <Check className="w-4 h-4" /> : null}
              <span>{isSaved ? '저장 완료!' : '설정 저장하기'}</span>
            </button>

            <button
              type="button"
              onClick={handleSendTestMessage}
              disabled={isSendingTest}
              className="px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-extrabold border border-slate-700 transition flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>{isSendingTest ? '발송 중...' : '테스트 알림 발송'}</span>
            </button>
          </div>
        </form>

        {/* 1분 텔레그램 봇 생성 안내 팁 */}
        <div className="mt-5 p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-[11px] text-slate-400 space-y-2">
          <div className="font-bold text-slate-200 flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5 text-blue-400" />
            <span>텔레그램 봇 1분 생성 방법:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1 leading-relaxed">
            <li>텔레그램 검색창에서 <strong className="text-white">@BotFather</strong> 검색 후 대화 시작</li>
            <li><code className="text-blue-300 bg-slate-900 px-1 py-0.5 rounded">/newbot</code> 입력 후 봇 이름 및 아이디 생성</li>
            <li>발급받은 <strong>HTTP API Token</strong>을 위 Bot Token 란에 복사 붙여넣기</li>
            <li>내 봇에 <code className="text-blue-300 bg-slate-900 px-1 py-0.5 rounded">/start</code>를 누르고 Chat ID를 입력하면 완료!</li>
          </ol>
        </div>

      </div>
    </div>
  );
};

export default TelegramBotSettingsModal;
