import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface LocalNotificationData {
  type: 'message' | 'incoming_call' | 'missed_call' | 'test';
  id?: string;
  url?: string;
  [key: string]: any;
}

export interface LocalNotificationOptions extends NotificationOptions {
  data?: LocalNotificationData;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export class NotificationService {
  private static recentTags = new Set<string>();

  public static isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public static isPushSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  public static getPermissionStatus(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  public static async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) return 'denied';
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (e) {
      console.warn('[NotificationService] Error requesting permission:', e);
      return Notification.permission;
    }
  }

  public static getStoredVapidPublicKey(): string {
    const envObj = typeof import.meta !== 'undefined' ? (import.meta as any).env : {};
    const envKey = envObj?.VITE_VAPID_PUBLIC_KEY;
    if (envKey && typeof envKey === 'string' && envKey.trim()) {
      return envKey.trim();
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('mikayla_vapid_public_key') || '';
    }
    return '';
  }

  public static setStoredVapidPublicKey(key: string): void {
    if (typeof localStorage !== 'undefined') {
      if (key && key.trim()) {
        localStorage.setItem('mikayla_vapid_public_key', key.trim());
      } else {
        localStorage.removeItem('mikayla_vapid_public_key');
      }
    }
  }

  /**
   * Retrieves active Web Push subscription if already subscribed in browser
   */
  public static async getPushSubscription(): Promise<PushSubscription | null> {
    if (!this.isPushSupported()) return null;
    try {
      const registration = await navigator.serviceWorker.ready;
      return await registration.pushManager.getSubscription();
    } catch (err) {
      console.warn('[NotificationService] Error checking push subscription:', err);
      return null;
    }
  }

  /**
   * Subscribes the device to Web Push with VAPID key and persists to Supabase push_subscriptions
   */
  public static async subscribeToPush(
    userId: string,
    coupleId?: string
  ): Promise<{ success: boolean; error?: string; subscription?: PushSubscription | null }> {
    if (!this.isPushSupported()) {
      return { success: false, error: 'Web Push non supporté sur ce navigateur' };
    }

    try {
      // 1. Ensure permission is granted
      let permission = Notification.permission;
      if (permission !== 'granted') {
        permission = await Notification.requestPermission();
      }
      if (permission !== 'granted') {
        return { success: false, error: 'Permission de notification refusée' };
      }

      // 2. Fetch VAPID public key
      const vapidPublicKey = this.getStoredVapidPublicKey();

      if (!vapidPublicKey) {
        console.warn('[NotificationService] VAPID Public Key is not defined.');
        return { 
          success: false, 
          error: 'Clé VAPID publique manquante. Renseignez VITE_VAPID_PUBLIC_KEY ou saisissez-la dans les Paramètres.' 
        };
      }

      // 3. Register service worker and subscribe
      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey as any
        });
      }

      // 4. Save to Supabase push_subscriptions table (Objectives 3 & 4)
      if (isSupabaseConfigured() && subscription) {
        // Use supabase.auth.getUser() to ensure authenticated identity
        const { data: authUserData } = await supabase.auth.getUser();
        const effectiveUserId = authUserData?.user?.id || userId;

        const subJson = subscription.toJSON();
        const endpoint = subscription.endpoint;
        const p256dh = subJson.keys?.p256dh || '';
        const auth = subJson.keys?.auth || '';

        const record = {
          user_id: effectiveUserId,
          couple_id: coupleId || null,
          endpoint: endpoint,
          p256dh: p256dh,
          auth: auth,
          subscription: subJson,
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('push_subscriptions')
          .upsert(record, { onConflict: 'endpoint' });

        if (error) {
          console.warn('[NotificationService] Erreur lors de l’enregistrement dans push_subscriptions:', error);
          // Try inserting without subscription JSON in case columns are strict
          const fallbackRecord = {
            user_id: effectiveUserId,
            couple_id: coupleId || null,
            endpoint: endpoint,
            p256dh: p256dh,
            auth: auth
          };
          await supabase
            .from('push_subscriptions')
            .upsert(fallbackRecord, { onConflict: 'endpoint' });
        } else {
          console.log('[NotificationService] Souscription Web Push synchronisée avec succès dans Supabase ! ✨');
        }
      }

      return { success: true, subscription };
    } catch (err: any) {
      console.error('[NotificationService] Error subscribing to Web Push:', err);
      return { success: false, error: err?.message || 'Erreur lors de la souscription Web Push' };
    }
  }

  /**
   * Invokes the send-push Supabase Edge Function to deliver a remote push notification
   */
  public static async sendPushViaEdgeFunction(params: {
    recipientId: string;
    coupleId?: string;
    title: string;
    body: string;
    data?: any;
  }): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    try {
      const { data, error } = await supabase.functions.invoke('send-push', {
        body: {
          recipient_id: params.recipientId,
          couple_id: params.coupleId,
          title: params.title,
          body: params.body,
          url: params.data?.url || '/',
          data: params.data
        }
      });
      if (error) {
        console.warn('[NotificationService] Error invoking send-push Edge Function:', error);
        return false;
      }
      console.log('[NotificationService] Push notification sent via send-push:', data);
      return true;
    } catch (err) {
      console.warn('[NotificationService] Failed to invoke send-push Edge Function:', err);
      return false;
    }
  }

  public static async sendLocalNotification(title: string, options?: LocalNotificationOptions): Promise<void> {
    if (!this.isSupported() || Notification.permission !== 'granted') {
      return;
    }

    // Deduplication check for same tag within 1.5s
    const tag = options?.tag;
    if (tag) {
      if (this.recentTags.has(tag)) {
        return;
      }
      this.recentTags.add(tag);
      setTimeout(() => {
        this.recentTags.delete(tag);
      }, 1500);
    }

    try {
      // Prioritize Service Worker notification if available for background & PWA support
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        if (registration && registration.showNotification) {
          await registration.showNotification(title, {
            icon: '/icons/icon-purple-192.png',
            badge: '/icons/icon-purple-192.png',
            vibrate: [200, 100, 200] as any,
            ...options
          } as NotificationOptions);
          return;
        }
      }

      // Fallback to standard browser Notification API
      new Notification(title, {
        icon: '/icons/icon-purple-192.png',
        ...options
      });
    } catch (err) {
      console.warn('[NotificationService] Error sending local notification:', err);
    }
  }
}

