import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { OneToOneTranslator } from './components/OneToOneTranslator';
import { PricingSection } from './components/PricingSection';
import { CustomDatasetModal } from './components/CustomDatasetModal';
import { QRCodeModal } from './components/QRCodeModal';
import { CheckoutModal } from './components/CheckoutModal';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLoginModal } from './components/AdminLoginModal';
import { RoomSyncService } from './services/roomSync';
import { speakText } from './services/translatorEngine';
import { sendAdminNotification } from './services/adminNotification';
import { getUIText, type UILanguage } from './i18n/translations';
import type { SessionMode, TranslationMessage, UserAccount, PlanType } from './types/translator';

// 고유 룸 ID 생성 유틸
function generateRoomId(): string {
  return 'room_' + Math.random().toString(36).substring(2, 8);
}

export const App: React.FC = () => {
  // 라이트 / 다크 테마 상태 관리
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('omnitrans_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('omnitrans_theme', theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // 앱 전체 UI 언어 상태
  const [uiLang, setUiLang] = useState<UILanguage>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('omnitrans_ui_lang');
      if (saved) {
        return saved as UILanguage;
      }
    }
    return 'ko';
  });

  const t = getUIText(uiLang);

  const handleUILangChange = (newLang: UILanguage) => {
    setUiLang(newLang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('omnitrans_ui_lang', newLang);
    }
  };

  // URL 파라미터에서 방 번호 및 역할(게스트/호스트) 확인
  const [roomId, setRoomId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('room') || generateRoomId();
    }
    return generateRoomId();
  });

  const [isGuestMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('role') === 'guest';
    }
    return false;
  });

  // 모드 상태: 1:1 대화 / 1:다수 회의 / 요금제
  const [currentMode, setCurrentMode] = useState<SessionMode>('1to1');

  // 보이스 On/Off 토글
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);

  // 1:1 대화 기록
  const [messages, setMessages] = useState<TranslationMessage[]>([]);

  // 상대방 접속 여부
  const [isPeerConnected, setIsPeerConnected] = useState<boolean>(false);

  // 모달 상태
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isDatasetModalOpen, setIsDatasetModalOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<PlanType | null>(null);
  const [checkoutIsYearly, setCheckoutIsYearly] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 관리자 인증 및 로그인 모달 상태
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('omnitrans_admin_auth') === 'true';
    }
    return false;
  });
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState<boolean>(false);

  // 관리자 단축키 (Ctrl + Shift + A) 및 URL 파라미터 감지
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
        e.preventDefault();
        if (isAdminAuthenticated) {
          setCurrentMode('admin');
        } else {
          setIsAdminLoginModalOpen(true);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdminAuthenticated]);

  // 사용자 계정 및 요금제 상태 (기본 10분 무료 체험 제공)
  const [userAccount, setUserAccount] = useState<UserAccount>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('omnitrans_user_account');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
    }
    return {
      currentPlan: 'free',
      remainingMinutes: 10,
      usedMinutes: 0,
      voiceEnabled: true,
      datasets: [
        {
          id: 'ds_default',
          name: '글로벌 비즈니스 & 여행 기본 사전',
          description: '자주 쓰이는 인사말, 예약, 안내 표현 최적화',
          termsCount: 150,
          createdAt: '2026-08-30',
          active: true,
        },
      ],
    };
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('omnitrans_user_account', JSON.stringify(userAccount));
    }
  }, [userAccount]);

  const roomSyncRef = useRef<RoomSyncService | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 실시간 룸 동기화 연결
  useEffect(() => {
    const role = isGuestMode ? 'guest' : 'host';

    const syncService = new RoomSyncService(
      roomId,
      role,
      (remoteMsg: TranslationMessage) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === remoteMsg.id)) return prev;
          return [...prev, remoteMsg];
        });

        if (voiceEnabled) {
          speakText(remoteMsg.translatedText, remoteMsg.targetLang);
        }
      },
      (connected: boolean) => {
        setIsPeerConnected(connected);
        if (connected) {
          showToast(
            role === 'host'
              ? '📱 상대방이 QR을 통해 대화방에 연결되었습니다!'
              : '🟢 호스트와 실시간 연결되었습니다.'
          );
        }
      },
      () => {
        setMessages([]);
      }
    );

    roomSyncRef.current = syncService;

    return () => {
      syncService.destroy();
    };
  }, [roomId, isGuestMode, voiceEnabled]);

  // 메시지 추가 및 룸에 브로드캐스트
  const handleAddMessage = (msg: TranslationMessage) => {
    setMessages((prev) => [...prev, msg]);
    roomSyncRef.current?.sendMessage(msg);
  };

  // 대화 초기화
  const handleClearMessages = () => {
    setMessages([]);
    roomSyncRef.current?.sendClear();
    showToast(t.clearConfirm);
  };

  // 새로운 대화방 생성
  const handleRegenerateRoom = () => {
    const newId = generateRoomId();
    setRoomId(newId);
    setMessages([]);
    setIsPeerConnected(false);
    showToast('새로운 대화방 코드가 발급되었습니다.');
  };

  // 통역 1분 사용 차감 (시뮬레이션)
  const handleDeductMinute = () => {
    if (userAccount.currentPlan === 'premium') return;

    setUserAccount((prev) => ({
      ...prev,
      remainingMinutes: Math.max(0, prev.remainingMinutes - 1),
      usedMinutes: prev.usedMinutes + 1,
    }));
  };

  // 결제 모달 열기
  const handleOpenCheckout = (plan: PlanType, isYearly: boolean) => {
    setCheckoutPlan(plan);
    setCheckoutIsYearly(isYearly);
  };

  // 결제 성공 시 플랜 및 시간 즉시 충전 & 대표님 텔레그램 실시간 알림 발송
  const handlePaymentSuccess = (plan: PlanType) => {
    const minutes = plan === 'premium' ? 999999 : plan === 'standard' ? 500 : 100;
    const amount = plan === 'premium' ? (checkoutIsYearly ? 959.88 : 99.99) : plan === 'standard' ? (checkoutIsYearly ? 287.88 : 29.99) : (checkoutIsYearly ? 95.88 : 9.99);

    setUserAccount((prev) => ({
      ...prev,
      currentPlan: plan,
      remainingMinutes: minutes,
    }));
    showToast(t.paymentSuccessToast);

    // 대표님 텔레그램으로 결제 승인 알림 즉시 발송
    sendAdminNotification({
      type: 'PAYMENT',
      customerName: '글로벌 고객 (웹 결제)',
      plan,
      amount,
      currency: 'USD',
      pgProvider: 'Global PG',
    });
  };

  // 데이터셋 토글
  const handleToggleDataset = (id: string) => {
    setUserAccount((prev) => ({
      ...prev,
      datasets: prev.datasets.map((d) =>
        d.id === id ? { ...d, active: !d.active } : d
      ),
    }));
  };

  // 데이터셋 추가
  const handleAddDataset = (name: string, description: string) => {
    const newDs = {
      id: 'ds_' + Date.now(),
      name,
      description,
      termsCount: 25,
      createdAt: new Date().toISOString().slice(0, 10),
      active: true,
    };
    setUserAccount((prev) => ({
      ...prev,
      datasets: [...prev.datasets, newDs],
    }));
    showToast(`'${name}' 데이터셋이 등록되었습니다.`);
  };

  // 데이터셋 삭제
  const handleDeleteDataset = (id: string) => {
    setUserAccount((prev) => ({
      ...prev,
      datasets: prev.datasets.filter((d) => d.id !== id),
    }));
  };

  const customTerms: Record<string, string> = {};

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors selection:bg-indigo-500 selection:text-white relative">
      
      {/* 배경 장식 글로우 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-tr from-indigo-500/10 via-cyan-500/10 to-transparent blur-3xl rounded-full" />
      </div>

      {/* 헤더 */}
      <Header
        currentMode={currentMode}
        onModeChange={setCurrentMode}
        voiceEnabled={voiceEnabled}
        onVoiceToggle={() => setVoiceEnabled(!voiceEnabled)}
        userAccount={userAccount}
        onOpenDatasets={() => setIsDatasetModalOpen(true)}
        onOpenQRModal={() => setIsQRModalOpen(true)}
        isPeerConnected={isPeerConnected}
        isGuestMode={isGuestMode}
        uiLang={uiLang}
        onUILangChange={handleUILangChange}
        t={t}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenAdminLogin={() => {
          if (isAdminAuthenticated) {
            setCurrentMode('admin');
          } else {
            setIsAdminLoginModalOpen(true);
          }
        }}
      />

      {/* 토스트 알림 */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-4 py-2.5 rounded-2xl shadow-xl text-xs font-bold animate-fade-in flex items-center gap-2 border border-slate-700">
          <span>🔔</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 메인 뷰 컨테이너 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-3 sm:py-6 flex flex-col relative z-10">
        {currentMode === '1to1' && (
          <OneToOneTranslator
            messages={messages}
            onAddMessage={handleAddMessage}
            onClearMessages={handleClearMessages}
            voiceEnabled={voiceEnabled}
            canDownload={userAccount.currentPlan !== 'lite'}
            onUpgradePrompt={() => {
              showToast('대화 기록 다운로드는 Standard 플랜부터 지원됩니다.');
              setCurrentMode('pricing');
            }}
            customTerms={customTerms}
            onDeductMinute={handleDeductMinute}
            onOpenQRModal={() => setIsQRModalOpen(true)}
            isPeerConnected={isPeerConnected}
            isGuestMode={isGuestMode}
            t={t}
          />
        )}

        {currentMode === 'pricing' && (
          <PricingSection
            userAccount={userAccount}
            onOpenCheckout={handleOpenCheckout}
            onBackToChat={() => setCurrentMode('1to1')}
            onSelectFreeTrial={() => {
              setUserAccount((prev) => ({
                ...prev,
                currentPlan: 'free',
                remainingMinutes: Math.max(prev.remainingMinutes, 10),
              }));
              showToast('🎁 10분 무료 체험이 적용되었습니다! 1:1 통역을 시작하세요.');
              setCurrentMode('1to1');
            }}
            t={t}
          />
        )}

        {currentMode === 'admin' && (
          <AdminDashboard
            onBackToService={() => setCurrentMode('1to1')}
            onLogout={() => {
              setIsAdminAuthenticated(false);
              sessionStorage.removeItem('omnitrans_admin_auth');
              setCurrentMode('1to1');
              showToast('🔒 관리자 로그아웃이 완료되었습니다.');
            }}
            showToast={showToast}
          />
        )}
      </main>

      {/* 국가별 맞춤 PG 결제 모달 */}
      <CheckoutModal
        isOpen={checkoutPlan !== null}
        onClose={() => setCheckoutPlan(null)}
        planId={checkoutPlan}
        isYearly={checkoutIsYearly}
        uiLang={uiLang}
        t={t}
        onSuccess={handlePaymentSuccess}
      />

      {/* QR 코드 상대방 모바일 연결 모달 */}
      <QRCodeModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        roomId={roomId}
        isPeerConnected={isPeerConnected}
        onRegenerateRoom={handleRegenerateRoom}
        t={t}
      />

      {/* 커스텀 데이터셋 모달 */}
      <CustomDatasetModal
        isOpen={isDatasetModalOpen}
        onClose={() => setIsDatasetModalOpen(false)}
        userAccount={userAccount}
        onToggleDataset={handleToggleDataset}
        onAddDataset={handleAddDataset}
        onDeleteDataset={handleDeleteDataset}
        onUpgradeClick={() => setCurrentMode('pricing')}
        t={t}
      />

      {/* 🔐 관리자 마스터 보안 로그인 모달 */}
      <AdminLoginModal
        isOpen={isAdminLoginModalOpen}
        onClose={() => setIsAdminLoginModalOpen(false)}
        onSuccess={() => {
          setIsAdminAuthenticated(true);
          sessionStorage.setItem('omnitrans_admin_auth', 'true');
          setIsAdminLoginModalOpen(false);
          setCurrentMode('admin');
          showToast('🛡️ 관리자 보안 인증이 완료되었습니다. ADMIN CRM에 오신 것을 환영합니다.');
        }}
      />

    </div>
  );
};

export default App;
