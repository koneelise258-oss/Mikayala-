import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getStoredPairingState } from './authService';

export interface PresencePayload {
  userId: string;
  onlineAt: string;
}

export interface TypingPayload {
  userId: string;
  coupleId: string;
  isTyping: boolean;
}

// Memory cache to throttle user activity DB updates
let lastActivityUpdateTimestamp = 0;
const MIN_ACTIVITY_INTERVAL_MS = 45_000; // 45 seconds minimum between DB writes

/**
 * Formats a last_seen_at timestamp into a localized French string:
 * - Same day: « Vu aujourd'hui à 10:32 »
 * - Previous day: « Vu hier à 22:15 »
 * - Older in current year: « Vu le 25 août à 19:40 »
 * - Older in another year: « Vu le 25 août 2025 à 19:40 »
 */
export function formatLastSeen(dateOrTimestamp: string | number | Date | null | undefined): string {
  if (!dateOrTimestamp) return '';
  
  const date = new Date(dateOrTimestamp);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  
  // Format hours and minutes in local time
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  // Normalize dates for day comparison (midnight)
  const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  const diffDays = Math.round((nowMidnight.getTime() - dateMidnight.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `Vu aujourd'hui à ${timeStr}`;
  } else if (diffDays === 1) {
    return `Vu hier à ${timeStr}`;
  } else {
    const monthNames = [
      'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
    ];
    const day = date.getDate();
    const month = monthNames[date.getMonth()];
    
    if (date.getFullYear() === now.getFullYear()) {
      return `Vu le ${day} ${month} à ${timeStr}`;
    } else {
      return `Vu le ${day} ${month} ${date.getFullYear()} à ${timeStr}`;
    }
  }
}

/**
 * Updates public.user_activity in Supabase via RPC touch_user_activity
 */
export async function updateUserActivity(userId: string, force = false): Promise<void> {
  if (!isSupabaseConfigured() || !userId) return;

  const now = Date.now();
  if (!force && (now - lastActivityUpdateTimestamp) < MIN_ACTIVITY_INTERVAL_MS) {
    return; // Throttled
  }

  // If document is not visible and not forced, skip
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible' && !force) {
    return;
  }

  lastActivityUpdateTimestamp = now;

  try {
    // Strictly use the RPC as requested by the user
    await supabase.rpc('touch_user_activity');
  } catch (err) {
    console.debug('[presenceService] touch_user_activity RPC error:', err);
    
    // Fallback only if RPC fails and force is true (e.g. initial auth)
    // Actually, user said: "Mettre à jour l'activité uniquement avec: await supabase.rpc('touch_user_activity')"
    // So I will not fallback to direct upsert.
  }
}

/**
 * Fetches the partner's last seen date from public.user_activity
 */
export async function fetchPartnerLastSeen(partnerUserId: string): Promise<string | null> {
  if (!isSupabaseConfigured() || !partnerUserId) return null;

  try {
    const { data, error } = await supabase
      .from('user_activity')
      .select('last_seen_at')
      .eq('user_id', partnerUserId)
      .maybeSingle();

    if (error) {
      console.debug('[presenceService] fetchPartnerLastSeen error:', error.message);
      return null;
    }

    return data?.last_seen_at || null;
  } catch (err) {
    console.debug('[presenceService] fetchPartnerLastSeen exception:', err);
    return null;
  }
}

/**
 * Subscribes to real-time changes in public.user_activity for the partner
 */
