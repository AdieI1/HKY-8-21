/**
 * High-performance, zero-dependency Laravel Reverb WebSocket Client
 * Protocol: Pusher v7 compatible
 */

const REVERB_HOST = process.env.REACT_APP_REVERB_HOST || 'localhost';
const REVERB_PORT = process.env.REACT_APP_REVERB_PORT || '8080';
const REVERB_KEY = process.env.REACT_APP_REVERB_APP_KEY || 'luddh2vtjft7eegdo9ep';
const REVERB_SCHEME = process.env.REACT_APP_REVERB_SCHEME || 'ws';

class ReverbClient {
  constructor() {
    this.ws = null;
    this.socketId = null;
    this.channels = new Map(); // channelName -> Set of callback handlers { event, callback }
    this.connected = false;
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.pingTimer = null;
    this.listeners = [];
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const url = `${REVERB_SCHEME}://${REVERB_HOST}:${REVERB_PORT}/app/${REVERB_KEY}?protocol=7&client=js&version=8.4.0&flash=false`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        this.startPing();
        // Resubscribe to existing channels if reconnected
        this.channels.forEach((_, channelName) => {
          this.sendSubscribe(channelName);
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.handleMessage(payload);
        } catch (err) {
          // Silent ignore corrupted frame
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        this.stopPing();
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        // Handled via onclose
      };
    } catch (err) {
      this.scheduleReconnect();
    }
  }

  startPing() {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ event: 'pusher:ping', data: {} }));
      }
    }, 25000);
  }

  stopPing() {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 15000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  sendSubscribe(channelName) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        event: 'pusher:subscribe',
        data: { channel: channelName },
      }));
    }
  }

  handleMessage(msg) {
    if (msg.event === 'pusher:connection_established') {
      try {
        const data = JSON.parse(msg.data);
        this.socketId = data.socket_id;
      } catch (_) {}
      return;
    }

    if (msg.event === 'pusher:ping') {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ event: 'pusher:pong', data: {} }));
      }
      return;
    }

    // Channel event
    if (msg.channel && this.channels.has(msg.channel)) {
      if (typeof window !== 'undefined' && typeof window.__hjyClearApiCache === 'function') {
        window.__hjyClearApiCache();
      }
      const handlers = this.channels.get(msg.channel);
      let eventData = msg.data;
      if (typeof eventData === 'string') {
        try {
          eventData = JSON.parse(eventData);
        } catch (_) {}
      }

      handlers.forEach((h) => {
        if (h.event === '*' || h.event === msg.event) {
          try {
            h.callback(eventData, msg.event);
          } catch (err) {
            console.error('Reverb handler error:', err);
          }
        }
      });
    }
  }

  subscribe(channelName, eventName, callback) {
    if (!this.channels.has(channelName)) {
      this.channels.set(channelName, new Set());
      this.sendSubscribe(channelName);
    }

    const handler = { event: eventName, callback };
    this.channels.get(channelName).add(handler);

    // Ensure connection is active
    this.connect();

    return () => {
      const handlers = this.channels.get(channelName);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.channels.delete(channelName);
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
              event: 'pusher:unsubscribe',
              data: { channel: channelName },
            }));
          }
        }
      }
    };
  }
}

// Global singleton instance
const reverb = new ReverbClient();
export default reverb;
