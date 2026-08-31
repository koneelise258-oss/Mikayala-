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
  async getMyProfile(): Promise<{ success: boolean; data?: UserProfile; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase non configuré' };
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié' };
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
      
    if (error) {
      console.error('[profileService] Error fetching my profile:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data: data as UserProfile };
  },

  // 2. Get partner's profile
  async getPartnerProfile(partnerId: string): Promise<{ success: boolean; data?: UserProfile; error?: string }> {
    if (!isSupabaseConfigured() || !partnerId) return { success: false, error: 'Paramètres invalides' };
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', partnerId)
      .maybeSingle();
      
    if (error) {
      console.error('[profileService] Error fetching partner profile:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data: data as UserProfile };
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
      .eq('user_id', user.id);
      
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

    // Validation: type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: 'Format non supporté (JPG, PNG, WebP uniquement)' };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { success: false, error: 'Image trop volumineuse (max 5 Mo)' };
    }

    // Get current profile for cleanup later
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_path')
      .eq('user_id', user.id)
      .maybeSingle();
    const oldPath = profile?.avatar_path;

    // Generate new path: {user_id}/{uuid}.webp
    const uuid = crypto.randomUUID();
    const fileName = `${uuid}.webp`; // Ideally we compress to webp, but browsers don't do it easily without canvas.
    // For now, we use the extension if we can't compress, or assume webp if we could.
    // But the requirement says {user_id}/{uuid}.webp
    const filePath = `${user.id}/${fileName}`;

    try {
      // Upload to 'avatars' bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/webp' // Force webp content type for the storage
        });
        
      if (uploadError) throw uploadError;

      // Update profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          avatar_path: filePath,
          avatar_version: Math.floor(Date.now() / 1000),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
        
      if (updateError) throw updateError;

      // Clean up old avatar after success
      if (oldPath && oldPath !== filePath) {
        await supabase.storage.from('avatars').remove([oldPath]);
      }

      return { success: true, path: filePath };
    } catch (err: any) {
      console.error('[profileService] Error in uploadAvatar:', err);
      return { success: false, error: err.message || 'Erreur lors de l\'upload' };
    }
  },

  // 5. Get signed URL with memory cache
  async getSignedAvatarUrl(path: string, version: number): Promise<string | null> {
    if (!isSupabaseConfigured() || !path) return null;
    
    const cacheKey = `${path}_v${version}`;
    const cached = signedUrlCache[cacheKey];
    const now = Date.now();

    // Cache valid for 3600s, we refresh 5 minutes before (300s)
    if (cached && cached.expiresAt > now + 300000) {
      return cached.url;
    }

    const { data, error } = await supabase.storage
      .from('avatars')
      .createSignedUrl(path, 3600);
      
    if (error || !data?.signedUrl) {
      console.error('[profileService] Error creating signed URL:', error);
      return null;
    }

    // Save to cache
    signedUrlCache[cacheKey] = {
      url: data.signedUrl,
      expiresAt: now + 3600000
    };

    return data.signedUrl;
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
  async setPartnerNickname(coupleId: string, partnerId: string, nickname: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: 'Supabase non configuré' };
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Non authentifié' };

    const { error } = await supabase
      .from('partner_nicknames')
      .upsert({
        owner_user_id: user.id,
        partner_user_id: partnerId,
        couple_id: coupleId,
        nickname: nickname.trim(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'owner_user_id,partner_user_id,couple_id'
      });

    if (error) {
      console.error('[profileService] Error setting nickname:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
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