export function subscribeToPartnerActivity(
  partnerUserId: string,
  onUpdate: (lastSeenAt: string) => void
): () => void {
  if (!isSupabaseConfigured() || !partnerUserId) {
    return () => {};
  }

  const channelId = `activity-${partnerUserId.substring(0, 8)}-${Date.now()}`;
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_activity',
        filter: `user_id=eq.${partnerUserId}`
      },
      (payload) => {
        if (payload.new && (payload.new as any).last_seen_at) {
          onUpdate((payload.new as any).last_seen_at);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Sets up Supabase Realtime Presence for the couple:
 * Channel: `presence:couple:${coupleId}`
 */
export function setupCouplePresence(
  coupleId: string,
  currentUserId: string,
  partnerId: string | null,
  onPartnerOnlineChange: (isOnline: boolean) => void
): () => void {
  if (!isSupabaseConfigured() || !coupleId || !currentUserId) {
    return () => {};
  }

  const channelName = `presence:couple:${coupleId}`;
  const channel = supabase.channel(channelName, {
    config: {
      presence: {
        key: currentUserId
      }
    }
  });

  const checkPartnerOnline = () => {
    const presenceState = channel.presenceState();
    const isOnline =
      partnerId !== null &&
      partnerId !== undefined &&
      partnerId !== '' &&
      partnerId !== currentUserId &&
      Object.values(presenceState)
        .flat()
        .some((presence: any) => presence.userId === partnerId);

    onPartnerOnlineChange(isOnline);
  };

  channel
    .on('presence', { event: 'sync' }, () => {
      checkPartnerOnline();
    })
    .on('presence', { event: 'join' }, () => {
      checkPartnerOnline();
    })
    .on('presence', { event: 'leave' }, () => {
      checkPartnerOnline();
    })
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        const payload: PresencePayload = {
          userId: currentUserId,
          onlineAt: new Date().toISOString()
        };
        try {
          await channel.track(payload);
        } catch (err) {
          console.debug('[presenceService] Presence track error:', err);
        }
      }
    });

  return () => {
    try {
      channel.untrack();
    } catch {
      // ignore
    }
    supabase.removeChannel(channel);
  };
}

/**
 * Sets up Supabase Realtime Broadcast for typing status:
 * Channel: `typing:couple:${coupleId}`
 * Transmits only: { userId, coupleId, isTyping } without message contents.
 */
export function setupCoupleTyping(
  coupleId: string,
  currentUserId: string,
  partnerId: string | null,
  onPartnerTypingChange: (isTyping: boolean) => void
): {
  sendTypingStatus: (isTyping: boolean) => void;
  cleanup: () => void;
} {
  if (!isSupabaseConfigured() || !coupleId || !currentUserId) {
    return {
      sendTypingStatus: () => {},
      cleanup: () => {}
    };
  }

  const channelName = `typing:couple:${coupleId}`;
  let lastSentTyping: boolean | null = null;
  let isChannelReady = false;

  const channel = supabase
    .channel(channelName)
    .on('broadcast', { event: 'typing_status' }, (response) => {
      const payload = response.payload as TypingPayload;
      if (
        payload &&
        payload.userId &&
        payload.coupleId === coupleId &&
        payload.userId !== currentUserId &&
        (!partnerId || payload.userId === partnerId)
      ) {
        onPartnerTypingChange(Boolean(payload.isTyping));
      }
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        isChannelReady = true;
      }
    });

  const sendTypingStatus = (isTyping: boolean) => {
    // Avoid repeating identical broadcast signals unnecessarily
    if (lastSentTyping === isTyping) return;
    
    // Ne jamais appeler channel.send() avant que le channel soit SUBSCRIBED.
    if (!isChannelReady) return;

    lastSentTyping = isTyping;

    const payload: TypingPayload = {
      userId: currentUserId,
      coupleId: coupleId,
      isTyping: isTyping
    };

    channel.send({
      type: 'broadcast',
      event: 'typing_status',
      payload
    }).catch((err) => {
      console.debug('[presenceService] Typing broadcast error:', err);
    });
  };

  const cleanup = () => {
    if (lastSentTyping === true && isChannelReady) {
      sendTypingStatus(false);
    }
    supabase.removeChannel(channel);
  };

  return {
    sendTypingStatus,
    cleanup
  };
}

export default {
  formatLastSeen,
  updateUserActivity,
  fetchPartnerLastSeen,
  subscribeToPartnerActivity,
  setupCouplePresence,
  setupCoupleTyping
};
