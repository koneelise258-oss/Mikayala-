import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface GameEventPayload {
  type: 'roll_dice' | 'spin_wheel' | 'draw_tod' | 'game_start' | 'game_state_update' | 'challenge_completed';
  senderId: string;
  coupleId: string;
  data: any;
}

export type GameEventCallback = (payload: GameEventPayload) => void;

class GameService {
  private channel: any = null;
  private localBroadcastChannel: BroadcastChannel | null = null;
  private onGameEventCallback: GameEventCallback | null = null;
  private currentUserId: string = '';
  private coupleId: string = '';

  public setup(coupleId: string, currentUserId: string) {
    this.coupleId = coupleId;
    this.currentUserId = currentUserId;

    // 1. Cross-tab BroadcastChannel
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        if (this.localBroadcastChannel) {
          this.localBroadcastChannel.close();
        }
        this.localBroadcastChannel = new BroadcastChannel(`mikayala_game_channel_${coupleId || 'local'}`);
        this.localBroadcastChannel.onmessage = (event) => {
          const payload = event.data as GameEventPayload;
          if (payload && payload.senderId !== this.currentUserId) {
            this.handleIncomingEvent(payload);
          }
        };
      }
    } catch (e) {
      console.warn('[GameService] BroadcastChannel setup warning:', e);
    }

    // 2. Supabase Realtime channel
    if (isSupabaseConfigured() && coupleId) {
      if (this.channel) {
        supabase.removeChannel(this.channel);
      }

      this.channel = supabase
        .channel(`game:${coupleId}`)
        .on('broadcast', { event: 'game_event' }, (response) => {
          const payload = response.payload as GameEventPayload;
          if (payload && payload.senderId !== this.currentUserId) {
            this.handleIncomingEvent(payload);
          }
        })
        .subscribe();
    }
  }

  public setOnGameEvent(callback: GameEventCallback) {
    this.onGameEventCallback = callback;
  }

  private handleIncomingEvent(payload: GameEventPayload) {
    if (this.onGameEventCallback) {
      this.onGameEventCallback(payload);
    }
  }

  public sendEvent(coupleId: string, senderId: string, type: GameEventPayload['type'], data: any) {
    const payload: GameEventPayload = {
      type,
      senderId,
      coupleId,
      data
    };

    // Broadcast to local channel
    try {
      if (this.localBroadcastChannel) {
        this.localBroadcastChannel.postMessage(payload);
      }
    } catch (e) {
      console.warn('[GameService] BroadcastChannel post error:', e);
    }

    // Broadcast to Supabase
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'game_event',
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
    this.onGameEventCallback = null;
  }
}

export const gameService = new GameService();
export default gameService;
