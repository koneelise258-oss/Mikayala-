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

    // 2. Supabase Realtime (Postgres Changes + Broadcast fallback)
    if (isSupabaseConfigured() && coupleId) {
      if (this.channel) {
        try {
          supabase.removeChannel(this.channel);
        } catch (_) {}
      }

      const channelName = `vault:${coupleId}`;
      const ch = safeCreateChannel(channelName);
      if (ch) {
        this.channel = ch
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'vault_items',
              filter: `couple_id=eq.${coupleId}`
            },
            (payload: any) => {
              console.log('[VaultService] Postgres changes received:', payload.eventType);
              try {
                if (payload.eventType === 'INSERT' && payload.new) {
                  const item = this.mapDbRowToVaultItem(payload.new);
                  this.notifySubscribers({
                    action: 'add',
                    senderId: item.addedBy,
                    senderName: item.addedByName || 'Partenaire',
                    coupleId,
                    item
                  });
                } else if (payload.eventType === 'UPDATE' && payload.new) {
                  const item = this.mapDbRowToVaultItem(payload.new);
                  const isBurnAction = Boolean(payload.new.is_burned);
                  this.notifySubscribers({
                    action: isBurnAction ? 'burn' : 'update',
                    senderId: item.addedBy,
                    senderName: item.addedByName || 'Partenaire',
                    coupleId,
                    item,
                    itemId: item.id
                  });
                } else if (payload.eventType === 'DELETE' && payload.old) {
                  this.notifySubscribers({
                    action: 'delete',
                    senderId: '',
                    senderName: '',
                    coupleId,
                    itemId: payload.old.id
                  });
                }
              } catch (e) {
                console.error('[VaultService] Error handling postgres_changes:', e);
              }
            }
          )
          .on('broadcast', { event: 'vault_sync' }, (response: any) => {
            const payload = response.payload as VaultSyncPayload;
            if (payload && payload.senderId !== this.currentUserId) {
              this.notifySubscribers(payload);
            }
          })
          .subscribe((status: string) => {
            console.log(`[VaultService] Subscription status for vault:${coupleId}:`, status);
          });
      }
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

    // 2. Send via Supabase Broadcast
    if (this.channel) {
      try {
        this.channel.send({
          type: 'broadcast',
          event: 'vault_sync',
          payload
        });
      } catch (e) {
        console.warn('[VaultService] Realtime broadcast send error:', e);
      }
    }

    // 3. Persist to Supabase table
    if (action === 'add' && item && this.coupleId) {
      this.saveVaultItem(this.coupleId, item).catch((err) => {
        console.error('[VaultService] Error saving vault item:', err);
      });
    } else if (action === 'delete' && (itemId || item?.id)) {
      this.deleteVaultItem(itemId || item!.id).catch((err) => {
        console.error('[VaultService] Error deleting vault item:', err);
      });
    } else if (action === 'burn' && (itemId || item?.id) && this.coupleId) {
      this.updateVaultItem(this.coupleId, itemId || item!.id, { isBurned: true, isViewed: true }).catch(() => {});
    }
  }

  public mapDbRowToVaultItem(row: any): VaultItem {
    let parsedTags: string[] = [];
    if (Array.isArray(row.tags)) {
      parsedTags = row.tags;
    } else if (typeof row.tags === 'string') {
      try {
        parsedTags = JSON.parse(row.tags);
      } catch {
        parsedTags = [];
      }
    }

    return {
      id: String(row.id),
      title: row.title || 'Souvenir intime 💜',
      type: row.type || row.media_type || 'photo',
      mediaType: row.media_type || row.type || 'photo',
      mediaUrl: row.media_url || '',
      thumbnailUrl: row.thumbnail_url || undefined,
      storagePath: row.storage_path || undefined,
      duration: Number(row.duration) || 0,
      category: row.category || 'intime',
      coupleId: row.couple_id,
      addedBy: String(row.added_by || ''),
      addedByName: row.added_by_name || undefined,
      addedByAvatar: row.added_by_avatar || undefined,
      dateAdded: row.date_added ? Number(row.date_added) : (row.created_at ? new Date(row.created_at).getTime() : Date.now()),
      createdAt: row.created_at ? new Date(row.created_at).getTime() : (row.date_added ? Number(row.date_added) : Date.now()),
      isViewOnce: Boolean(row.is_view_once),
      isViewed: Boolean(row.is_viewed),
      isBurned: Boolean(row.is_burned),
      caption: row.caption || '',
      tags: parsedTags,
      source: row.source || 'upload'
    };
  }

  public async fetchVaultItems(coupleId: string): Promise<VaultItem[]> {
    if (!isSupabaseConfigured() || !coupleId) return [];
    try {
      let query = supabase
        .from('vault_items')
        .select('*')
        .eq('couple_id', coupleId);

      const { data, error } = await query;

      if (error) {
        console.error('[VaultService] Fetch remote vault items Supabase error:', error);
        return [];
      }

      if (Array.isArray(data) && data.length > 0) {
        return data
          .map(row => this.mapDbRowToVaultItem(row))
          .sort((a, b) => (b.dateAdded || 0) - (a.dateAdded || 0));
      }
    } catch (err) {
      console.warn('[VaultService] Fetch remote vault items exception:', err);
    }
    return [];
  }

  public async saveVaultItem(coupleId: string, item: VaultItem): Promise<void> {
    if (!isSupabaseConfigured() || !coupleId) return;
    try {
      const payload: any = {
        id: item.id,
        couple_id: coupleId,
        title: item.title || 'Souvenir intime 💜',
        type: item.type || 'photo',
        media_type: item.mediaType || item.type || 'photo',
        media_url: item.mediaUrl,
        thumbnail_url: item.thumbnailUrl || null,
        storage_path: item.storagePath || null,
        duration: item.duration || 0,
        category: item.category || 'intime',
        added_by: item.addedBy,
        added_by_name: item.addedByName || '',
        added_by_avatar: item.addedByAvatar || '',
        date_added: item.dateAdded || Date.now(),
        is_view_once: Boolean(item.isViewOnce),
        is_viewed: Boolean(item.isViewed),
        is_burned: Boolean(item.isBurned),
        caption: item.caption || '',
        tags: item.tags || [],
        source: item.source || 'upload'
      };

      const { error } = await supabase.from('vault_items').upsert(payload);
      if (error) {
        console.error('[VaultService] Save remote vault item error:', error);
        throw error;
      } else {
        console.log('[VaultService] Vault item successfully saved to Supabase:', item.id);
      }
    } catch (err) {
      console.warn('[VaultService] Save remote vault item exception:', err);
      throw err;
    }
  }

  public async updateVaultItem(coupleId: string, itemId: string, updates: Partial<VaultItem>): Promise<void> {
    if (!isSupabaseConfigured() || !itemId) return;
    try {
      const dbUpdates: any = {};
      if (updates.isViewed !== undefined) dbUpdates.is_viewed = updates.isViewed;
      if (updates.isBurned !== undefined) dbUpdates.is_burned = updates.isBurned;
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.caption !== undefined) dbUpdates.caption = updates.caption;
      if (updates.category !== undefined) dbUpdates.category = updates.category;

      const { error } = await supabase
        .from('vault_items')
        .update(dbUpdates)
        .eq('id', itemId);

      if (error) {
        console.error('[VaultService] Update remote vault item error:', error);
      }
    } catch (err) {
      console.warn('[VaultService] Update remote vault item error:', err);
    }
  }

  public async deleteVaultItem(itemId: string): Promise<void> {
    if (!isSupabaseConfigured() || !itemId) return;
    try {
      const { error } = await supabase.from('vault_items').delete().eq('id', itemId);
      if (error) {
        console.error('[VaultService] Delete remote vault item error:', error);
      } else {
        console.log('[VaultService] Vault item successfully deleted from Supabase:', itemId);
      }
    } catch (err) {
      console.warn('[VaultService] Delete remote vault item error:', err);
    }
  }

  public cleanup() {
    if (this.localBroadcastChannel) {
      try {
        this.localBroadcastChannel.close();
      } catch (_) {}
      this.localBroadcastChannel = null;
    }
    if (this.channel) {
      try {
        supabase.removeChannel(this.channel);
      } catch (_) {}
      this.channel = null;
    }
    this.subscribers.clear();
  }
}

export const vaultService = new VaultService();
export default vaultService;
