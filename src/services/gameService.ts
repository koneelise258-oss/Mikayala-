import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface GameEventPayload {
  type: 'roll_dice' | 'spin_wheel' | 'draw_tod' | 'game_start' | 'game_state_update';
  senderId: string;
  coupleId: string;
  data: any;
}

export type GameEventCallback = (payload: GameEventPayload) => void;

class GameService {
  private channel: any = null;
  private onGameEventCallback: GameEventCallback | null = null;

  public setup(coupleId: string, currentUserId: string) {
    if (!isSupabaseConfigured()) return;

    if (this.channel) {
      supabase.removeChannel(this.channel);
    }

    this.channel = supabase
      .channel(`game:${coupleId}`)
      .on('broadcast', { event: 'game_event' }, (response) => {
        const payload = response.payload as GameEventPayload;
        if (payload.senderId !== currentUserId) {
          this.handleIncomingEvent(payload);
        }
      })
      .subscribe();
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
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'game_event',
        payload: {
          type,
          senderId,
          coupleId,
          data
        }
      });
    }
  }
}

export const gameService = new GameService();
export default gameService;