/**
 * Dedicated Push Notification Service (Objectives 2, 3 & 4)
 */
export class PushNotificationService {
  /**
   * Subscribes the current user to Web Push, using supabase.auth.getUser()
   * and saving the subscription to public.push_subscriptions.
   */
  public static async subscribeUser(): Promise<{
    success: boolean;
    error?: string;
    subscription?: PushSubscription | null;
  }> {
    if (!NotificationService.isPushSupported()) {
      return { success: false, error: 'Web Push non supporté sur ce navigateur' };
    }

    try {
      // 1. Permission request
      let permission = Notification.permission;
      if (permission !== 'granted') {
        permission = await Notification.requestPermission();
      }
      if (permission !== 'granted') {
        return { success: false, error: 'Permission de notification refusée par l’utilisateur' };
      }

      // 2. Obtain current authenticated user via supabase.auth.getUser() (Objective 3)
      let currentUserId: string | null = null;
      if (isSupabaseConfigured()) {
        const { data: authData } = await supabase.auth.getUser();
        currentUserId = authData?.user?.id || null;

        // If anonymous session needs bootstrap
        if (!currentUserId) {
          const { initAnonymousAuth } = await import('./authService');
          await initAnonymousAuth().catch(() => null);
          const { data: retryAuth } = await supabase.auth.getUser();
          currentUserId = retryAuth?.user?.id || null;
        }
      }

      const { getStoredPairingState } = await import('./authService');
      const pairing = getStoredPairingState();
      const finalUserId = currentUserId;

      if (!finalUserId) {
        return { success: false, error: 'Utilisateur non authentifié dans Supabase' };
      }

      // 3. Delegate to NotificationService.subscribeToPush
      return await NotificationService.subscribeToPush(finalUserId, pairing.coupleId);
    } catch (err: any) {
      console.error('[PushNotificationService] subscribeUser error:', err);
      return { success: false, error: err?.message || 'Erreur lors de la souscription Web Push' };
    }
  }
}


