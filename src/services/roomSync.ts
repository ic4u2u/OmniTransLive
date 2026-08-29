import { Peer, type DataConnection } from 'peerjs';
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
  private peer: Peer | null = null;
  private connection: DataConnection | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private roomId: string;
  private role: 'host' | 'guest';
  private onMessageCallback?: (msg: TranslationMessage) => void;
  private onStatusCallback?: (connected: boolean, peerRole?: string) => void;
  private onClearCallback?: () => void;
  private isDestroyed = false;
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

    // 1. 로컬 탭 동기화용 BroadcastChannel 초기화
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel(`omnitrans_room_${roomId}`);
        this.broadcastChannel.onmessage = (event) => {
          if (!event.data || event.data.roomId !== this.roomId) return;
          if (event.data.senderRole !== this.role) {
            this.processEvent(event.data);
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }
    }

    // 2. 물리적 다중 스마트폰 기기간 WebRTC P2P 초기화 (PeerJS)
    this.initPeerJS();

    // 3. 로컬 스토리지 동기화 백업
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageEvent.bind(this));
    }
  }

  private initPeerJS() {
    try {
      // 룸 ID 기반 고유 Peer ID 생성
      // 호스트 Peer ID: omnitrans_host_{roomId}
      // 게스트 Peer ID: omnitrans_guest_{roomId}_{random}
      const hostPeerId = `omnitrans_host_${this.roomId}`;
      const guestPeerId = `omnitrans_guest_${this.roomId}_${Math.random().toString(36).substring(2, 6)}`;

      const myPeerId = this.role === 'host' ? hostPeerId : guestPeerId;

      this.peer = new Peer(myPeerId, {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' },
          ],
        },
      });

      this.peer.on('open', () => {
        // 게스트인 경우, 호스트 Peer에 즉시 P2P 연결 시도
        if (this.role === 'guest') {
          this.connectToHost(hostPeerId);
        }
      });

      // 호스트인 경우: 게스트로부터의 P2P 인컴 접속 수락
      this.peer.on('connection', (conn) => {
        this.setupConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.warn('PeerJS status/notice:', err.type, err.message);
        // 만약 호스트 ID가 이미 생성되어 있다면(재접속 등) 게스트로 접속 시도
        if (err.type === 'unavailable-id' && this.role === 'guest') {
          this.connectToHost(hostPeerId);
        }
      });
    } catch (err) {
      console.error('Failed to init WebRTC PeerJS:', err);
    }
  }

  // 게스트 -> 호스트 P2P 연결
  private connectToHost(hostPeerId: string) {
    if (!this.peer || this.isDestroyed) return;

    try {
      const conn = this.peer.connect(hostPeerId, {
        reliable: true,
      });

      this.setupConnection(conn);
    } catch (e) {
      console.warn('Peer connection attempt failed:', e);
    }
  }

  // P2P 커넥션 데이터 스트림 리스너
  private setupConnection(conn: DataConnection) {
    this.connection = conn;

    conn.on('open', () => {
      if (this.onStatusCallback) {
        this.onStatusCallback(true, this.role === 'host' ? 'guest' : 'host');
      }

      // 최초 접속 핸드셰이크 전송
      conn.send({
        type: 'JOIN',
        roomId: this.roomId,
        senderRole: this.role,
        senderName: this.role === 'host' ? '호스트' : '게스트',
        timestamp: Date.now(),
      });
    });

    conn.on('data', (data: any) => {
      if (data && typeof data === 'object') {
        this.processEvent(data as RoomEvent);
      }
    });

    conn.on('close', () => {
      if (this.onStatusCallback) {
        this.onStatusCallback(false);
      }
    });

    conn.on('error', () => {
      if (this.onStatusCallback) {
        this.onStatusCallback(false);
      }
    });
  }

  private handleStorageEvent(event: StorageEvent) {
    if (event.key === `omnitrans_sync_${this.roomId}` && event.newValue) {
      try {
        const data: RoomEvent = JSON.parse(event.newValue);
        if (data.senderRole !== this.role) {
          this.processEvent(data);
        }
      } catch (err) {
        console.error('Storage parse error:', err);
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

  // 발화 메시지 실시간 전송 (WebRTC P2P + BroadcastChannel + LocalStorage)
  public sendMessage(msg: TranslationMessage) {
    const event: RoomEvent = {
      type: 'MESSAGE',
      roomId: this.roomId,
      senderRole: this.role,
      senderName: this.role === 'host' ? '호스트' : '게스트',
      payload: msg,
      timestamp: Date.now(),
    };

    // 1. WebRTC P2P 전송 (스마트폰 ↔ 스마트폰)
    if (this.connection && this.connection.open) {
      this.connection.send(event);
    }

    // 2. BroadcastChannel 전송 (로컬 탭 간)
    try {
      this.broadcastChannel?.postMessage(event);
    } catch (e) {
      // ignore
    }

    // 3. Storage Event 백업
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`omnitrans_sync_${this.roomId}`, JSON.stringify(event));
      }
    } catch (e) {
      // ignore
    }
  }

  // 대화 초기화 이벤트 전송
  public sendClear() {
    const event: RoomEvent = {
      type: 'CLEAR',
      roomId: this.roomId,
      senderRole: this.role,
      senderName: this.role === 'host' ? '호스트' : '게스트',
      timestamp: Date.now(),
    };

    if (this.connection && this.connection.open) {
      this.connection.send(event);
    }

    try {
      this.broadcastChannel?.postMessage(event);
    } catch (e) {}

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(`omnitrans_sync_${this.roomId}`, JSON.stringify(event));
      }
    } catch (e) {}
  }

  // 연결 종료 및 리소스 정리
  public destroy() {
    this.isDestroyed = true;
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);

    try {
      this.connection?.close();
      this.peer?.destroy();
      this.broadcastChannel?.close();
    } catch (e) {
      // ignore
    }

    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageEvent);
    }
  }
}
