// WebAuthn Biometric & PIN Security Engine for Mikayla

export interface AuthResult {
  success: boolean;
  method: 'biometric' | 'pin' | 'bypass';
  error?: string;
}

const STORAGE_KEY_CRED_ID = 'mikayla_webauthn_credential_id';

// Base64 ArrayBuffer helpers for WebAuthn credential ID serialization
function bufferToBase64(buffer: ArrayBuffer): string {
  try {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  } catch {
    return '';
  }
}

function base64ToBuffer(base64: string): ArrayBuffer | null {
  try {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  } catch {
    return null;
  }
}

// Check if a biometric credential has already been registered on this device
export const hasRegisteredBiometrics = (): boolean => {
  try {
    return !!localStorage.getItem(STORAGE_KEY_CRED_ID);
  } catch {
    return false;
  }
};

// Reset stored credential if needed (e.g. when user changes biometric settings)
export const resetRegisteredBiometrics = () => {
  try {
    localStorage.removeItem(STORAGE_KEY_CRED_ID);
  } catch {
    // Ignore storage errors
  }
};

// Check if WebAuthn Platform Biometrics are supported and available
export const isBiometricsSupported = async (): Promise<boolean> => {
  try {
    if (typeof window === 'undefined') return false;
    if (
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    ) {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().catch(() => false);
    }
    return false;
  } catch {
    return false;
  }
};

// Request Biometric verification using WebAuthn API
// Uses navigator.credentials.get() when a credential exists to trigger instant fingerprint/FaceID
// WITHOUT displaying the intrusive Google "Créer une clé d'accès" popup
export const authenticateWithBiometrics = async (
  reason: string = 'Déverrouiller Mikayla'
): Promise<AuthResult> => {
  try {
    if (typeof window === 'undefined' || !window.PublicKeyCredential || !navigator.credentials) {
      return { success: false, method: 'biometric', error: 'Biométrie non disponible sur ce navigateur.' };
    }

    // Check if platform authenticator (fingerprint / FaceID / screen lock) is available
    const isPlatformAvailable = await isBiometricsSupported();
    if (!isPlatformAvailable) {
      return { success: false, method: 'biometric', error: 'Capteur biométrique non disponible.' };
    }

    const savedCredIdB64 = localStorage.getItem(STORAGE_KEY_CRED_ID);
    const savedCredBuffer = savedCredIdB64 ? base64ToBuffer(savedCredIdB64) : null;

    // SCENARIO 1: Credential already enrolled on this device
    // Use navigator.credentials.get() - this triggers the OS fingerprint/FaceID sensor directly!
    // NO "Créer une clé d'accès" Google sheet!
    if (savedCredBuffer) {
      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);

        const assertion = await navigator.credentials.get({
          publicKey: {
            challenge,
            rpId: window.location.hostname,
            allowCredentials: [
              {
                id: savedCredBuffer,
                type: 'public-key',
                transports: ['internal']
              }
            ],
            userVerification: 'required',
            timeout: 30000
          }
        });

        if (assertion) {
          return { success: true, method: 'biometric' };
        }
      } catch (getErr: any) {
        // If credential is no longer valid or removed from OS, clear it and fall through to re-enroll or PIN
        if (getErr?.name === 'NotAllowedError') {
          return { success: false, method: 'biometric', error: 'Vérification biométrique annulée.' };
        }
        // In other cases, clear the stale credential ID
        resetRegisteredBiometrics();
      }
    }

    // SCENARIO 2: First-time enrollment on this device
    // We register a local platform credential with residentKey: "discouraged"
    // to prevent Google Password Manager from prompting "Créer une clé d'accès"
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    const userId = new Uint8Array(16);
    window.crypto.getRandomValues(userId);

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Mikayla Sécurité',
          id: window.location.hostname
        },
        user: {
          id: userId,
          name: 'mikayla_partner',
          displayName: reason
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256
          { alg: -257, type: 'public-key' } // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'discouraged' // IMPORTANT: Avoids pushing Google Passkey sync modal
        },
        timeout: 30000,
        attestation: 'none'
      }
    })) as PublicKeyCredential | null;

    if (credential && credential.rawId) {
      const b64 = bufferToBase64(credential.rawId);
      if (b64) {
        localStorage.setItem(STORAGE_KEY_CRED_ID, b64);
      }
      return { success: true, method: 'biometric' };
    }

    return { success: false, method: 'biometric', error: 'Échec de l’enregistrement biométrique' };
  } catch (err: unknown) {
    const errorName = (err as Error)?.name;
    const errorMsg = (err as Error)?.message || 'Échec de la validation biométrique';

    // User cancelled the prompt or dismissed
    if (errorName === 'NotAllowedError' || errorName === 'AbortError') {
      return { success: false, method: 'biometric', error: 'Validation annulée' };
    }

    return { success: false, method: 'biometric', error: errorMsg };
  }
};

// Trigger Haptic Vibration with Custom Couple Patterns
export const triggerHaptic = (pattern: number | number[] = [80, 40, 80]) => {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Haptics safety ignore
  }
};

/**
 * Vibrations romantiques personnalisées pour le couple
 */
export const coupleVibrations = {
  heartbeat: () => triggerHaptic([100, 60, 200, 80, 300]),
  lovePulse: () => triggerHaptic([80, 40, 80, 40, 160]),
  whisper: () => triggerHaptic([40, 30, 40]),
  celebration: () => triggerHaptic([60, 40, 80, 40, 120, 60, 200]),
  unlockSuccess: () => triggerHaptic([30, 20, 60])
};

/**
 * PWA App Badge (Affichage du compteur de messages non lus sur l'icône de l'app)
 */
export const updateAppBadge = async (unreadCount: number): Promise<void> => {
  try {
    if (typeof navigator !== 'undefined') {
      if (unreadCount > 0 && 'setAppBadge' in navigator) {
        await (navigator as any).setAppBadge(unreadCount);
      } else if (unreadCount === 0 && 'clearAppBadge' in navigator) {
        await (navigator as any).clearAppBadge();
      }
    }
  } catch (err) {
    // Silently ignore badge errors on unsupported devices
  }
};

