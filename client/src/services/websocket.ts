import { io, Socket } from 'socket.io-client';
import { WSMessage, WSMessageType } from '../../../shared/src/types';

export type MessageHandler = (message: WSMessage) => void;

class WebSocketService {
  private socket: Socket | null = null;
  private messageHandlers: Map<WSMessageType, Set<MessageHandler>> = new Map();
  private messageQueue: WSMessage[] = [];
  private reconnectAttempts = 0;
  private maxReconnectDelay = 30000; // 30 seconds
  private baseReconnectDelay = 3000; // 3 seconds
  private reconnectTimer: NodeJS.Timeout | null = null;
  private userId: string;

  constructor() {
    // Generate a unique user ID for this session
    this.userId = `user-${Math.random().toString(36).substring(2, 11)}`;
  }

  connect(url: string = 'http://localhost:3001'): void {
    // Clear any pending reconnection timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // Don't create duplicate connection
    if (this.socket?.connected) {
      return;
    }
    
    // Disconnect existing socket if present but not connected
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: false, // We'll handle reconnection manually
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
      this.flushMessageQueue();
      this.notifyConnectionChange('connected');
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.notifyConnectionChange('disconnected');
      this.scheduleReconnect();
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.notifyConnectionChange('disconnected');
      this.scheduleReconnect();
    });

    // Listen for server events (note: server emits with past tense like 'note:created')
    // Map server events to our internal message types
    const eventMappings: Record<string, WSMessageType> = {
      'note:created': 'note:create',
      'note:updated': 'note:update',
      'note:deleted': 'note:delete',
      'note:moved': 'note:move',
      'board:created': 'board:create',
      'board:deleted': 'board:delete',
      'board:renamed': 'board:rename',
      'sync:response': 'sync:response',
    };

    Object.entries(eventMappings).forEach(([serverEvent, messageType]) => {
      this.socket!.on(serverEvent, (payload: any) => {
        const message: WSMessage = {
          type: messageType,
          payload,
          timestamp: Date.now(),
          userId: payload.userId || 'unknown',
        };
        this.handleMessage(message);
      });
    });
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }

    this.notifyConnectionChange('reconnecting');

    // Exponential backoff: 3s, 6s, 12s, 24s, max 30s
    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectAttempts++;
      console.log(`Reconnection attempt ${this.reconnectAttempts} (delay: ${delay}ms)`);
      
      if (this.socket) {
        this.socket.connect();
      }
    }, delay);
  }

  private handleMessage(message: WSMessage): void {
    const handlers = this.messageHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => handler(message));
    }
  }

  private notifyConnectionChange(status: 'connected' | 'disconnected' | 'reconnecting'): void {
    // Emit a special connection status message
    const message: WSMessage = {
      type: 'sync:response', // Reuse existing type for connection status
      payload: { status },
      timestamp: Date.now(),
      userId: this.userId,
    };
    
    // Notify handlers registered for connection status
    const handlers = this.messageHandlers.get('sync:response');
    if (handlers) {
      handlers.forEach(handler => handler(message));
    }
  }

  on(type: WSMessageType, handler: MessageHandler): void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);
  }

  off(type: WSMessageType, handler: MessageHandler): void {
    const handlers = this.messageHandlers.get(type);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  send(type: WSMessageType, payload: any): void {
    const message: WSMessage = {
      type,
      payload,
      timestamp: Date.now(),
      userId: this.userId,
    };

    if (this.socket?.connected) {
      this.socket.emit(type, message);
    } else {
      // Queue message for later if disconnected
      this.messageQueue.push(message);
      console.log(`Message queued (${type}):`, payload);
    }
  }

  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) {
      return;
    }

    console.log(`Flushing ${this.messageQueue.length} queued messages`);
    
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      if (this.socket?.connected) {
        this.socket.emit(message.type, message);
      }
    }
  }

  requestSync(boardId: string): void {
    // Join the board room
    if (this.socket?.connected) {
      this.socket.emit('join:board', boardId);
    }
    this.send('sync:request', { boardId });
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.messageHandlers.clear();
    this.messageQueue = [];
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getUserId(): string {
    return this.userId;
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
