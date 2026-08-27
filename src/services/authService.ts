import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { CoupleSpace, PairingState } from '../types';

const PAIRING_STORAGE_KEY = 'mikayala_couple_pairing_state';

/**
 * Generates a memorable 6-character formatted pairing code (e.g. "MIK-7842")
 */
export function generatePairingCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let randomPart = '';
  for (let i = 0; i < 4; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `MIK-${randomPart}`;
}

/**
 * Retrieves the stored local pairing state
 */
export function getStoredPairingState(): PairingState {
  try {
    const saved = localStorage.getItem(PAIRING_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (err) {
    console.error('[authService] Error reading pairing state:', err);
  }
  return { isPaired: false };
}

/**
 * Persists the local pairing state
 */
export function saveStoredPairingState(state: PairingState): void {
  try {
    localStorage.setItem(PAIRING_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event('mikayala_pairing_changed'));
  } catch (err) {
    console.error('[authService] Error saving pairing state:', err);
  }
}

/**
 * Clears the pairing state (for reset / re-pair)
 */
export function clearPairingState(): void {
  try {
    localStorage.removeItem(PAIRING_STORAGE_KEY);
    window.dispatchEvent(new Event('mikayala_pairing_changed'));
  } catch (err) {
    console.error('[authService] Error clearing pairing state:', err);
  }
}

/**
 * Initializes anonymous authentication via Supabase signInAnonymously()
 * If no session exists, signs in anonymously to obtain a valid JWT & user ID.
 */
export async function initAnonymousAuth(): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase n'est pas configuré. Veuillez définir les variables d'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY."
    );
  }

  try {
    // Check if an active session already exists
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (!sessionErr && sessionData?.session?.user?.id) {
      return sessionData.session.user.id;
    }

    // Otherwise sign in anonymously
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      console.error('[authService] signInAnonymously error:', error.message);
      throw new Error(`Échec de la connexion anonyme Supabase : ${error.message}`);
    }

    if (data?.user?.id) {
      return data.user.id;
    }

    throw new Error("Aucun identifiant utilisateur retourné par Supabase.");
  } catch (err: any) {
    console.error('[authService] Exception in initAnonymousAuth:', err);
    throw err;
  }
}

/**
 * Creates a new Couple Space via the Supabase SQL RPC function 'create_couple'
 * Retries up to 5 times if a code collision occurs.
 */
export async function createCoupleSpace(): Promise<{ couple: CoupleSpace; pairingCode: string }> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase n'est pas configuré. Veuillez renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans les paramètres."
    );
  }

  // Ensure user is authenticated anonymously
  const userId = await initAnonymousAuth();

  const maxRetries = 5;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const pairingCode = generatePairingCode();

    try {
      const { data, error } = await supabase.rpc('create_couple', {
        requested_code: pairingCode
      });

      if (error) {
        lastError = new Error(error.message);
        const errLower = (error.message || '').toLowerCase();
        const isCollision =
          errLower.includes('already exists') ||
          errLower.includes('unique') ||
          errLower.includes('duplicate') ||
          error.code === '23505';

        if (isCollision && attempt < maxRetries) {
          continue; // Retry with a newly generated code
        }

        throw new Error(`Erreur lors de la création du couple (${error.message})`);
      }

      if (!data) {
        throw new Error("Aucune donnée retournée par la fonction RPC create_couple.");
      }

      // Format response from Supabase RPC
      const row = typeof data === 'object' ? (Array.isArray(data) ? data[0] : data) : {};
      const coupleId = row.id || row.couple_id || (typeof data === 'string' ? data : null);

      if (!coupleId) {
        throw new Error("Identifiant UUID de couple non retourné par Supabase.");
      }

      const coupleObj: CoupleSpace = {
        id: coupleId,
        pairingCode: row.pairing_code || pairingCode,
        user1Id: row.user1_id || userId,
        user2Id: row.user2_id || undefined,
        status: (row.status as 'waiting' | 'paired') || 'waiting',
        createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
      };

      // Save valid Supabase couple state locally
      saveStoredPairingState({
        isPaired: false,
        coupleId: coupleObj.id,
        pairingCode: coupleObj.pairingCode,
        role: 'user1'
      });

      return {
        couple: coupleObj,
        pairingCode: coupleObj.pairingCode
      };
    } catch (err: any) {
      if (attempt === maxRetries) {
        throw err;
      }
      lastError = err;
    }
  }

  throw lastError || new Error("Impossible de créer l'espace après plusieurs tentatives.");
}

/**
 * Joins an existing Couple Space via the Supabase SQL RPC function 'join_couple'
 */
