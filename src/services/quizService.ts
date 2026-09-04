import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { BlindQuizQuestion, BlindQuizAnswer } from '../types';

export interface QuizSessionState {
  status: 'waiting' | 'in_progress' | 'finished';
  questionIndex: number;
  questions: BlindQuizQuestion[];
  answers: Record<string, Record<string, BlindQuizAnswer>>; // questionId -> userId -> answer
}

export interface QuizSession {
  id: string;
  couple_id: string;
  game_type: 'blind_quiz';
  state: QuizSessionState;
  created_at?: string;
  updated_at?: string;
}

export const DEFAULT_QUIZ_QUESTIONS: BlindQuizQuestion[] = [
  {
    id: 'quiz_q1',
    question: "Quel est le premier souvenir fort que tu gardes de nous deux ?",
    category: 'souvenirs',
    suggestedAnswers: ['Notre premier baiser', 'Notre premier voyage ensemble', 'Un fou rire inoubliable', 'Notre toute première rencontre'],
    answers: {},
    isRevealed: false
  },
  {
    id: 'quiz_q2',
    question: "Quel endroit rêvé aimerais-tu explorer uniquement tous les deux ?",
    category: 'futur',
    suggestedAnswers: ['Une cabane romantique sous les étoiles', 'Un road-trip au bout du monde', 'Une île paradisiaque', 'Une capitale romantique en amoureux'],
    answers: {},
    isRevealed: false
  },
  {
    id: 'quiz_q3',
    question: "Quelle petite attention de ma part te fait le plus fondre ?",
    category: 'romantisme',
    suggestedAnswers: ['Un câlin imprévu au réveil', 'Un petit mot doux caché', 'Quand tu me prépares une surprise', 'Un regard complice en public'],
    answers: {},
    isRevealed: false
  }
];

class QuizService {
  private realtimeChannel: any = null;
  private localBroadcastChannel: BroadcastChannel | null = null;
  private onSessionUpdateCallback: ((session: QuizSession) => void) | null = null;
  private activeSessionsInMemory: Map<string, QuizSession> = new Map();

