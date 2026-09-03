import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { UserProfile, PartnerNickname } from '../types';

/**
 * Interface for the memory cache of signed URLs
 */
interface SignedUrlCacheItem {
  url: string;
  expiresAt: number;
}

const signedUrlCache: Record<string, SignedUrlCacheItem> = {};

/**
 * Service dedicated to personal profiles, avatars and private nicknames
 */
export const profileService = {
  // 1. Get my own profile
  async getMyProfile(retries = 3): Promise<{ success: boolean; data?: UserProfile; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase non configuré' };
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return { success: false, error: 'Non authentifié' };
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();
        
      if (error) {
        if (retries > 0 && error.message.includes('Failed to fetch')) {
          console.warn(`[profileService] Retrying getMyProfile... (${retries} left)`);
          await new Promise(r => setTimeout(r, 1000));
          return this.getMyProfile(retries - 1);
        }
        console.error('[profileService] Error fetching my profile:', error);
        return { success: false, error: error.message };
      }
      return { success: true, data: data as UserProfile };
    } catch (err: any) {
      if (retries > 0 && (err.message?.includes('fetch') || !navigator.onLine)) {
        await new Promise(r => setTimeout(r, 1000));
        return this.getMyProfile(retries - 1);
      }
      return { success: false, error: err.message || 'Erreur réseau inconnue' };
    }
  },

  // 2. Get partner's profile
  async getPartnerProfile(partnerId: string, retries = 3): Promise<{ success: boolean; data?: UserProfile; error?: string }> {
    if (!isSupabaseConfigured() || !partnerId) return { success: false, error: 'Paramètres invalides' };
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', partnerId)
        .maybeSingle();
        
      if (error) {
        if (retries > 0 && error.message.includes('Failed to fetch')) {
          console.warn(`[profileService] Retrying getPartnerProfile... (${retries} left)`);
          await new Promise(r => setTimeout(r, 1000));
          return this.getPartnerProfile(partnerId, retries - 1);
        }
        console.error('[profileService] Error fetching partner profile:', error);
        return { success: false, error: error.message };
      }
      return { success: true, data: data as UserProfile };
    } catch (err: any) {
      if (retries > 0 && (err.message?.includes('fetch') || !navigator.onLine)) {
        await new Promise(r => setTimeout(r, 1000));
        return this.getPartnerProfile(partnerId, retries - 1);
      }
      return { success: false, error: err.message || 'Erreur réseau inconnue' };
    }
  },

  // 3. Update my profile (display_name, bio)
  async updateProfile(updates: Partial<Pick<UserProfile, 'display_name' | 'bio'>>): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase non configuré' };
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié' };
    
    const { error } = await supabase
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);
      
    if (error) {
      console.error('[profileService] Error updating profile:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  },

  // 4. Upload avatar
  async uploadAvatar(file: File): Promise<{ success: boolean; path?: string; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase non configuré' };
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié' };

    // 1. Choisir le fichier (déjà fait via l'input)
    
    // 2. Vérifier type et taille
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Format non supporté (JPG, PNG, WebP uniquement)' };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'Image trop volumineuse (max 5 Mo)' };
    }

    // Sauvegarder l'ancien chemin pour suppression ultérieure
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_path')
      .eq('id', user.id)
      .maybeSingle();
    const oldPath = profile?.avatar_path;

    // 3. Compresser si possible (conversion WebP)
    const compressToWebP = async (sourceFile: File): Promise<{ blob: Blob | File; ext: string }> => {
      // Si c'est déjà un webp, on ne convertit pas (mais on pourrait re-compresser si besoin)
      if (sourceFile.type === 'image/webp') {
        return { blob: sourceFile, ext: 'webp' };
      }

      try {
        const img = new Image();
        const url = URL.createObjectURL(sourceFile);
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error('Erreur de chargement de l\'image'));
          img.src = url;
        });

        const canvas = document.createElement('canvas');
        // Limiter la taille pour un avatar (ex: 512x512)
        const maxDim = 512;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context failed');
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        // Tenter l'export en WebP
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85));
        URL.revokeObjectURL(url);
        
        if (blob) {
          console.log(`[profileService] Compression WebP réussie: ${(blob.size / 1024).toFixed(1)}KB`);
          return { blob, ext: 'webp' };
        }
        throw new Error('Export WebP échoué');
      } catch (err) {
        console.warn('[profileService] Échec conversion WebP, conservation du format original:', err);
        const originalExt = sourceFile.name.split('.').pop()?.toLowerCase() || (sourceFile.type === 'image/png' ? 'png' : 'jpg');
        return { blob: sourceFile, ext: originalExt };
      }
    };

    const { blob, ext } = await compressToWebP(file);
    
    // 4. Créer un UUID
    const uuid = crypto.randomUUID();
    
    // 5. Chemin interne : {user_id}/{uuid}.{extension}
    const filePath = `${user.id}/${uuid}.${ext}`;

    try {
      // 6. Uploader le nouvel avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: ext === 'webp' ? 'image/webp' : (ext === 'png' ? 'image/png' : 'image/jpeg')
        });
        
      if (uploadError) throw uploadError;

      // 7. Mettre à jour seulement ma ligne profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_path: filePath, // 8. avatar_path
          avatar_version: Math.floor(Date.now() / 1000), // 9. Augmenter avatar_version
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id); // eq('id', currentUser.id)
        
      if (updateError) throw updateError;

      // 10. L'URL signée et l'interface seront mises à jour par App.tsx via loadProfiles

      // 11. Supprimer l'ancien avatar seulement après succès complet
      if (oldPath && oldPath !== filePath) {
        try {
          await supabase.storage.from('avatars').remove([oldPath]);
        } catch (cleanupErr) {
          console.warn('[profileService] Échec suppression ancien avatar (non bloquant):', cleanupErr);
        }
      }

      return { success: true, path: filePath };
    } catch (err: any) {
      console.error('[profileService] Error in uploadAvatar:', err);
      return { success: false, error: err.message || 'Erreur lors de l\'upload' };
    }
  },

  // 5. Get signed URL with memory cache
  async getSignedAvatarUrl(path: string, version: number): Promise<string | null> {
    if (!isSupabaseConfigured() || !path || typeof path !== 'string' || !path.trim()) return null;
    
    const cleanPath = path.trim();

    // If path is already a direct URL (http, https, data URI, blob)
    if (cleanPath.startsWith('http://') || cleanPath.startsWith('https://') || cleanPath.startsWith('data:') || cleanPath.startsWith('blob:')) {
      return cleanPath;
    }

    const cacheKey = `${cleanPath}_v${version}`;
    const cached = signedUrlCache[cacheKey];
    const now = Date.now();

    // Cache valid for 3600s, we refresh 5 minutes before (300s)
    if (cached) {
      if (cached.expiresAt > now) {
        return cached.url || null;
      }
    }

    try {
      const { data, error } = await supabase.storage
        .from('avatars')
        .createSignedUrl(cleanPath, 3600);
        
      if (error || !data?.signedUrl) {
        // Fallback to getPublicUrl if signed URL fails (e.g. public bucket or permission)
        try {
          const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(cleanPath);
          if (pubData?.publicUrl) {
            signedUrlCache[cacheKey] = {
              url: pubData.publicUrl,
              expiresAt: now + 300000 // 5 minutes cache
            };
            return pubData.publicUrl;
          }
        } catch {
          // ignore fallback error
        }

        console.warn('[profileService] Warning creating signed URL (using fallback):', error?.message || error);
        // Cache negative response for 30s to avoid repeated failing requests
        signedUrlCache[cacheKey] = {
          url: '',
          expiresAt: now + 30000
        };
        return null;
      }

      // Save to cache
      signedUrlCache[cacheKey] = {
        url: data.signedUrl,
        expiresAt: now + 3600000
      };

      return data.signedUrl;
    } catch (err: any) {
      console.warn('[profileService] Network error during signed URL generation:', err?.message || err);
      try {
        const { data: pubData } = supabase.storage.from('avatars').getPublicUrl(cleanPath);
        if (pubData?.publicUrl) {
          signedUrlCache[cacheKey] = {
            url: pubData.publicUrl,
            expiresAt: now + 300000
          };
          return pubData.publicUrl;
        }
      } catch {
        // ignore
      }
      signedUrlCache[cacheKey] = {
        url: '',
        expiresAt: now + 30000
      };
      return null;
    }
  },

  // 6. Get partner nickname
  async getPartnerNickname(partnerId: string, coupleId: string): Promise<{ success: boolean; data?: string; error?: string }> {
    if (!isSupabaseConfigured() || !partnerId || !coupleId) return { success: false, error: 'Paramètres invalides' };
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié' };
    
    const { data, error } = await supabase
      .from('partner_nicknames')
      .select('nickname')
      .eq('owner_user_id', user.id)
      .eq('partner_user_id', partnerId)
      .eq('couple_id', coupleId)
      .maybeSingle();
      
    if (error) {
      console.error('[profileService] Error fetching nickname:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data: data?.nickname };
  },

  // 7. Set partner nickname
  async setPartnerNickname(coupleId: string, partnerId: string, nickname: string): Promise<{ success: boolean; data?: string; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase non configuré' };
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié' };

    const trimmedNickname = nickname.trim();
    if (!trimmedNickname) return { success: false, error: 'Le surnom ne peut pas être vide' };
    if (trimmedNickname.length > 50) return { success: false, error: 'Le surnom est trop long (max 50 caractères)' };

    const { error } = await supabase
      .from('partner_nicknames')
      .upsert({
        owner_user_id: user.id,
        partner_user_id: partnerId,
        couple_id: coupleId,
        nickname: trimmedNickname,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'owner_user_id,partner_user_id,couple_id'
      });

    if (error) {
      console.error('[profileService] Error setting nickname:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data: trimmedNickname };
  },

  // 8. Remove partner nickname
  async removePartnerNickname(coupleId: string, partnerId: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase non configuré' };
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié' };

    const { error } = await supabase
      .from('partner_nicknames')
      .delete()
      .eq('owner_user_id', user.id)
      .eq('partner_user_id', partnerId)
      .eq('couple_id', coupleId);

    if (error) {
      console.error('[profileService] Error removing nickname:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  }
};
