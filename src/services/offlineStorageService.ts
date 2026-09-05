import { Message, MessageStatus } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { uploadMediaToStorage, mapDbRecordToMessage } from './messageService';

const DB_NAME = 'MikaylaOfflineDB';
const DB_VERSION = 1;
const STORE_MESSAGES = 'offline_messages';
const STORE_MEDIA = 'offline_media';
const STORE_ACTIONS = 'offline_actions';

const LOCALSTORAGE_BACKUP_KEY = 'mikayla_offline_messages_backup';
const LOCALSTORAGE_ACTIONS_KEY = 'mikayla_offline_actions_backup';

export interface OfflineAction {
  id: string;
  action: 'delete_for_everyone' | 'delete_for_me';
  messageId: string;
  userId: string;
  coupleId: string;
  storagePath?: string | null;
  timestamp: number;
}

class OfflineStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isSyncing: boolean = false;
  private syncListeners: Set<(syncedCount: number) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.initDB();
      this.setupNetworkListeners();
    }
  }

  /**
   * Initializes the IndexedDB database
   */
  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !('indexedDB' in window)) {
        return reject(new Error('IndexedDB not supported in this environment'));
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(STORE_MESSAGES)) {
          const msgStore = db.createObjectStore(STORE_MESSAGES, { keyPath: 'id' });
          msgStore.createIndex('status', 'status', { unique: false });
          msgStore.createIndex('timestamp', 'timestamp', { unique: false });
          msgStore.createIndex('coupleId', 'coupleId', { unique: false });
        }

        if (!db.objectStoreNames.contains(STORE_MEDIA)) {
          db.createObjectStore(STORE_MEDIA, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(STORE_ACTIONS)) {
          const actionStore = db.createObjectStore(STORE_ACTIONS, { keyPath: 'id' });
          actionStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.warn('[OfflineStorage] Failed to open IndexedDB, falling back to memory/localStorage:', request.error);
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  public async initDB(): Promise<void> {
    try {
      await this.getDB();
    } catch (e) {
      console.warn('[OfflineStorage] IndexedDB initialization warning, localStorage active.');
    }
  }

  /**
   * Sets up automatic sync listener when returning online
   */
  private setupNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('[OfflineStorage] 🌐 Network online event detected! Triggering syncOfflineMessages...');
      this.syncOfflineMessages().catch(err => {
        console.warn('[OfflineStorage] Auto-sync on online error:', err);
      });
    });
  }

  public onSyncCompleted(listener: (syncedCount: number) => void): () => void {
    this.syncListeners.add(listener);
    return () => {
      this.syncListeners.delete(listener);
    };
  }

  /**
   * Saves a message sent offline with status pending_sync
   */
  public async saveOfflineMessage(message: Message, mediaBlob?: Blob): Promise<void> {
    const offlineMsg: Message = {
      ...message,
      status: 'pending_sync',
      syncStatus: 'pending_sync'
    };

    try {
      const db = await this.getDB();

      // Store message in IndexedDB
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([STORE_MESSAGES], 'readwrite');
        const store = tx.objectStore(STORE_MESSAGES);
        const req = store.put(offlineMsg);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });

      // Store media blob in IndexedDB if available
      if (mediaBlob && mediaBlob.size > 0) {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction([STORE_MEDIA], 'readwrite');
          const store = tx.objectStore(STORE_MEDIA);
          const req = store.put({
            id: offlineMsg.id,
            blob: mediaBlob,
            mimeType: mediaBlob.type,
            fileName: offlineMsg.fileName || `${offlineMsg.id}.${offlineMsg.fileType || 'bin'}`,
            timestamp: Date.now()
          });
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }

      console.log('[OfflineStorage] Message saved to IndexedDB (pending_sync):', offlineMsg.id);
    } catch (err) {
      // Fallback to localStorage
      console.warn('[OfflineStorage] Storing in localStorage fallback:', err);
      try {
        const existingStr = localStorage.getItem(LOCALSTORAGE_BACKUP_KEY);
        const list: Message[] = existingStr ? JSON.parse(existingStr) : [];
        const idx = list.findIndex(m => m.id === offlineMsg.id);
        if (idx >= 0) {
          list[idx] = offlineMsg;
        } else {
          list.push(offlineMsg);
        }
        localStorage.setItem(LOCALSTORAGE_BACKUP_KEY, JSON.stringify(list));
      } catch (lsErr) {
        console.error('[OfflineStorage] localStorage full or error:', lsErr);
      }
    }
  }

  /**
   * Saves an offline delete action (delete for me / delete for everyone) to be synced later
   */
  public async saveOfflineDeleteAction(action: Omit<OfflineAction, 'id' | 'timestamp'>): Promise<void> {
    const fullAction: OfflineAction = {
      ...action,
      id: `act_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: Date.now()
    };

    try {
      const db = await this.getDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction([STORE_ACTIONS], 'readwrite');
        const store = tx.objectStore(STORE_ACTIONS);
        const req = store.put(fullAction);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      try {
        const existing = localStorage.getItem(LOCALSTORAGE_ACTIONS_KEY);
        const list: OfflineAction[] = existing ? JSON.parse(existing) : [];
        list.push(fullAction);
        localStorage.setItem(LOCALSTORAGE_ACTIONS_KEY, JSON.stringify(list));
      } catch (lsErr) {
        console.error('[OfflineStorage] localStorage action error:', lsErr);
      }
    }
  }

  /**
   * Retrieves all messages marked as pending_sync
   */
  public async getPendingSyncMessages(): Promise<{ message: Message; mediaBlob?: Blob }[]> {
    const results: { message: Message; mediaBlob?: Blob }[] = [];

    try {
      const db = await this.getDB();
      const messages: Message[] = await new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_MESSAGES], 'readonly');
        const store = tx.objectStore(STORE_MESSAGES);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });

      for (const msg of messages) {
        if (msg.status === 'pending_sync' || msg.syncStatus === 'pending_sync') {
          // Check if there is an associated media blob
          let blob: Blob | undefined = undefined;
          try {
            const mediaEntry: any = await new Promise((resolve) => {
              const tx = db.transaction([STORE_MEDIA], 'readonly');
              const store = tx.objectStore(STORE_MEDIA);
              const req = store.get(msg.id);
              req.onsuccess = () => resolve(req.result);
              req.onerror = () => resolve(undefined);
            });
            if (mediaEntry?.blob) {
              blob = mediaEntry.blob;
            }
          } catch {}

          results.push({ message: msg, mediaBlob: blob });
        }
      }
    } catch (err) {
      // Fallback to localStorage
      try {
        const saved = localStorage.getItem(LOCALSTORAGE_BACKUP_KEY);
        if (saved) {
          const list: Message[] = JSON.parse(saved);
          for (const msg of list) {
            if (msg.status === 'pending_sync' || msg.syncStatus === 'pending_sync') {
              results.push({ message: msg });
            }
          }
        }
      } catch {}
    }

    return results;
  }

  /**
   * Synchronizes all offline pending messages and actions with Supabase
   */
  public async syncOfflineMessages(targetCoupleId?: string): Promise<{ syncedCount: number; errors: any[] }> {
    if (this.isSyncing) {
      console.log('[OfflineStorage] Sync already in progress, skipping duplicate call.');
      return { syncedCount: 0, errors: [] };
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.log('[OfflineStorage] Device is still offline, cannot sync now.');
      return { syncedCount: 0, errors: [] };
    }

    if (!isSupabaseConfigured()) {
      console.log('[OfflineStorage] Supabase is not configured, skipping cloud sync.');
      return { syncedCount: 0, errors: [] };
    }

    this.isSyncing = true;
    let syncedCount = 0;
    const errors: any[] = [];
    const syncedMessageIds: string[] = [];

    try {
      console.log('[OfflineStorage] 🚀 Starting syncOfflineMessages to Supabase...');

      // 1. Process pending offline actions (e.g. deletions)
      await this.processPendingActions();

      // 2. Fetch all pending messages
      const pendingItems = await this.getPendingSyncMessages();
      console.log(`[OfflineStorage] Found ${pendingItems.length} message(s) pending sync.`);

      for (const item of pendingItems) {
        const msg = item.message;
        const mediaBlob = item.mediaBlob;
        const coupleId = targetCoupleId || (msg as any).coupleId || (msg as any).couple_id;

        try {
          let mediaUrl = msg.mediaUrl;
          let storagePath = msg.storagePath;

          // A. If there is a media blob or data: url, upload it to Supabase Storage
          if (mediaBlob && mediaBlob.size > 0 && coupleId) {
            const folder = msg.type === 'audio' ? 'audio' : msg.type === 'video' ? 'video' : 'media';
            const uploaded = await uploadMediaToStorage(mediaBlob, coupleId, msg.id, folder);
            if (uploaded) {
              mediaUrl = uploaded.url;
              storagePath = uploaded.path;
            }
          } else if (mediaUrl && (mediaUrl.startsWith('data:') || mediaUrl.startsWith('blob:')) && coupleId) {
            try {
              const res = await fetch(mediaUrl);
              const blob = await res.blob();
              const folder = msg.type === 'audio' ? 'audio' : msg.type === 'video' ? 'video' : 'media';
              const uploaded = await uploadMediaToStorage(blob, coupleId, msg.id, folder);
              if (uploaded) {
                mediaUrl = uploaded.url;
                storagePath = uploaded.path;
              }
            } catch (mediaErr) {
              console.warn('[OfflineStorage] Failed to upload inline blob media:', mediaErr);
            }
          }

          // B. Prepare the database payload
          const insertPayload: Record<string, any> = {
            id: msg.id,
            couple_id: coupleId,
            sender_id: msg.senderId,
            receiver_id: msg.receiverId,
            message_type: msg.type || 'text',
            content: msg.content || '',
            media_url: mediaUrl || null,
            storage_path: storagePath || null,
            audio_duration: msg.audioDuration || null,
            waveform: msg.waveform ? JSON.stringify(msg.waveform) : null,
            reply_to_id: msg.replyToId || null,
            is_view_once: msg.isViewOnce || false,
            transport_mode: 'proximity',
            created_at: new Date(msg.timestamp).toISOString()
          };

          if (msg.pollData) insertPayload.poll_data = JSON.stringify(msg.pollData);
          if (msg.eventData) insertPayload.event_data = JSON.stringify(msg.eventData);
          if (msg.locationData) insertPayload.location_data = JSON.stringify(msg.locationData);
          if (msg.contactCard) insertPayload.contact_card = JSON.stringify(msg.contactCard);

          // C. Upsert to Supabase
          const { error: upsertErr } = await supabase
            .from('messages')
            .upsert(insertPayload, { onConflict: 'id' });

          if (!upsertErr) {
            syncedCount++;
            syncedMessageIds.push(msg.id);
            await this.removeOfflineMessage(msg.id);
            console.log(`[OfflineStorage] ✅ Synced message ${msg.id} to Supabase`);
          } else {
            console.error(`[OfflineStorage] ❌ Supabase upsert error for ${msg.id}:`, upsertErr.message);
            errors.push({ id: msg.id, error: upsertErr.message });
          }
        } catch (msgErr: any) {
          console.error(`[OfflineStorage] ❌ Exception syncing message ${msg.id}:`, msgErr);
          errors.push({ id: msg.id, error: msgErr?.message || String(msgErr) });
        }
      }

      // Notify listeners
      if (syncedCount > 0) {
        this.syncListeners.forEach(listener => {
          try {
            listener(syncedCount);
          } catch {}
        });

        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('mikayla_offline_synced', {
              detail: { syncedCount, syncedIds: syncedMessageIds }
            })
          );
        }
      }

      console.log(`[OfflineStorage] 🎉 Sync finished: ${syncedCount} message(s) synced, ${errors.length} error(s).`);
    } finally {
      this.isSyncing = false;
    }

    return { syncedCount, errors };
  }

  /**
   * Processes pending offline actions (e.g. deletions)
   */
  private async processPendingActions() {
    const actions: OfflineAction[] = [];

    try {
      const db = await this.getDB();
      const storedActions: OfflineAction[] = await new Promise((resolve) => {
        const tx = db.transaction([STORE_ACTIONS], 'readonly');
        const store = tx.objectStore(STORE_ACTIONS);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
      actions.push(...storedActions);
    } catch {
      try {
        const saved = localStorage.getItem(LOCALSTORAGE_ACTIONS_KEY);
        if (saved) actions.push(...JSON.parse(saved));
      } catch {}
    }

    for (const act of actions) {
      try {
        if (act.action === 'delete_for_everyone') {
          // 1. If media storagePath exists, remove it
          if (act.storagePath) {
            await supabase.storage.from('messages-media').remove([act.storagePath]).catch(() => {});
          }

          // 2. Mark deleted in database
          await supabase
            .from('messages')
            .update({
              deleted_for_everyone: true,
              is_deleted_for_everyone: true,
              deleted_at: new Date().toISOString(),
              content: 'Ce message a été supprimé',
              media_url: null,
              storage_path: null
            })
            .eq('id', act.messageId);
        } else if (act.action === 'delete_for_me') {
          // Append user ID to deleted_for_users
          try {
            await supabase.rpc('delete_message_for_me', {
              p_message_id: act.messageId,
              p_user_id: act.userId
            });
          } catch {
            // Direct array update fallback
            const { data } = await supabase
              .from('messages')
              .select('deleted_for_users')
              .eq('id', act.messageId)
              .single();
            const currentArr = data?.deleted_for_users || [];
            if (!currentArr.includes(act.userId)) {
              await supabase
                .from('messages')
                .update({ deleted_for_users: [...currentArr, act.userId] })
                .eq('id', act.messageId);
            }
          }
        }

        // Clean up action from DB
        await this.removeOfflineAction(act.id);
      } catch (actErr) {
        console.warn('[OfflineStorage] Error processing pending action:', act.id, actErr);
      }
    }
  }

  /**
   * Removes a synced message from local offline storage
   */
  public async removeOfflineMessage(messageId: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction([STORE_MESSAGES, STORE_MEDIA], 'readwrite');
      tx.objectStore(STORE_MESSAGES).delete(messageId);
      tx.objectStore(STORE_MEDIA).delete(messageId);
    } catch {
      try {
        const saved = localStorage.getItem(LOCALSTORAGE_BACKUP_KEY);
        if (saved) {
          const list: Message[] = JSON.parse(saved);
          const filtered = list.filter(m => m.id !== messageId);
          localStorage.setItem(LOCALSTORAGE_BACKUP_KEY, JSON.stringify(filtered));
        }
      } catch {}
    }
  }

  /**
   * Removes an action from offline actions store
   */
  private async removeOfflineAction(actionId: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction([STORE_ACTIONS], 'readwrite');
      tx.objectStore(STORE_ACTIONS).delete(actionId);
    } catch {
      try {
        const saved = localStorage.getItem(LOCALSTORAGE_ACTIONS_KEY);
        if (saved) {
          const list: OfflineAction[] = JSON.parse(saved);
          const filtered = list.filter(a => a.id !== actionId);
          localStorage.setItem(LOCALSTORAGE_ACTIONS_KEY, JSON.stringify(filtered));
        }
      } catch {}
    }
  }
}

export const offlineStorageService = new OfflineStorageService();
export const syncOfflineMessages = (coupleId?: string) => offlineStorageService.syncOfflineMessages(coupleId);
export default offlineStorageService;
