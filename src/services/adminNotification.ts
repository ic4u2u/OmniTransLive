/**
 * OmniTrans LIVE 관리자 모바일 실시간 알림 서비스
 * 결제 발생, 신규 고객 가입, 무료 체험 소진 시 대표님 텔레그램으로 즉시 푸시 알림 전송
 */

export interface AdminNotifyPayload {
  type: 'PAYMENT' | 'FREE_EXPIRED' | 'NEW_USER' | 'ERROR';
  customerName: string;
  customerEmail?: string;
  country?: string;
  plan?: string;
  amount?: number;
  currency?: string;
  pgProvider?: string;
  message?: string;
}

// 브라우저 로컬 저장된 대표님 텔레그램 봇 설정 또는 기본값
export function getTelegramConfig() {
  if (typeof window !== 'undefined') {
    const savedToken = localStorage.getItem('omnitrans_tg_bot_token');
    const savedChatId = localStorage.getItem('omnitrans_tg_chat_id');
    if (savedToken && savedChatId) {
      return { botToken: savedToken, chatId: savedChatId };
    }
  }
  return {
    botToken: '',
    chatId: '',
  };
}

export async function sendAdminNotification(payload: AdminNotifyPayload): Promise<boolean> {
  const { botToken, chatId } = getTelegramConfig();

  // 포맷팅된 메시지 생성
  let text = '';
  const now = new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });

  switch (payload.type) {
    case 'PAYMENT':
      text = `👑 <b>[OmniTrans LIVE] 실시간 유료 결제 승인!</b>\n\n` +
        `👤 <b>고객명:</b> ${payload.customerName}\n` +
        `🌍 <b>국가:</b> ${payload.country || '글로벌'}\n` +
        `💎 <b>플랜:</b> ${payload.plan?.toUpperCase()}\n` +
        `💰 <b>금액:</b> $${payload.amount?.toFixed(2)} ${payload.currency || 'USD'}\n` +
        `💳 <b>PG사:</b> ${payload.pgProvider || 'Global PG'}\n` +
        `⏱️ <b>일시:</b> ${now}\n\n` +
        `📊 <i>어드민 콘솔에서 회원 상태를 확인하세요.</i>`;
      break;

    case 'FREE_EXPIRED':
      text = `⏳ <b>[OmniTrans LIVE] 10분 무료 체험 소진</b>\n\n` +
        `👤 <b>고객:</b> ${payload.customerName}\n` +
        `🌍 <b>국가:</b> ${payload.country || '글로벌'}\n` +
        `⏱️ <b>일시:</b> ${now}\n` +
        `💡 <i>현재 요금제 결제 페이지 체류 중</i>`;
      break;

    case 'NEW_USER':
      text = `🎉 <b>[OmniTrans LIVE] 신규 고객 1:1 통역 시작</b>\n\n` +
        `👤 <b>고객:</b> ${payload.customerName}\n` +
        `🌍 <b>국가:</b> ${payload.country || '글로벌'}\n` +
        `⏱️ <b>일시:</b> ${now}`;
      break;

    default:
      text = `🔔 <b>[OmniTrans LIVE 알림]</b>\n${payload.message || ''}\n⏱️ ${now}`;
  }

  // 텔레그램 설정이 되어 있는 경우 실제 Telegram Bot API 호출
  if (botToken && chatId) {
    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
        }),
      });
      return true;
    } catch (e) {
      console.warn('Telegram notification dispatch notice:', e);
    }
  }

  // 콘솔 및 시뮬레이션 로그 기록
  console.log('[Admin Notification Dispatched]:', text);
  return true;
}
