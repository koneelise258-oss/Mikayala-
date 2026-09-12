import { Message, SignalingPayload } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mapDbRecordToMessage, uploadMediaToStorage } from './messageService';
import { localP2PService } from './localP2PService';
import { offlineStorageService } from './offlineStorageService';

export interface ProximityMessagePayload {
  type: 'chat_message' | 'chat_reaction' | 'reaction_update' | 'typing' | 'signaling' | 'call_event' | 'game_event' | 'delete_message';
  senderId: string;
  coupleId: string;
  message?: Message;
  reaction?: { messageId: string; emoji: string; userId: string };
  reactionData?: { messageId: string; reactions: Record<string, string> };
  isTyping?: boolean;
  signaling?: SignalingPayload;
  gameData?: any;
  deleteData?: { messageId: string; forEveryone: boolean; senderId?: string };
  timestamp: number;
}

export type ProximityMessageCallback = (payload: ProximityMessagePayload) => void;

const OUTBOX_STORAGE_KEY = 'mikayla_offline_outbox';

class ProximityService {
  private localBroadcastChannel: BroadcastChannel | null = null;
  private onPayloadReceived: ProximityMessageCallback | null = null;
  private coupleId: string = '';
  private currentUserId: string = '';
  private isConnected: boolean = false;
  private tech: 'bluetooth' | 'wifi_hotspot' = 'bluetooth';
  private peerName: string = '';

