export interface LocalNotificationData {
  type: 'message' | 'incoming_call' | 'missed_call' | 'test';
  id?: string;
  url?: string;
  [key: string]: any;
}

export interface LocalNotificationOptions extends NotificationOptions {
  data?: LocalNotificationData;
}

export class NotificationService {
  private static recentTags = new Set<string>();

  public static isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
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

