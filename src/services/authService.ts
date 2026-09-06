import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { CoupleSpace, PairingState, UserProfile, PartnerNickname } from '../types';

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
  generatePairingCode,

  /**
   * Links an email to the current anonymous account.
   * This converts the anonymous account into a permanent one.
   * Supabase will send a confirmation email to the provided address.
   */
  async linkEmailToAccount(email: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: "Supabase n'est pas configuré." };
    }
    try {
      const { error } = await supabase.auth.updateUser({ email });
      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Une erreur inconnue est survenue." };
    }
  },

  /**
   * Checks if the current user is anonymous.
   */
  async isAnonymous(): Promise<boolean> {
    if (!isSupabaseConfigured()) return true;
    const { data: { user } } = await supabase.auth.getUser();
    return !user || user.is_anonymous === true || (!user.email && !user.phone);
  },

  /**
   * Checks if the current user has a confirmed email.
   */
  async isEmailConfirmed(): Promise<boolean> {
    if (!isSupabaseConfigured()) return false;
    const { data: { user } } = await supabase.auth.getUser();
    return !!(user?.email && user?.email_confirmed_at);
  },

  /**
   * Sends a Magic Link to the provided email address for reconnection.
   */
  async sendMagicLink(email: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: "Supabase n'est pas configuré." };
    }
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
          shouldCreateUser: false // Important: only allow sign in for existing users in recovery flow
        },
      });
      if (error) {
        if (error.message.includes('User not found') || error.status === 400) {
          return { success: false, error: "Aucun compte trouvé avec cet e-mail. Avez-vous bien lié votre compte dans les paramètres ?" };
        }
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Une erreur inconnue est survenue." };
    }
  },

  /**
   * Gets the current user's email if it is confirmed.
   */
  async getCurrentUserEmail(): Promise<string | null> {
    if (!isSupabaseConfigured()) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email && user?.email_confirmed_at) {
      return user.email;
    }
    return null;
  },

  /**
   * Gets the unconfirmed email if it exists (pending verification).
   */
  async getPendingEmail(): Promise<string | null> {
    if (!isSupabaseConfigured()) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.new_email) return user.new_email;
    if (user?.email && !user?.email_confirmed_at) return user.email;
    return null;
  }
};

/**
 * Récupère et transfère un espace couple existant sur un nouvel appareil (téléphone, tablette)
 * Fonctionne avec le Code Couple (ex: MIK-7842) ou l'identifiant UUID de l'espace.
 */
export async function restoreCoupleSpaceOnNewDevice(
  codeOrId: string,
  targetRole: 'user1' | 'user2' = 'user1',
  userName?: string
): Promise<{ success: boolean; couple?: CoupleSpace; error?: string }> {
  const cleanInput = codeOrId.trim().toUpperCase();
  if (!cleanInput) {
    return { success: false, error: "Veuillez entrer votre Code Couple ou Identifiant d'espace." };
  }

  if (!isSupabaseConfigured()) {
    // Mode hors-ligne / local
    saveStoredPairingState({
      isPaired: true,
      coupleId: cleanInput,
      pairingCode: cleanInput,
      role: targetRole,
      pairedAt: Date.now()
    });
    return { success: true };
  }

  try {
    const currentUserId = await initAnonymousAuth();

    // 1. Rechercher l'espace couple par pairing_code ou id
    let query = supabase.from('couples').select('*');
    if (cleanInput.startsWith('MIK-')) {
      query = query.eq('pairing_code', cleanInput);
    } else {
      query = query.or(`id.eq.${cleanInput.toLowerCase()},pairing_code.eq.${cleanInput}`);
    }

    const { data, error } = await query.maybeSingle();

    if (error && !data) {
      console.warn('[authService] Direct query couple error:', error.message);
    }

    const coupleRow = data;
    const coupleId = coupleRow?.id || (cleanInput.includes('-') && cleanInput.length > 20 ? cleanInput.toLowerCase() : null);

    if (!coupleId && !coupleRow) {
      return {
        success: false,
        error: "Espace couple introuvable. Vérifiez votre Code Couple (ex: MIK-7842) ou l'identifiant unique."
      };
    }

    const effectiveCoupleId = coupleId || cleanInput.toLowerCase();

    // 2. Mettre à jour l'utilisateur correspondant dans public.couples
    if (coupleRow) {
      try {
        const updatePayload = targetRole === 'user1' 
          ? { user1_id: currentUserId, status: 'paired' } 
          : { user2_id: currentUserId, status: 'paired' };

        await supabase
          .from('couples')
          .update(updatePayload)
          .eq('id', coupleRow.id);
      } catch (upErr) {
        console.warn('[authService] Error updating couple row on device transfer:', upErr);
      }
    }

    // 3. Sauvegarder l'état de jumelage restauré sur ce nouveau téléphone
    const partnerId = targetRole === 'user1' ? (coupleRow?.user2_id || '') : (coupleRow?.user1_id || '');
    const restoredState: PairingState = {
      isPaired: true,
      coupleId: effectiveCoupleId,
      pairingCode: coupleRow?.pairing_code || (cleanInput.startsWith('MIK-') ? cleanInput : undefined),
      role: targetRole,
      partnerId: partnerId,
      pairedAt: coupleRow?.paired_at ? new Date(coupleRow.paired_at).getTime() : Date.now()
    };

    saveStoredPairingState(restoredState);

    // 4. Diffuser l'événement de transfert/reconnexion sur le canal broadcast du couple
    try {
      const bc = new BroadcastChannel(`couple-sync-${effectiveCoupleId}`);
      bc.postMessage({
        type: 'device_transferred',
        role: targetRole,
        newUserId: currentUserId,
        userName
      });
      bc.close();
    } catch (_) {}

    const coupleSpace: CoupleSpace = {
      id: effectiveCoupleId,
      pairingCode: coupleRow?.pairing_code || cleanInput,
      user1Id: targetRole === 'user1' ? currentUserId : (coupleRow?.user1_id || ''),
      user2Id: targetRole === 'user2' ? currentUserId : (coupleRow?.user2_id || ''),
      status: 'paired',
      createdAt: coupleRow?.created_at ? new Date(coupleRow.created_at).getTime() : Date.now(),
      pairedAt: Date.now()
    };

    return { success: true, couple: coupleSpace };
  } catch (err: any) {
    console.error('[authService] restoreCoupleSpace error:', err);
    return {
      success: false,
      error: err.message || "Erreur lors de la récupération de l'espace."
    };
  }
}