  public setup(coupleId: string, currentUserId: string, onMessage?: ProximityMessageCallback) {
    this.coupleId = coupleId;
    this.currentUserId = currentUserId;
    if (onMessage) {
      this.onPayloadReceived = onMessage;
    }

    // 1. Initialisation du BroadcastChannel local / multi-onglets / P2P
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        if (this.localBroadcastChannel) {
          this.localBroadcastChannel.close();
        }
        const channelName = `mikayla_proximity_mesh_${coupleId || 'default'}`;
        this.localBroadcastChannel = new BroadcastChannel(channelName);
        this.localBroadcastChannel.onmessage = (event) => {
          const payload = event.data as ProximityMessagePayload;
          if (payload && payload.senderId !== this.currentUserId) {
            console.log('[ProximityService] Message direct reçu via canal radio/P2P:', payload.type);
            if (this.onPayloadReceived) {
              this.onPayloadReceived(payload);
            }
          }
        };
        console.log('[ProximityService] Canal radio de proximité prêt sur:', channelName);
      }
    } catch (e) {
      console.warn('[ProximityService] Erreur initialisation BroadcastChannel:', e);
    }

    // 2. Écoute des paquets directs via Local WebSocket (Wi-Fi Hotspot) et Web Bluetooth
    localP2PService.onPacketReceived((packet) => {
      if (packet.senderId !== this.currentUserId) {
        console.log('[ProximityService] Paquet P2P direct reçu de', packet.senderId, packet.type);
        if (packet.type === 'message' && packet.data && this.onPayloadReceived) {
          this.onPayloadReceived({
            type: 'chat_message',
            senderId: packet.senderId,
            coupleId: packet.coupleId || this.coupleId,
            message: packet.data,
            timestamp: packet.timestamp
          });
        } else if (packet.type === 'delete_message' && packet.data && this.onPayloadReceived) {
          this.onPayloadReceived({
            type: 'delete_message',
            senderId: packet.senderId,
            coupleId: this.coupleId,
            deleteData: packet.data,
            timestamp: packet.timestamp
          });
        }
      }
    });

    // 3. Écouteur pour la reconnexion réseau automatique
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[ProximityService] Réseau internet détecté. Lancement de la réconciliation...');
        this.reconcileOfflineOutbox(this.coupleId);
      });
    }
  }

  public setOnPayloadReceived(callback: ProximityMessageCallback) {
    this.onPayloadReceived = callback;
  }

  public setConnectionState(connected: boolean, tech: 'bluetooth' | 'wifi_hotspot', peerName?: string) {
    this.isConnected = connected;
    this.tech = tech;
    this.peerName = peerName || '';
    console.log('[ProximityService] État de liaison mis à jour:', { connected, tech, peerName });
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public getTech(): 'bluetooth' | 'wifi_hotspot' {
    return this.tech;
  }

  /**
   * Envoi d'un message direct (texte, image base64, audio, réaction, suppression, appel)
   */
  public broadcastPayload(payload: Omit<ProximityMessagePayload, 'senderId' | 'coupleId' | 'timestamp'>) {
    const fullPayload: ProximityMessagePayload = {
      ...payload,
      senderId: this.currentUserId,
      coupleId: this.coupleId,
      timestamp: Date.now()
    };

    // 1. Diffusion locale BroadcastChannel (même réseau / même onglet / Hotspot local)
    try {
      if (this.localBroadcastChannel) {
        this.localBroadcastChannel.postMessage(fullPayload);
        console.log('[ProximityService] Payload diffusé avec succès via canal local:', fullPayload.type);
      }
    } catch (err) {
      console.warn('[ProximityService] Échec broadcast local:', err);
    }

    // 2. Diffusion via WebSocket local (Point d'accès) et Web Bluetooth P2P
    try {
      if (fullPayload.type === 'chat_message' && fullPayload.message) {
        localP2PService.sendP2PMessage(fullPayload.message, this.currentUserId, this.coupleId);
      } else if (fullPayload.type === 'delete_message' && fullPayload.deleteData) {
        localP2PService.sendP2PDeleteInstruction(
          fullPayload.deleteData.messageId,
          fullPayload.deleteData.forEveryone,
          this.currentUserId
        );
      } else {
        localP2PService.sendPacket({
          type: fullPayload.type as any,
          senderId: this.currentUserId,
          coupleId: this.coupleId,
          data: fullPayload,
          timestamp: Date.now()
        });
      }
    } catch (p2pErr) {
      console.warn('[ProximityService] Échec envoi via localP2PService:', p2pErr);
    }

    // 3. Si le message est un message de chat, l'enregistrer dans l'Outbox et IndexedDB pour réconciliation cloud future
    if (fullPayload.type === 'chat_message' && fullPayload.message) {
      this.enqueueOfflineMessage(fullPayload.message);
    }
  }

  /**
   * Ajoute un message à la file d'attente hors-ligne (Outbox & IndexedDB)
   */
  public enqueueOfflineMessage(message: Message, mediaBlob?: Blob) {
    // A. Enregistrement moderne et volumineux dans IndexedDB
    offlineStorageService.saveOfflineMessage(message, mediaBlob).catch((err) => {
      console.warn('[ProximityService] Erreur sauvegarde IndexedDB:', err);
    });

    // B. Enregistrement redondant dans localStorage
    try {
      const existingStr = localStorage.getItem(OUTBOX_STORAGE_KEY);
      const outbox: Message[] = existingStr ? JSON.parse(existingStr) : [];
      
      // Éviter les doublons
      if (!outbox.some(m => m.id === message.id)) {
        outbox.push({
          ...message,
          transportMode: this.tech === 'wifi_hotspot' ? 'proximity' : 'proximity',
          status: 'pending_sync',
          syncStatus: 'pending_sync'
        });
        localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(outbox));
        console.log('[ProximityService] Message stocké dans l\'Outbox hors-ligne (total:', outbox.length, ')');
      }
    } catch (e) {
      console.warn('[ProximityService] Erreur lors de l\'enregistrement dans l\'Outbox:', e);
    }
  }

  /**
   * Récupère les messages en attente de synchronisation
   */
  public getOfflineOutbox(): Message[] {
    try {
      const existingStr = localStorage.getItem(OUTBOX_STORAGE_KEY);
      return existingStr ? JSON.parse(existingStr) : [];
    } catch {
      return [];
    }
  }

  /**
   * Synchronise tous les messages hors-ligne vers Supabase une fois reconnecté
   */
  public async reconcileOfflineOutbox(coupleId?: string): Promise<number> {
    const targetCoupleId = coupleId || this.coupleId;

    // Déclenche la synchronisation via IndexedDB
    const { syncedCount: idbSynced } = await offlineStorageService.syncOfflineMessages(targetCoupleId);

    if (!targetCoupleId || !isSupabaseConfigured()) {
      return idbSynced;
    }

    const outbox = this.getOfflineOutbox();
    if (outbox.length === 0) {
      return 0;
    }

    console.log(`[ProximityService] 🔄 Début de réconciliation cloud : ${outbox.length} message(s) en attente`);
    let syncedCount = 0;
    const remainingOutbox: Message[] = [];

    for (const msg of outbox) {
      try {
        let mediaUrl = msg.mediaUrl;
        let storagePath = msg.storagePath;

        // Si média local base64/blob, essayer de l'uploader
        if (msg.mediaUrl && (msg.mediaUrl.startsWith('data:') || msg.mediaUrl.startsWith('blob:'))) {
          try {
            const res = await fetch(msg.mediaUrl);
            const blob = await res.blob();
            const uploaded = await uploadMediaToStorage(blob, targetCoupleId, `${msg.id}.${msg.fileType || 'jpg'}`);
            if (uploaded) {
              mediaUrl = uploaded.url;
              storagePath = uploaded.path;
            }
          } catch (uploadErr) {
            console.warn('[ProximityService] Erreur upload média offline:', uploadErr);
          }
        }

        const insertPayload: Record<string, any> = {
          id: msg.id,
          couple_id: targetCoupleId,
          sender_id: msg.senderId,
          content: msg.content || '',
          message_type: msg.type || 'text',
          media_url: mediaUrl || null,
          storage_path: storagePath || null,
          transport_mode: 'proximity',
          created_at: new Date(msg.timestamp).toISOString()
        };

        if (msg.receiverId) insertPayload.receiver_id = msg.receiverId;
        if (msg.audioDuration) insertPayload.audio_duration = msg.audioDuration;
        if (msg.waveform) insertPayload.waveform = JSON.stringify(msg.waveform);
        if (msg.replyToId) insertPayload.reply_to_id = msg.replyToId;
        if (msg.isViewOnce) insertPayload.is_view_once = msg.isViewOnce;

        const { error } = await supabase
          .from('messages')
          .insert(insertPayload);

        if (!error || error.code === '23505') { // 23505 = déjà présent (idempotent)
          syncedCount++;
          console.log(`[ProximityService] ✅ Message ${msg.id} synchronisé vers Supabase`);
        } else {
          console.warn('[ProximityService] Échec insertion message offline:', error.message);
          remainingOutbox.push(msg);
        }
      } catch (err) {
        console.warn('[ProximityService] Exception synchronisation message:', err);
        remainingOutbox.push(msg);
      }
    }

    // Mettre à jour l'Outbox avec les messages restants
    localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(remainingOutbox));
    console.log(`[ProximityService] 🏁 Réconciliation terminée : ${syncedCount} message(s) synchronisé(s), ${remainingOutbox.length} restant(s)`);
    return syncedCount;
  }

  public cleanup() {
    if (this.localBroadcastChannel) {
      this.localBroadcastChannel.close();
      this.localBroadcastChannel = null;
    }
    this.onPayloadReceived = null;
  }
}

export const proximityService = new ProximityService();
export default proximityService;
