import { Message } from '../types';

export interface P2PPacket {
  type: 'message' | 'delete_message' | 'typing' | 'status_ping' | 'sync_request';
  senderId: string;
  coupleId?: string;
  data: any;
  timestamp: number;
}

export type P2PConnectionMode = 'none' | 'wifi_ws' | 'bluetooth';

export interface LocalP2PState {
  isOnline: boolean;
  connectionMode: P2PConnectionMode;
  isWsConnected: boolean;
  isBluetoothConnected: boolean;
  wsHost: string;
  wsPort: number;
  bluetoothDeviceName?: string;
  lastError?: string;
}

// Standard Nordic UART BLE Service & Characteristics for Web Bluetooth Serial
const BLE_UART_SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const BLE_UART_RX_CHAR_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // Phone writes to device
const BLE_UART_TX_CHAR_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // Device notifies phone

class LocalP2PService {
  private state: LocalP2PState = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connectionMode: 'none',
    isWsConnected: false,
    isBluetoothConnected: false,
    wsHost: '192.168.43.1', // Default Android/iOS Wi-Fi Hotspot Gateway IP
    wsPort: 8080
  };

  private ws: WebSocket | null = null;
  private wsReconnectTimer: any = null;
  private bleDevice: any = null;
  private bleServer: any = null;
  private bleRxChar: any = null;
  private bleTxChar: any = null;

  private packetListeners: Set<(packet: P2PPacket) => void> = new Set();
  private stateListeners: Set<(state: LocalP2PState) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  private handleNetworkChange(online: boolean) {
    this.state.isOnline = online;
    console.log(`[LocalP2P] Network connectivity changed: online = ${online}`);
    this.notifyState();
  }

  public getState(): LocalP2PState {
    return { ...this.state };
  }

  public onPacketReceived(listener: (packet: P2PPacket) => void): () => void {
    this.packetListeners.add(listener);
    return () => {
      this.packetListeners.delete(listener);
    };
  }

  public onStateChange(listener: (state: LocalP2PState) => void): () => void {
    this.stateListeners.add(listener);
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private notifyState() {
    const s = this.getState();
    this.stateListeners.forEach(fn => {
      try { fn(s); } catch {}
    });
  }

  private dispatchPacket(packet: P2PPacket) {
    console.log('[LocalP2P] Inbound packet received:', packet.type, packet);
    this.packetListeners.forEach(fn => {
      try { fn(packet); } catch (err) {
        console.warn('[LocalP2P] Packet listener error:', err);
      }
    });
  }

  // ============================================================================
  // 1. LOCAL WI-FI (POINT D'ACCÈS / WEBSOCKET ws://)
  // ============================================================================

  /**
   * Connects to a local WebSocket server (on the Hotspot network e.g. ws://192.168.43.1:8080)
   */
  public connectLocalWebSocket(host?: string, port?: number): Promise<boolean> {
    if (host) this.state.wsHost = host;
    if (port) this.state.wsPort = port;

    const wsUrl = `ws://${this.state.wsHost}:${this.state.wsPort}`;
    console.log(`[LocalP2P] Connecting to local Wi-Fi Hotspot WebSocket at: ${wsUrl}`);

    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }

    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log(`[LocalP2P] ✅ Connected to Local Wi-Fi WebSocket Server (${wsUrl})`);
          this.state.isWsConnected = true;
          this.state.connectionMode = 'wifi_ws';
          this.state.lastError = undefined;
          this.notifyState();
          resolve(true);
        };

        this.ws.onmessage = (event) => {
          try {
            const raw = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data);
            const packet = JSON.parse(raw) as P2PPacket;
            this.dispatchPacket(packet);
          } catch (e) {
            console.warn('[LocalP2P] Failed to parse incoming WebSocket message:', e);
          }
        };

        this.ws.onerror = (err) => {
          console.warn('[LocalP2P] Local WebSocket error:', err);
          this.state.isWsConnected = false;
          this.state.lastError = 'Impossible de joindre le serveur WebSocket local';
          this.notifyState();
          resolve(false);
        };

        this.ws.onclose = () => {
          console.log('[LocalP2P] Local WebSocket connection closed');
          this.state.isWsConnected = false;
          if (this.state.connectionMode === 'wifi_ws') {
            this.state.connectionMode = 'none';
          }
          this.notifyState();
        };
      } catch (err: any) {
        console.warn('[LocalP2P] Failed to construct WebSocket:', err);
        this.state.isWsConnected = false;
        this.state.lastError = err?.message || 'Erreur d\'initialisation WebSocket';
        this.notifyState();
        resolve(false);
      }
    });
  }

  public disconnectLocalWebSocket() {
    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
    this.state.isWsConnected = false;
    if (this.state.connectionMode === 'wifi_ws') {
      this.state.connectionMode = 'none';
    }
    this.notifyState();
  }

  // ============================================================================
  // 2. WEB BLUETOOTH (P2P DIRECT SANS INTERNET NI ROUTEUR)
  // ============================================================================

  /**
   * Connects to a nearby peer device using the Web Bluetooth API
   */
  public async connectBluetooth(partnerName?: string): Promise<{ success: boolean; message?: string }> {
    if (typeof navigator === 'undefined' || !('bluetooth' in navigator)) {
      const msg = "Web Bluetooth n'est pas supporté par ce navigateur (utilisez Chrome sur Android/Mac ou Edge).";
      console.warn('[LocalP2P]', msg);
      this.state.lastError = msg;
      this.notifyState();
      return { success: false, message: msg };
    }

    try {
      console.log('[LocalP2P] Requesting Web Bluetooth device...');
      const navAny = navigator as any;

      const device = await navAny.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [BLE_UART_SERVICE_UUID, 'generic_access']
      });

      if (!device) {
        return { success: false, message: 'Aucun appareil sélectionné' };
      }

      console.log('[LocalP2P] Connecting to GATT server on:', device.name || 'Bluetooth Device');
      this.bleDevice = device;
      this.state.bluetoothDeviceName = device.name || partnerName || 'Partenaire Bluetooth';

      device.addEventListener('gattserverdisconnected', () => {
        console.log('[LocalP2P] Bluetooth device disconnected');
        this.state.isBluetoothConnected = false;
        if (this.state.connectionMode === 'bluetooth') {
          this.state.connectionMode = 'none';
        }
        this.notifyState();
      });

      const server = await device.gatt.connect();
      this.bleServer = server;

      try {
        const service = await server.getPrimaryService(BLE_UART_SERVICE_UUID);
        this.bleRxChar = await service.getCharacteristic(BLE_UART_RX_CHAR_UUID);
        this.bleTxChar = await service.getCharacteristic(BLE_UART_TX_CHAR_UUID);

        // Start listening for notifications from peer
        if (this.bleTxChar) {
          await this.bleTxChar.startNotifications();
          this.bleTxChar.addEventListener('characteristicvaluechanged', (event: any) => {
            const value = event.target.value;
            const decoder = new TextDecoder('utf-8');
            const str = decoder.decode(value);
            try {
              const packet = JSON.parse(str);
              this.dispatchPacket(packet);
            } catch (e) {
              console.warn('[LocalP2P] Failed to parse BLE payload:', str);
            }
          });
        }
      } catch (gattErr) {
        console.warn('[LocalP2P] Nordic UART service not available on peer GATT, peer linked as paired proximity device:', gattErr);
      }

      this.state.isBluetoothConnected = true;
      this.state.connectionMode = 'bluetooth';
      this.state.lastError = undefined;
      this.notifyState();

      return {
        success: true,
        message: `Connecté en Bluetooth direct à ${this.state.bluetoothDeviceName}`
      };
    } catch (err: any) {
      if (err.name === 'NotFoundError' || err.name === 'UserCancelledError') {
        return { success: false, message: 'Recherche Bluetooth annulée' };
      }
      console.warn('[LocalP2P] Web Bluetooth connection failed:', err);
      this.state.lastError = err?.message || 'Échec de connexion Bluetooth';
      this.notifyState();
      return { success: false, message: err?.message };
    }
  }

  public disconnectBluetooth() {
    if (this.bleDevice && this.bleDevice.gatt && this.bleDevice.gatt.connected) {
      this.bleDevice.gatt.disconnect();
    }
    this.bleDevice = null;
    this.bleServer = null;
    this.bleRxChar = null;
    this.bleTxChar = null;
    this.state.isBluetoothConnected = false;
    if (this.state.connectionMode === 'bluetooth') {
      this.state.connectionMode = 'none';
    }
    this.notifyState();
  }

  // ============================================================================
  // 3. PACKET TRANSMISSION (SEND MESSAGE & DELETE INSTRUCTION OVER P2P)
  // ============================================================================

  /**
   * Transmits a P2P packet via active local mode (Wi-Fi WebSocket or Bluetooth)
   */
  public async sendPacket(packet: P2PPacket): Promise<boolean> {
    const raw = JSON.stringify(packet);

    // 1. Send via Local Wi-Fi WebSocket if connected
    if (this.state.isWsConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(raw);
        console.log('[LocalP2P] Packet sent over Local Wi-Fi WebSocket:', packet.type);
        return true;
      } catch (err) {
        console.warn('[LocalP2P] Failed to send over WebSocket:', err);
      }
    }

    // 2. Send via Web Bluetooth UART if connected
    if (this.state.isBluetoothConnected && this.bleRxChar) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(raw);
        // Split in chunks of 512 bytes (BLE standard MTU safe window)
        const CHUNK_SIZE = 500;
        for (let i = 0; i < data.length; i += CHUNK_SIZE) {
          const chunk = data.slice(i, i + CHUNK_SIZE);
          await this.bleRxChar.writeValue(chunk);
        }
        console.log('[LocalP2P] Packet sent over Web Bluetooth:', packet.type);
        return true;
      } catch (err) {
        console.warn('[LocalP2P] Failed to send over Bluetooth:', err);
      }
    }

    return false;
  }

  /**
   * Broadcasts an offline message via P2P
   */
  public async sendP2PMessage(message: Message, senderId: string, coupleId?: string): Promise<boolean> {
    return this.sendPacket({
      type: 'message',
      senderId,
      coupleId,
      data: message,
      timestamp: Date.now()
    });
  }

  /**
   * Sends an instantaneous deletion instruction via P2P so the other device deletes the message locally
   */
  public async sendP2PDeleteInstruction(messageId: string, forEveryone: boolean, senderId: string): Promise<boolean> {
    return this.sendPacket({
      type: 'delete_message',
      senderId,
      data: { messageId, forEveryone },
      timestamp: Date.now()
    });
  }
}

export const localP2PService = new LocalP2PService();
export default localP2PService;