  /**
   * Initializes Realtime subscription & BroadcastChannel for a couple's quiz sessions
   */
  public setup(coupleId: string, onUpdate?: (session: QuizSession) => void) {
    if (onUpdate) {
      this.onSessionUpdateCallback = onUpdate;
    }

    // 1. Cross-tab BroadcastChannel for immediate offline/local updates
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        if (this.localBroadcastChannel) {
          this.localBroadcastChannel.close();
        }
        this.localBroadcastChannel = new BroadcastChannel(`mikayla_quiz_${coupleId || 'local'}`);
        this.localBroadcastChannel.onmessage = (event) => {
          const session = event.data as QuizSession;
          if (session && session.id) {
            this.activeSessionsInMemory.set(session.id, session);
            if (this.onSessionUpdateCallback) {
              this.onSessionUpdateCallback(session);
            }
          }
        };
      }
    } catch (e) {
      console.warn('[Quiz] BroadcastChannel setup warning:', e);
    }

    // 2. Supabase Realtime Database Changes on game_sessions table
    if (isSupabaseConfigured() && coupleId) {
      if (this.realtimeChannel) {
        supabase.removeChannel(this.realtimeChannel);
      }

      this.realtimeChannel = supabase
        .channel(`game_sessions_realtime:${coupleId}`)
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
            if (newRow && newRow.game_type === 'blind_quiz') {
              const session: QuizSession = {
                id: newRow.id,
                couple_id: newRow.couple_id,
                game_type: 'blind_quiz',
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

  public setOnSessionUpdate(callback: (session: QuizSession) => void) {
    this.onSessionUpdateCallback = callback;
  }

  /**
   * Creates a new quiz session in game_sessions
   */
  public async createQuizSession(
    coupleId: string,
    initialQuestions?: BlindQuizQuestion[]
  ): Promise<QuizSession> {
    const sessionId = `qs_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const questionsToUse = (initialQuestions && initialQuestions.length > 0)
      ? initialQuestions
      : DEFAULT_QUIZ_QUESTIONS;

    const initialState: QuizSessionState = {
      status: 'waiting',
      questionIndex: 0,
      questions: questionsToUse,
      answers: {}
    };

    const newSession: QuizSession = {
      id: sessionId,
      couple_id: coupleId,
      game_type: 'blind_quiz',
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
            game_type: 'blind_quiz',
            state: initialState
          })
          .select()
          .single();

        if (error) {
          console.warn('[Quiz] Error inserting game_sessions into Supabase:', error.message);
        } else if (data) {
          newSession.id = data.id;
          newSession.created_at = data.created_at;
          newSession.updated_at = data.updated_at;
          this.activeSessionsInMemory.set(newSession.id, newSession);
        }
      } catch (err) {
        console.warn('[Quiz] Exception inserting game_session:', err);
      }
    }

    // Required Log
    console.log('[Quiz] Session créée', { sessionId: newSession.id, coupleId });

    this.broadcastSessionUpdate(newSession);
    return newSession;
  }

  /**
   * Saves or updates a user answer in game_sessions state
   */
  public async saveAnswerToSession(
    sessionId: string,
    coupleId: string,
    userId: string,
    questionId: string,
    answerText: string
  ): Promise<QuizSession> {
    let existingSession = this.activeSessionsInMemory.get(sessionId);

    // If not in memory, try fetching from Supabase
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
            game_type: 'blind_quiz',
            state: typeof data.state === 'string' ? JSON.parse(data.state) : data.state,
            created_at: data.created_at,
            updated_at: data.updated_at
          };
        }
      } catch (e) {
        console.warn('[Quiz] Error fetching session:', e);
      }
    }

    // Fallback if still not found
    if (!existingSession) {
      existingSession = {
        id: sessionId,
        couple_id: coupleId,
        game_type: 'blind_quiz',
        state: {
          status: 'waiting',
          questionIndex: 0,
          questions: DEFAULT_QUIZ_QUESTIONS,
          answers: {}
        }
      };
    }

    // Deep clone state
    const updatedState: QuizSessionState = JSON.parse(JSON.stringify(existingSession.state));
    if (!updatedState.answers) updatedState.answers = {};
    if (!updatedState.answers[questionId]) updatedState.answers[questionId] = {};

    updatedState.answers[questionId][userId] = {
      userId,
      answerText,
      answeredAt: Date.now()
    };

    // Check how many answers exist for this question
    const answersForCurrentQ = updatedState.answers[questionId] || {};
    const answersCount = Object.keys(answersForCurrentQ).length;

    // Required Log
    console.log('[Quiz] Réponse utilisateur mise à jour', { sessionId, userId, questionId, answersCount });

    // If both partners (2 users) answered this question:
    if (answersCount >= 2) {
      updatedState.status = 'finished';
      // Required Log
      console.log('[Quiz] Quiz terminé, état synchronisé', { sessionId, questionId });
    } else {
      updatedState.status = 'in_progress';
    }

    const updatedSession: QuizSession = {
      ...existingSession,
      state: updatedState,
      updated_at: new Date().toISOString()
    };

    this.activeSessionsInMemory.set(sessionId, updatedSession);

    // Persist update to Supabase
    if (isSupabaseConfigured() && sessionId && !sessionId.startsWith('qs_')) {
      try {
        const { error } = await supabase
          .from('game_sessions')
          .update({
            state: updatedState,
            updated_at: new Date().toISOString()
          })
          .eq('id', sessionId);

        if (error) {
          console.warn('[Quiz] Error updating game_sessions in Supabase:', error.message);
        }
      } catch (err) {
        console.warn('[Quiz] Exception updating game_session:', err);
      }
    }

    this.broadcastSessionUpdate(updatedSession);
    return updatedSession;
  }

  /**
   * Broadcasts session state across tabs & local listeners
   */
  private broadcastSessionUpdate(session: QuizSession) {
    try {
      if (this.localBroadcastChannel) {
        this.localBroadcastChannel.postMessage(session);
      }
    } catch (e) {
      console.warn('[Quiz] Broadcast channel error:', e);
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

export const quizService = new QuizService();
export default quizService;