export async function joinCoupleSpace(
  inputCode: string
): Promise<{ success: boolean; couple?: CoupleSpace; error?: string }> {
  const cleanCode = inputCode.trim().toUpperCase();
  if (!cleanCode) {
    return { success: false, error: 'Veuillez saisir un code de jumelage valide (ex: MIK-4829).' };
  }

  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: "Supabase n'est pas configuré. Veuillez renseigner VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY dans les paramètres."
    };
  }

  try {
    const currentUserId = await initAnonymousAuth();

    const { data, error } = await supabase.rpc('join_couple', {
      requested_code: cleanCode
    });

    if (error) {
      const errLower = (error.message || '').toLowerCase();
      let userFriendlyMsg = error.message;

      if (
        errLower.includes('not found') ||
        errLower.includes('introuvable') ||
        errLower.includes('invalid') ||
        errLower.includes('invalide') ||
        errLower.includes('aucun')
      ) {
        userFriendlyMsg = 'Code introuvable ou expiré. Vérifiez le code avec votre partenaire.';
      } else if (
        errLower.includes('full') ||
        errLower.includes('complet') ||
        errLower.includes('already paired') ||
        errLower.includes('déjà')
      ) {
        userFriendlyMsg = 'Cet espace de couple est déjà complet.';
      } else if (
        errLower.includes('own') ||
        errLower.includes('creator') ||
        errLower.includes('même utilisateur') ||
        errLower.includes('self')
      ) {
        userFriendlyMsg = 'Vous êtes déjà le créateur de cet espace.';
      }

      return {
        success: false,
        error: userFriendlyMsg
      };
    }

    if (!data) {
      return {
        success: false,
        error: "Aucune réponse reçue du serveur lors de la validation du code."
      };
    }

    const row = typeof data === 'object' ? (Array.isArray(data) ? data[0] : data) : {};
    const coupleId = row.id || row.couple_id;

    if (!coupleId) {
      return {
        success: false,
        error: "L'identifiant UUID de couple n'a pas été retourné par Supabase."
      };
    }

    const now = Date.now();
    const coupleSpace: CoupleSpace = {
      id: coupleId,
      pairingCode: row.pairing_code || cleanCode,
      user1Id: row.user1_id || '',
      user2Id: row.user2_id || currentUserId,
      status: 'paired',
      createdAt: row.created_at ? new Date(row.created_at).getTime() : now,
      pairedAt: row.paired_at ? new Date(row.paired_at).getTime() : now
    };

    // Save validated pairing state locally
    saveStoredPairingState({
      isPaired: true,
      coupleId: coupleSpace.id,
      pairingCode: coupleSpace.pairingCode,
      role: 'user2',
      partnerId: coupleSpace.user1Id,
      pairedAt: coupleSpace.pairedAt
    });

    return { success: true, couple: coupleSpace };
  } catch (err: any) {
    console.error('[authService] Exception in joinCoupleSpace:', err);
    return {
      success: false,
      error: err.message || "Erreur de connexion au serveur Supabase."
    };
  }
}

/**
 * Subscribes to real-time Postgres updates on the 'couples' table
 * to notify the space creator as soon as the partner joins.
 */
export function subscribeToCouplePairing(
  coupleId: string,
  onPaired: (couple: CoupleSpace) => void
): () => void {
  if (!isSupabaseConfigured() || !coupleId) {
    return () => {};
  }

  const channelName = `couple-pairing-${coupleId}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'couples',
        filter: `id=eq.${coupleId}`
      },
      (payload) => {
        try {
          if (payload.new && payload.new.status === 'paired') {
            const updatedCouple: CoupleSpace = {
              id: payload.new.id,
              pairingCode: payload.new.pairing_code,
              user1Id: payload.new.user1_id,
              user2Id: payload.new.user2_id,
              status: 'paired',
              createdAt: new Date(payload.new.created_at).getTime(),
              pairedAt: payload.new.paired_at ? new Date(payload.new.paired_at).getTime() : Date.now()
            };

            // Update local state for creator
            saveStoredPairingState({
              isPaired: true,
              coupleId: updatedCouple.id,
              pairingCode: updatedCouple.pairingCode,
              role: 'user1',
              partnerId: updatedCouple.user2Id,
              pairedAt: updatedCouple.pairedAt
            });

            onPaired(updatedCouple);
          }
        } catch (e) {
          console.error('[authService] Error parsing couple update:', e);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Fetches confirmed couple space directly from Supabase to guarantee fresh partnerId
 */
export async function fetchActiveCoupleFromSupabase(currentUserId: string): Promise<CoupleSpace | null> {
  if (!isSupabaseConfigured() || !currentUserId) return null;

  try {
    const { data, error } = await supabase
      .from('couples')
      .select('*')
      .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
      .eq('status', 'paired')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    const partnerId = data.user1_id === currentUserId ? data.user2_id : data.user1_id;
    const couple: CoupleSpace = {
      id: data.id,
      pairingCode: data.pairing_code,
      user1Id: data.user1_id,
      user2Id: data.user2_id,
      status: data.status,
      createdAt: new Date(data.created_at).getTime(),
      pairedAt: data.paired_at ? new Date(data.paired_at).getTime() : Date.now()
    };

    if (partnerId) {
      saveStoredPairingState({
        isPaired: true,
        coupleId: couple.id,
        pairingCode: couple.pairingCode,
        role: data.user1_id === currentUserId ? 'user1' : 'user2',
        partnerId: partnerId,
        pairedAt: couple.pairedAt
      });
    }

    return couple;
  } catch (err) {
    console.debug('[authService] Could not fetch active couple from Supabase:', err);
    return null;
  }
}

export default {
  initAnonymousAuth,
  createCoupleSpace,
  joinCoupleSpace,
  subscribeToCouplePairing,
  fetchActiveCoupleFromSupabase,
  getStoredPairingState,
  saveStoredPairingState,
  clearPairingState,
  generatePairingCode
};
