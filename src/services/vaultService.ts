import { supabase, isSupabaseConfigured, safeCreateChannel } from '../lib/supabase';
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

      this.channel = safeCreateChannel(`vault:${coupleId}`)
        ?.on('broadcast', { event: 'vault_sync' }, (response) => {
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

    // 3. Persist to Supabase table if online
    if (action === 'add' && item && this.coupleId) {
      this.saveVaultItem(this.coupleId, item).catch(() => {});
    } else if (action === 'delete' && (itemId || item?.id)) {
      this.deleteVaultItem(itemId || item!.id).catch(() => {});
    }
  }

  public async fetchVaultItems(coupleId: string): Promise<VaultItem[]> {
    if (!isSupabaseConfigured() || !coupleId) return [];
    try {
      const { data, error } = await supabase
        .from('vault_items')
        .select('*')
        .eq('couple_id', coupleId)
        .order('date_added', { ascending: false });

      if (!error && Array.isArray(data) && data.length > 0) {
        return data.map(row => ({
          id: row.id,
          title: row.title || 'Souvenir intime 💜',
          type: row.type || row.media_type || 'photo',
          mediaType: row.media_type || row.type || 'photo',
          mediaUrl: row.media_url,
          thumbnailUrl: row.thumbnail_url,
          duration: row.duration || 0,
          category: row.category || 'intime',
          coupleId: row.couple_id,
          addedBy: row.added_by,
          addedByName: row.added_by_name,
          addedByAvatar: row.added_by_avatar,
          dateAdded: row.date_added || Date.now(),
          createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
          isViewOnce: !!row.is_view_once,
          isViewed: !!row.is_viewed,
          isBurned: !!row.is_burned,
          caption: row.caption || '',
          tags: row.tags || []
        }));
      }
    } catch (err) {
      console.warn('[VaultService] Fetch remote vault items error:', err);
    }
    return [];
  }

  public async saveVaultItem(coupleId: string, item: VaultItem): Promise<void> {
    if (!isSupabaseConfigured() || !coupleId) return;
    try {
      await supabase.from('vault_items').upsert({
        id: item.id,
        couple_id: coupleId,
        title: item.title,
        type: item.type,
        media_type: item.type,
        media_url: item.mediaUrl,
        thumbnail_url: item.thumbnailUrl,
        duration: item.duration,
        category: item.category,
        added_by: item.addedBy,
        added_by_name: item.addedByName,
        added_by_avatar: item.addedByAvatar,
        date_added: item.dateAdded,
        is_view_once: item.isViewOnce,
        is_viewed: item.isViewed,
        is_burned: item.isBurned,
        caption: item.caption,
        tags: item.tags
      });
    } catch (err) {
      console.warn('[VaultService] Save remote vault item error:', err);
    }
  }

  public async deleteVaultItem(itemId: string): Promise<void> {
    if (!isSupabaseConfigured() || !itemId) return;
    try {
      await supabase.from('vault_items').delete().eq('id', itemId);
    } catch (err) {
      console.warn('[VaultService] Delete remote vault item error:', err);
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
