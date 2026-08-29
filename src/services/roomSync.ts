import type { TranslationMessage } from '../types/translator';

export interface RoomEvent {
  type: 'JOIN' | 'LEAVE' | 'MESSAGE' | 'MIC_STATE' | 'CLEAR';
  roomId: string;
  senderRole: 'host' | 'guest';
  senderName: string;
  payload?: any;
  timestamp: number;
}

export class RoomSyncService {
  private channel: BroadcastChannel | null = null;
  private roomId: string;
  private role: 'host' | 'guest';
  private onMessageCallback?: (msg: TranslationMessage) => void;
  private onStatusCallback?: (connected: boolean, peerRole?: string) => void;
  private onClearCallback?: () => void;
  private heartbeatInterval?: number;

  constructor(
    roomId: string,
    role: 'host' | 'guest',
    onMessage?: (msg: TranslationMessage) => void,
    onStatus?: (connected: boolean, peerRole?: string) => void,
    onClear?: () => void
  ) {
    this.roomId = roomId;
    this.role = role;
    this.onMessageCallback = onMessage;
    this.onStatusCallback = onStatus;
    this.onClearCallback = onClear;

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(`omnitrans_room_${roomId}`);
      this.channel.onmessage = this.handleChannelMessage.bind(this);
    }

    // fallback for window storage events
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageEvent.bind(this));
    }

    // 방 입장 알림 및 주기적 핑
    this.broadcastEvent({
      type: 'JOIN',
      roomId: this.roomId,
      senderRole: this.role,
      senderName: this.role === 'host' ? '호스트' : '게스트',
      timestamp: Date.now(),
    });

    this.startHeartbeat();
  }

  private startHeartbeat() {
    if (typeof window !== 'undefined') {
      this.heartbeatInterval = window.setInterval(() => {
        this.broadcastEvent({
          type: 'JOIN',
          roomId: this.roomId,
          senderRole: this.role,
          senderName: this.role === 'host' ? '호스트' : '게스트',
          timestamp: Date.now(),
        });
      }, 4000);
    }
  }

  private handleChannelMessage(event: MessageEvent<RoomEvent>) {
    const data = event.data;
    if (!data || data.roomId !== this.roomId) return;
    if (data.senderRole === this.role) return; // 본인 메시지는 무시

    this.processEvent(data);
  }

  private handleStorageEvent(event: StorageEvent) {
    if (event.key === `omnitrans_sync_${this.roomId}` && event.newValue) {
      try {
        const data: RoomEvent = JSON.parse(event.newValue);
        if (data.senderRole !== this.role) {
          this.processEvent(data);
        }
      } catch (err) {
        console.error('Storage sync parse error:', err);
      }
    }
  }

  private processEvent(data: RoomEvent) {
    switch (data.type) {
      case 'JOIN':
        if (this.onStatusCallback) {
          this.onStatusCallback(true, data.senderRole);
        }
        break;
      case 'MESSAGE':
        if (data.payload && this.onMessageCallback) {
          this.onMessageCallback(data.payload);
        }
        break;
      case 'CLEAR':
        if (this.onClearCallback) {
          this.onClearCallback();
        }
        break;
      case 'LEAVE':
        if (this.onStatusCallback) {
          this.onStatusCallback(false);
        }
        break;
    }
  }

  public sendMessage(msg: TranslationMessage) {
    this.broadcastEvent({
      type: 'MESSAGE',
      roomId: this.roomId,
      senderRole: this.role,
      senderName: this.role === 'host' ? '호스트' : '게스트',
      payload: msg,
      timestamp: Date.now(),
    });
  }

  public sendClear() {
    this.broadcastEvent({
      type: 'CLEAR',
      roomId: this.roomId,
      senderRole: this.role,
      senderName: this.role === 'host' ? '호스트' : '게스트',
      timestamp: Date.now(),
    });
  }

  private broadcastEvent(event: RoomEvent) {
    if (this.channel) {
      try {
        this.channel.postMessage(event);
      } catch (e) {
        console.warn('Channel post error:', e);
      }
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`omnitrans_sync_${this.roomId}`, JSON.stringify(event));
      } catch (e) {
        // localStorage quota
      }
    }
  }

  public destroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.broadcastEvent({
      type: 'LEAVE',
      roomId: this.roomId,
      senderRole: this.role,
      senderName: this.role === 'host' ? '호스트' : '게스트',
      timestamp: Date.now(),
    });
    if (this.channel) {
      this.channel.close();
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageEvent.bind(this));
    }
  }
}
