import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface ScratchCardContent {
  title: string;
  secretContent: string;
  secretMediaUrl?: string;
  scratchColor?: 'gold' | 'silver' | 'ruby' | 'emerald';
}

export interface ScratchCardSessionState {
  status: 'created' | 'scratched';
  content: ScratchCardContent;
  createdBy: string;
  scratchedBy: string | null;
}

export interface ScratchCardSession {
  id: string;
  couple_id: string;
  game_type: 'scratch_card';
  state: ScratchCardSessionState;
  created_at?: string;
  updated_at?: string;
}

class ScratchCardService {
  private realtimeChannel: any = null;
  private localBroadcastChannel: BroadcastChannel | null = null;
  private onSessionUpdateCallback: ((session: ScratchCardSession) => void) | null = null;
  private activeSessionsInMemory: Map<string, ScratchCardSession> = new Map();

  /**
   * Sets up Realtime database subscription & local BroadcastChannel for a couple's scratch card sessions
   */
  public setup(coupleId: string, onUpdate?: (session: ScratchCardSession) => void) {
    if (onUpdate) {
      this.onSessionUpdateCallback = onUpdate;
    }

    // 1. Cross-tab BroadcastChannel for instant local cross-tab sync
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        if (this.localBroadcastChannel) {
          this.localBroadcastChannel.close();
        }
        this.localBroadcastChannel = new BroadcastChannel(`mikayla_scratch_${coupleId || 'local'}`);
        this.localBroadcastChannel.onmessage = (event) => {
          const session = event.data as ScratchCardSession;
          if (session && session.id) {
            this.activeSessionsInMemory.set(session.id, session);
            if (this.onSessionUpdateCallback) {
              this.onSessionUpdateCallback(session);
            }
          }
        };
      }
    } catch (e) {
      console.warn('[Scratch] BroadcastChannel setup warning:', e);
    }

    // 2. Supabase Realtime Database Changes on game_sessions table
    if (isSupabaseConfigured() && coupleId) {
      if (this.realtimeChannel) {
        supabase.removeChannel(this.realtimeChannel);
      }

      this.realtimeChannel = supabase
        .channel(`game_sessions_scratch:${coupleId}`)
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
            if (newRow && newRow.game_type === 'scratch_card') {
              const session: ScratchCardSession = {
                id: newRow.id,
                couple_id: newRow.couple_id,
                game_type: 'scratch_card',
                state: typeof newRow.state === 'string' ? JSON.parse(newRow.state) : newRow.state,
                created_at: newRow.created_at,
                updated_at: newRow.updated_at
              };
              this.activeSessionsInMemory.set(session.id, session);
              if (this.onSessionUpdateCallback) {
                this.onSessionUpdateCallback(session);
              }
            }
          }
        )
        .subscribe();
    }
  }

  /**
   * Creates a new scratch card session in game_sessions
   */
  public async createScratchSession(
    coupleId: string,
    createdByUserId: string,
    content: ScratchCardContent
  ): Promise<ScratchCardSession> {
    const sessionId = `sc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const initialState: ScratchCardSessionState = {
      status: 'created',
      content,
      createdBy: createdByUserId,
      scratchedBy: null
    };

    const newSession: ScratchCardSession = {
      id: sessionId,
      couple_id: coupleId,
      game_type: 'scratch_card',
      state: initialState,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.activeSessionsInMemory.set(sessionId, newSession);

    // Persist to Supabase if configured
    if (isSupabaseConfigured() && coupleId) {
      try {
        const { data, error } = await supabase
          .from('game_sessions')
          .insert({
            couple_id: coupleId,
            game_type: 'scratch_card',
            state: initialState
          })
          .select()
          .single();

        if (error) {
          console.warn('[Scratch] Error inserting scratch session into Supabase:', error.message);
        } else if (data) {
          newSession.id = data.id;
          newSession.created_at = data.created_at;
          newSession.updated_at = data.updated_at;
          this.activeSessionsInMemory.set(newSession.id, newSession);
        }
      } catch (err) {
        console.warn('[Scratch] Exception inserting scratch session:', err);
      }
    }

    // Required Log
    console.log('[Scratch] Carte créée', { sessionId: newSession.id, coupleId, createdBy: createdByUserId });

    this.broadcastSessionUpdate(newSession);
    return newSession;
  }

  /**
   * Marks a scratch card as scratched by a user
   */
  public async markCardAsScratched(
    sessionId: string,
    coupleId: string,
    scratchedByUserId: string
  ): Promise<ScratchCardSession> {
    let existingSession = this.activeSessionsInMemory.get(sessionId);

    // If not in memory, fetch from Supabase
    if (!existingSession && isSupabaseConfigured() && sessionId) {
      try {
        const { data } = await supabase
          .from('game_sessions')
          .select('*')
          .eq('id', sessionId)
          .maybeSingle();

        if (data) {
          existingSession = {
            id: data.id,
            couple_id: data.couple_id,
            game_type: 'scratch_card',
            state: typeof data.state === 'string' ? JSON.parse(data.state) : data.state,
            created_at: data.created_at,
            updated_at: data.updated_at
          };
        }
      } catch (e) {
        console.warn('[Scratch] Error fetching session:', e);
      }
    }

    if (!existingSession) {
      existingSession = {
        id: sessionId,
        couple_id: coupleId,
        game_type: 'scratch_card',
        state: {
          status: 'created',
          content: { title: 'Surprise Secrète', secretContent: '' },
          createdBy: scratchedByUserId,
          scratchedBy: null
        }
      };
    }

    const updatedState: ScratchCardSessionState = {
      ...existingSession.state,
      status: 'scratched',
      scratchedBy: scratchedByUserId
    };

    const updatedSession: ScratchCardSession = {
      ...existingSession,
      state: updatedState,
      updated_at: new Date().toISOString()
    };

    this.activeSessionsInMemory.set(sessionId, updatedSession);

    // Required Logs
    console.log(`[Scratch] Carte grattée par ${scratchedByUserId}`, { sessionId });
    console.log('[Scratch] État synchronisé', { sessionId, status: 'scratched' });

    // Update in Supabase
    if (isSupabaseConfigured() && sessionId && !sessionId.startsWith('sc_')) {
      try {
        const { error } = await supabase
          .from('game_sessions')
          .update({
            state: updatedState,
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);

        if (error) {
          console.warn('[Scratch] Error updating scratch session in Supabase:', error.message);
        }
      } catch (err) {
        console.warn('[Scratch] Exception updating scratch session:', err);
      }
    }

    this.broadcastSessionUpdate(updatedSession);
    return updatedSession;
  }

  private broadcastSessionUpdate(session: ScratchCardSession) {
    try {
      if (this.localBroadcastChannel) {
        this.localBroadcastChannel.postMessage(session);
      }
    } catch (e) {
      console.warn('[Scratch] Broadcast channel error:', e);
    }

    if (this.onSessionUpdateCallback) {
      this.onSessionUpdateCallback(session);
    }
  }

  public cleanup() {
    if (this.localBroadcastChannel) {
      this.localBroadcastChannel.close();
      this.localBroadcastChannel = null;
    }
    if (this.realtimeChannel) {
      supabase.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
    this.onSessionUpdateCallback = null;
  }
}

export const scratchCardService = new ScratchCardService();
export default scratchCardService;
