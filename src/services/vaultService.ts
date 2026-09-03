import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { VaultItem, User } from '../types';
import { getStoredVault, saveVault } from '../utils/storage';

export interface VaultSyncPayload {
  action: 'add' | 'delete' | 'update' | 'burn';
  senderId: string;
  senderName: string;
  coupleId: string;
  item?: VaultItem;
  itemId?: string;
}

export type VaultSyncCallback = (payload: VaultSyncPayload) => void;

class VaultService {
  private channel: any = null;
  private localBroadcastChannel: BroadcastChannel | null = null;
  private subscribers: Set<VaultSyncCallback> = new Set();
  private coupleId: string = '';
  private currentUserId: string = '';

  public setup(coupleId: string, currentUserId: string) {
    this.coupleId = coupleId;
    this.currentUserId = currentUserId;

    // 1. Local Cross-Tab BroadcastChannel
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        if (this.localBroadcastChannel) {
          this.localBroadcastChannel.close();
        }
        this.localBroadcastChannel = new BroadcastChannel(`mikayala_vault_channel_${coupleId || 'local'}`);
        this.localBroadcastChannel.onmessage = (event) => {
          const payload = event.data as VaultSyncPayload;
          if (payload && payload.senderId !== this.currentUserId) {
            this.notifySubscribers(payload);
          }
        };
      }
    } catch (e) {
      console.warn('[VaultService] BroadcastChannel init error:', e);
    }

    // 2. Supabase Realtime Broadcast
    if (isSupabaseConfigured() && coupleId) {
      if (this.channel) {
        supabase.removeChannel(this.channel);
      }

      this.channel = supabase
        .channel(`vault:${coupleId}`)
        .on('broadcast', { event: 'vault_sync' }, (response) => {
          const payload = response.payload as VaultSyncPayload;
          if (payload && payload.senderId !== this.currentUserId) {
            this.notifySubscribers(payload);
          }
        })
        .subscribe();
    }
  }

  public subscribe(callback: VaultSyncCallback): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(payload: VaultSyncPayload) {
    this.subscribers.forEach(cb => {
      try {
        cb(payload);
      } catch (err) {
        console.error('[VaultService] Error in subscriber callback:', err);
      }
    });
  }

  public broadcastChange(action: VaultSyncPayload['action'], user: User, item?: VaultItem, itemId?: string) {
    const payload: VaultSyncPayload = {
      action,
      senderId: user.id,
      senderName: user.name,
      coupleId: this.coupleId,
      item,
      itemId: itemId || item?.id
    };

    // 1. Send via local BroadcastChannel
    try {
      if (this.localBroadcastChannel) {
        this.localBroadcastChannel.postMessage(payload);
      }
    } catch (e) {
      console.warn('[VaultService] BroadcastChannel send error:', e);
    }

    // 2. Send via Supabase
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'vault_sync',
        payload
      });
    }
  }

  public cleanup() {
    if (this.localBroadcastChannel) {
      this.localBroadcastChannel.close();
      this.localBroadcastChannel = null;
    }
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.subscribers.clear();
  }
}

export const vaultService = new VaultService();
export default vaultService;
