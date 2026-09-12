import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getStoredPairingState } from './authService';
import { getStoredUserProfile } from '../utils/storage';
import { PairingState } from '../types';

export interface DeviceAuthRequest {
  id: string;
  couple_id: string;
  requesting_device_id: string;
  target_user_id: string;
  target_role: 'user1' | 'user2';
  device_name: string;
  status: 'pending' | 'approved' | 'rejected';
  auth_payload?: {
    pairingState: PairingState;
    userProfile?: any;
  };
  created_at: string;
  expires_at: string;
}

/**
 * Génère ou récupère un ID unique et persistant pour l'appareil courant
 */
export function getDeviceId(): string {
  let devId = localStorage.getItem('mikayla_device_unique_id');
  if (!devId) {
    devId = 'dev_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    localStorage.setItem('mikayla_device_unique_id', devId);
  }
  return devId;
}

/**
 * Détecte le type d'appareil de manière lisible (ex: "iPad", "iPhone", "Mac", "Tablette Android")
 */
export function getDeviceReadableName(): string {
  const ua = navigator.userAgent || '';
  if (/iPad|tablet/i.test(ua)) return 'Tablette';
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/Android/i.test(ua)) return 'Android';
  if (/Macintosh|Mac OS/i.test(ua)) return 'Mac / Ordinateur';
  if (/Windows/i.test(ua)) return 'PC Windows';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Appareil Connecté';
}

/**
 * [Sur la Tablette / Nouvel appareil]
 * Crée une demande d'approbation à destination du téléphone principal du profil choisi
 */
export async function createDeviceApprovalRequest(
  coupleId: string,
  targetUserId: string,
  targetRole: 'user1' | 'user2'
): Promise<{ success: boolean; requestId?: string; error?: string }> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: "Supabase n'est pas configuré." };
  }

  const deviceId = getDeviceId();
  const deviceName = getDeviceReadableName();

  try {
    const { data, error } = await supabase
      .from('device_authorizations')
      .insert({
        couple_id: coupleId,
        requesting_device_id: deviceId,
        target_user_id: targetUserId,
        target_role: targetRole,
        device_name: deviceName,
        status: 'pending'
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('[deviceSync] Error creating approval request:', error);
      return { success: false, error: error?.message || "Impossible d'envoyer la demande." };
    }

    return { success: true, requestId: data.id };
  } catch (err: any) {
    console.error('[deviceSync] Exception creating approval request:', err);
    return { success: false, error: err.message || "Erreur inattendue." };
  }
}

/**
 * [Sur la Tablette / Nouvel appareil]
 * Écoute la réponse d'approbation du téléphone principal en temps réel
 */
export function listenForDeviceApproval(
  requestId: string,
  onApproved: (authPayload: { pairingState: PairingState; userProfile?: any }) => void,
  onRejected: () => void
): () => void {
  if (!isSupabaseConfigured() || !requestId) return () => {};

  const channel = supabase
    .channel(`device_auth_${requestId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'device_authorizations',
        filter: `id=eq.${requestId}`
      },
      (payload) => {
        const updated = payload.new as DeviceAuthRequest;
        if (updated.status === 'approved' && updated.auth_payload) {
          onApproved(updated.auth_payload);
        } else if (updated.status === 'rejected') {
          onRejected();
        }
      }
    )
    .subscribe();

  // Fallback Polling au cas où les WebSockets ont un délai
  const interval = setInterval(async () => {
    try {
      const { data } = await supabase
        .from('device_authorizations')
        .select('*')
        .eq('id', requestId)
        .maybeSingle();

      if (data) {
        if (data.status === 'approved' && data.auth_payload) {
          clearInterval(interval);
          onApproved(data.auth_payload);
        } else if (data.status === 'rejected') {
          clearInterval(interval);
          onRejected();
        }
      }
    } catch (_) {}
  }, 3000);

  return () => {
    clearInterval(interval);
    supabase.removeChannel(channel);
  };
}

/**
 * [Sur le Téléphone Principal]
 * Écoute les demandes entrantes d'autorisation d'un nouvel appareil ciblant cet utilisateur
 */
export function listenForIncomingDeviceRequests(
  targetUserId: string,
  onRequestReceived: (req: DeviceAuthRequest) => void
): () => void {
  if (!isSupabaseConfigured() || !targetUserId) return () => {};

  const channel = supabase
    .channel(`incoming_dev_requests_${targetUserId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'device_authorizations',
        filter: `target_user_id=eq.${targetUserId}`
      },
      (payload) => {
        const newReq = payload.new as DeviceAuthRequest;
        if (newReq.status === 'pending') {
          onRequestReceived(newReq);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * [Sur le Téléphone Principal]
 * Approuve la connexion de la tablette et lui transmet l'état de session sécurisé
 */
export async function approveDeviceRequest(
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { success: false, error: "Non connecté à Supabase" };

  const pairingState = getStoredPairingState();
  const userProfile = getStoredUserProfile();

  try {
    const { error } = await supabase
      .from('device_authorizations')
      .update({
        status: 'approved',
        auth_payload: {
          pairingState,
          userProfile
        }
      })
      .eq('id', requestId);

    if (error) {
      console.error('[deviceSync] Error approving device:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * [Sur le Téléphone Principal]
 * Refuse la connexion
 */
export async function rejectDeviceRequest(requestId: string): Promise<{ success: boolean }> {
  if (!isSupabaseConfigured()) return { success: false };

  try {
    await supabase
      .from('device_authorizations')
      .update({ status: 'rejected' })
      .eq('id', requestId);
    return { success: true };
  } catch (_) {
    return { success: false };
  }
}
