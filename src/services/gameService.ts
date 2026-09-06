import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface GameEventPayload {
  type: 'roll_dice' | 'spin_wheel' | 'draw_tod' | 'game_start' | 'game_state_update' | 'challenge_completed' | 'sync_challenges' | 'sync_dice_config';
  senderId: string;
  coupleId: string;
  data: any;
}

export type GameEventCallback = (payload: GameEventPayload) => void;

export interface GameSession {
  id: string;
  couple_id: string;
  game_type: 'blind_quiz' | 'scratch_card' | 'intimate_dice' | 'challenge_wheel' | 'truth_or_dare' | string;
  state: any;
  created_at?: string;
  updated_at?: string;
}

export type GameSessionCallback = (session: GameSession) => void;

class GameService {
  private channel: any = null;
  private dbRealtimeChannel: any = null;
  private localBroadcastChannel: BroadcastChannel | null = null;
  private onGameEventCallback: GameEventCallback | null = null;
  private onSessionUpdateCallback: GameSessionCallback | null = null;
  private activeSessionsInMemory: Map<string, GameSession> = new Map();
  private currentUserId: string = '';
  private coupleId: string = '';

  public setup(coupleId: string, currentUserId: string, onSessionUpdate?: GameSessionCallback) {
    this.coupleId = coupleId;
    this.currentUserId = currentUserId;
    if (onSessionUpdate) {
      this.onSessionUpdateCallback = onSessionUpdate;
    }

    // 1. Cross-tab BroadcastChannel for immediate offline/local updates
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        if (this.localBroadcastChannel) {
          this.localBroadcastChannel.close();
        }
        this.localBroadcastChannel = new BroadcastChannel(`mikayala_game_channel_${coupleId || 'local'}`);
        this.localBroadcastChannel.onmessage = (event) => {
          const data = event.data;
          if (data?.session) {
            const session = data.session as GameSession;
            this.activeSessionsInMemory.set(session.id, session);
            if (this.onSessionUpdateCallback) {
              this.onSessionUpdateCallback(session);
            }
          } else if (data?.type && data.senderId !== this.currentUserId) {
            this.handleIncomingEvent(data as GameEventPayload);
          }
        };
      }
    } catch (e) {
      console.warn('[GameService] BroadcastChannel setup warning:', e);
    }

    // 2. Supabase Realtime Broadcast channel (for ultra-low latency direct actions)
    if (isSupabaseConfigured() && coupleId) {
      if (this.channel) {
        supabase.removeChannel(this.channel);
      }

      this.channel = supabase
        .channel(`game_broadcast:${coupleId}`)
        .on('broadcast', { event: 'game_event' }, (response) => {
          const payload = response.payload as GameEventPayload;
          if (payload && payload.senderId !== this.currentUserId) {
            this.handleIncomingEvent(payload);
          }
        })
        .subscribe();

      // 3. Supabase Realtime Database Changes on game_sessions table
      if (this.dbRealtimeChannel) {
        supabase.removeChannel(this.dbRealtimeChannel);
      }

      this.dbRealtimeChannel = supabase
        .channel(`game_sessions_realtime_all:${coupleId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'game_sessions',
            filter: `couple_id=eq.${coupleId}`
          },
          (payload) => {
            const newRow = payload.new as any;
            if (newRow && newRow.id) {
              const session: GameSession = {
                id: newRow.id,
                couple_id: newRow.couple_id,
                game_type: newRow.game_type,
                state: typeof newRow.state === 'string' ? JSON.parse(newRow.state) : (newRow.state || {}),
                created_at: newRow.created_at,
                updated_at: newRow.updated_at
              };
              this.activeSessionsInMemory.set(session.id, session);
              console.log('[Game] État synchronisé', { sessionId: session.id, gameType: session.game_type, status: session.state?.status });
              if (this.onSessionUpdateCallback) {
                this.onSessionUpdateCallback(session);
              }
            }
          }
        )
        .subscribe();
    }
  }

  public setOnGameEvent(callback: GameEventCallback) {
    this.onGameEventCallback = callback;
  }

  public setOnSessionUpdate(callback: GameSessionCallback) {
    this.onSessionUpdateCallback = callback;
  }

  private handleIncomingEvent(payload: GameEventPayload) {
    if (this.onGameEventCallback) {
      this.onGameEventCallback(payload);
    }
  }

  /**
   * Creates a new game session in game_sessions
   */
  public async createSession(
    coupleId: string,
    gameType: 'blind_quiz' | 'scratch_card' | 'intimate_dice' | 'challenge_wheel' | 'truth_or_dare' | string,
    initialState: any = {}
  ): Promise<GameSession> {
    const sessionId = `gs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullInitialState = {
      status: 'in_progress',
      startedAt: Date.now(),
      ...initialState
    };

    const newSession: GameSession = {
      id: sessionId,
      couple_id: coupleId,
      game_type: gameType,
      state: fullInitialState,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.activeSessionsInMemory.set(sessionId, newSession);

    // Persist to Supabase
    if (isSupabaseConfigured() && coupleId) {
      try {
        const { data, error } = await supabase
          .from('game_sessions')
          .insert({
            couple_id: coupleId,
            game_type: gameType,
            state: fullInitialState
          })
          .select()
          .single();

        if (error) {
          console.warn('[Game] Error inserting game_sessions into Supabase:', error.message);
        } else if (data) {
          newSession.id = data.id;
          newSession.created_at = data.created_at;
          newSession.updated_at = data.updated_at;
          this.activeSessionsInMemory.set(newSession.id, newSession);
        }
      } catch (err) {
        console.warn('[Game] Exception inserting game_session:', err);
      }
    }

    // Required Log
    console.log('[Game] Session créée', { sessionId: newSession.id, coupleId, gameType });

    this.broadcastSession(newSession);
    return newSession;
  }

  /**
   * Updates state of an active session
   */
  public async updateSessionState(
    sessionId: string,
    coupleId: string,
    stateUpdate: any
  ): Promise<GameSession> {
    let existing = this.activeSessionsInMemory.get(sessionId);
    if (!existing) {
      existing = {
        id: sessionId,
        couple_id: coupleId,
        game_type: stateUpdate.game_type || 'custom',
        state: stateUpdate
      };
    }

    const mergedState = {
      ...(typeof existing.state === 'object' ? existing.state : {}),
      ...stateUpdate,
      lastUpdatedAt: Date.now()
    };

    const updatedSession: GameSession = {
      ...existing,
      state: mergedState,
      updated_at: new Date().toISOString()
    };

    this.activeSessionsInMemory.set(sessionId, updatedSession);

    // Persist in Supabase
    if (isSupabaseConfigured() && sessionId && !sessionId.startsWith('gs_')) {
      try {
        const { error } = await supabase
          .from('game_sessions')
          .update({
            state: mergedState,
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);

        if (error) {
          console.warn('[Game] Error updating game_sessions:', error.message);
        }
      } catch (err) {
        console.warn('[Game] Exception updating game_session:', err);
      }
    }

    // Required Log
    console.log('[Game] État synchronisé', { sessionId, gameType: updatedSession.game_type });

    this.broadcastSession(updatedSession);
    return updatedSession;
  }

  /**
   * Marks a game session as finished
   */
  public async finishGame(
    sessionId: string,
    coupleId: string,
    summaryData?: any
  ): Promise<GameSession> {
    const res = await this.updateSessionState(sessionId, coupleId, {
      status: 'finished',
      completedAt: Date.now(),
      summary: summaryData
    });

    // Required Log
    console.log('[Game] Jeu terminé', { sessionId, gameType: res.game_type, summary: summaryData });
    return res;
  }

  private broadcastSession(session: GameSession) {
    try {
      if (this.localBroadcastChannel) {
        this.localBroadcastChannel.postMessage({ session });
      }
    } catch (e) {}

    if (this.onSessionUpdateCallback) {
      this.onSessionUpdateCallback(session);
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
    if (this.dbRealtimeChannel) {
      supabase.removeChannel(this.dbRealtimeChannel);
      this.dbRealtimeChannel = null;
    }
    this.onGameEventCallback = null;
    this.onSessionUpdateCallback = null;
  }
}

export const gameService = new GameService();
export default gameService;
