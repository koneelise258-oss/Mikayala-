import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Message, MessageStatus, MessageType } from '../types';
import { getStoredPairingState, initAnonymousAuth } from './authService';

export interface SendMessagePayload extends Partial<Message> {
  senderId?: string;
  receiverId?: string;
  type?: MessageType;
  content?: string;
  mediaFile?: File | Blob;
  mediaFileName?: string;
  mediaMimeType?: string;
}

const STORAGE_BUCKET = 'messages-media';

/**
 * Transforms a Postgres DB record from public.messages into an application Message object
 */
export function mapDbRecordToMessage(row: any): Message {
  const createdTime = row.created_at ? new Date(row.created_at).getTime() : (typeof row.timestamp === 'number' ? row.timestamp : Date.now());
  const rawType = row.type || row.message_type || 'texte';
  const typeMap: Record<string, MessageType> = {
    'texte': 'text',
    'text': 'text',
    'image': 'image',
    'video': 'video',
    'audio': 'audio',
    'video_note': 'video_note',
    'document': 'document',
    'location': 'location',
    'contact': 'contact',
    'poll': 'poll',
    'event': 'event',
    'heartbeat': 'heartbeat',
    'scratch_card': 'scratch_card',
    'digital_touch': 'digital_touch',
    'couple_coupon': 'couple_coupon',
    'blind_quiz': 'blind_quiz',
    'system': 'system'
  };

  const mappedType: MessageType = typeMap[rawType] || 'text';
  const rawDeliveredAt = (row.delivered_at !== null && row.delivered_at !== undefined && row.delivered_at !== '') 
    ? String(row.delivered_at) 
    : (row.deliveredAt ? String(row.deliveredAt) : null);
  const rawReadAt = (row.read_at !== null && row.read_at !== undefined && row.read_at !== '') 
    ? String(row.read_at) 
    : (row.readAt ? String(row.readAt) : null);

  const isRead = Boolean(rawReadAt) || row.status === 'read' || row.is_read === true;
  const isDelivered = Boolean(rawDeliveredAt) || row.status === 'delivered' || isRead;
  const status: MessageStatus = isRead 
    ? 'read' 
    : (isDelivered ? 'delivered' : (row.status === 'pending' ? 'pending' : (row.status || 'sent')));

  return {
    id: row.id,
    senderId: row.sender_id || row.senderId || '',
    receiverId: row.receiver_id || row.receiverId || '',
    timestamp: createdTime,
    deliveredAt: rawDeliveredAt || (isDelivered ? new Date(createdTime).toISOString() : null),
    readAt: rawReadAt || (isRead ? new Date(createdTime).toISOString() : null),
    status: status,
    type: mappedType,
    content: row.content || '',
    storagePath: row.storage_path || row.storagePath || null,
    mediaUrl: row.media_url || row.mediaUrl,
    fileName: row.file_name || row.fileName,
    fileSize: row.file_size || row.fileSize,
    fileType: row.file_type || row.fileType,
    audioDuration: row.audio_duration || row.audioDuration,
    waveform: typeof row.waveform === 'string' ? JSON.parse(row.waveform) : row.waveform,
    isViewOnce: row.is_view_once ?? row.isViewOnce ?? false,
    isViewed: row.is_viewed ?? row.isViewed ?? false,
    isHD: row.is_hd ?? row.isHD ?? false,
    pollData: typeof row.poll_data === 'string' ? JSON.parse(row.poll_data) : row.poll_data,
    eventData: typeof row.event_data === 'string' ? JSON.parse(row.event_data) : row.event_data,
    locationData: typeof row.location_data === 'string' ? JSON.parse(row.location_data) : row.location_data,
    contactCard: typeof row.contact_card === 'string' ? JSON.parse(row.contact_card) : row.contact_card,
    scratchCardData: typeof row.scratch_card_data === 'string' ? JSON.parse(row.scratch_card_data) : row.scratchCardData,
    digitalTouchData: typeof row.digital_touch_data === 'string' ? JSON.parse(row.digital_touch_data) : row.digitalTouchData,
    couponData: typeof row.coupon_data === 'string' ? JSON.parse(row.coupon_data) : row.couponData,
    blindQuizData: typeof row.blind_quiz_data === 'string' ? JSON.parse(row.blind_quiz_data) : row.blindQuizData,
    reactions: typeof row.reactions === 'string' ? JSON.parse(row.reactions) : (row.reactions || {}),
    replyToId: row.reply_to_id || row.replyToId,
    isStarred: row.is_starred ?? row.isStarred ?? false,
    isPinned: row.is_pinned ?? row.isPinned ?? false,
    isEdited: row.is_edited ?? row.isEdited ?? false,
    isDeletedForEveryone: row.is_deleted_for_everyone ?? row.isDeletedForEveryone ?? false,
    isDeletedForMe: row.is_deleted_for_me ?? row.isDeletedForMe ?? false,
    ephemeralDuration: row.ephemeral_duration || row.ephemeralDuration,
    expiresAt: row.expires_at || row.expiresAt,
    transportMode: row.transport_mode || row.transportMode || 'cloud'
  };
}

/**
 * Uploads a media file (Audio, Image, Video, Document) to Supabase Storage
 */
export async function uploadMediaToStorage(
  file: File | Blob,
  coupleId: string,
  fileName?: string,
  folder = 'media'
): Promise<{ url: string; path: string } | null> {
  if (!isSupabaseConfigured()) {
    if (file && typeof file === 'object') {
      return { url: URL.createObjectURL(file), path: '' };
    }
    return null;
  }

  try {
    const rawType = file.type || '';
    // Sanitize MIME type (remove parameters like ;codecs=opus)
    const sanitizedMime = rawType.split(';')[0].trim();
    
    // Choose extension based on mime type
    let ext = 'bin';
    if (sanitizedMime.includes('audio')) {
      ext = (sanitizedMime.includes('mp4') || sanitizedMime.includes('aac') || sanitizedMime.includes('m4a')) ? 'mp4'
          : sanitizedMime.includes('wav') ? 'wav'
          : sanitizedMime.includes('mpeg') || sanitizedMime.includes('mp3') ? 'mp3'
          : 'webm';
    } else if (sanitizedMime.includes('video')) {
      ext = sanitizedMime.includes('mp4') ? 'mp4' : 'webm';
    } else if (sanitizedMime.includes('image')) {
      ext = sanitizedMime.includes('jpeg') ? 'jpg' : sanitizedMime.includes('png') ? 'png' : 'webp';
    } else if (fileName && fileName.includes('.')) {
      ext = fileName.split('.').pop() || 'bin';
    }
    
    // Use messageId for filename if provided, otherwise timestamp+random
    const messageId = fileName && fileName.includes('-') ? fileName : `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const safeName = `${coupleId}/${folder}/${messageId}.${ext}`;

    const contentTypeSent = sanitizedMime || (folder === 'audio' ? 'audio/mp4' : folder === 'video' ? 'video/mp4' : 'application/octet-stream');
    const uploadFile = new File([file], `${messageId}.${ext}`, { type: contentTypeSent });

    console.log('[MediaUpload Diagnostic Attempt]', {
      blobTypeReal: rawType,
      recorderMimeTypeReal: sanitizedMime,
      extension: ext,
      sizeBytes: file.size,
      bucket: STORAGE_BUCKET,
      storagePath: safeName,
      contentTypeSent: contentTypeSent
    });

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(safeName, uploadFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: contentTypeSent
      });

    console.log('[MediaUpload Response]', {
      bucket: STORAGE_BUCKET,
      storagePath: safeName,
      success: !uploadError && Boolean(uploadData),
      uploadPathResult: uploadData?.path || null,
      errorDetails: uploadError ? {
        name: uploadError.name,
        message: uploadError.message,
        statusCode: (uploadError as any)?.statusCode || (uploadError as any)?.status || null
      } : null
    });

    if (uploadError || !uploadData) {
      console.error('[messageService] Storage upload error:', uploadError?.message || uploadError);
      throw new Error(uploadError?.message || 'Erreur lors du téléversement du média');
    }

    return { url: '', path: uploadData.path };
  } catch (error: any) {
    console.error('[messageService] Exception uploading media:', error?.message || error);
    throw error;
  }
}

/**
 * Obtains the current authenticated user ID from Supabase
 */
async function getCurrentUserId(): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase n'est pas configuré. Veuillez définir VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.");
  }

  const { data: { user }, error } = await supabase.auth.getUser();
  if (user?.id) {
    return user.id;
  }

  if (error) {
    console.warn('[messageService] getUser error, initializing anonymous auth:', error.message);
  }

  return await initAnonymousAuth();
}

/**
 * Compresse et redimensionne une image en WebP (dimension max 1920px, qualité 0.82)
 */
export async function compressImageToWebp(file: File | Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (file.type && !validMimes.includes(file.type)) {
      return reject(new Error("Format non pris en charge. Seules les images JPEG, PNG et WebP sont acceptées."));
    }

    if (file.size > 15 * 1024 * 1024) {
      return reject(new Error("L'image dépasse la taille maximale autorisée de 15 Mo."));
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      const MAX_DIMENSION = 1920;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error("Impossible d'initialiser le rendu graphique Canvas 2D."));
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error("La compression et conversion de l'image en WebP a échoué."));
          }
          resolve(blob);
        },
        'image/webp',
        0.82
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Impossible de charger l'image sélectionnée."));
    };

    img.src = objectUrl;
  });
}

interface SignedUrlCacheEntry {
  url: string;
  expiresAt: number;
}

const signedUrlCache = new Map<string, SignedUrlCacheEntry>();

/**
 * Vide le cache mémoire des URLs signées (ex: lors d'un changement de compte ou déconnexion)
 */
export function clearSignedUrlCache(): void {
  signedUrlCache.clear();
  console.log('[messageService] Cache des URLs signées vidé.');
}

/**
 * Obtient ou génère une URL signée temporaire pour un fichier stocké dans messages-media
 * Cache en mémoire avec renouvellement automatique avant expiration (3600s)
 */
export async function obtenirSignedUrl(storagePath: string): Promise<string | null> {
  if (!storagePath || typeof storagePath !== 'string') return null;

  // Si c'est déjà une URL locale blob ou data, on la renvoie directement
  if (
    storagePath.startsWith('blob:') || 
    storagePath.startsWith('data:')
  ) {
    return storagePath;
  }

  if (!isSupabaseConfigured()) {
    console.error('[Storage] Supabase non configuré pour obtenirSignedUrl');
    return null;
  }

  const now = Date.now();
  const cached = signedUrlCache.get(storagePath);
  // Renouvellement si expire dans moins de 5 minutes (300s)
  if (cached && cached.expiresAt - now > 300 * 1000) {
    return cached.url;
  }

  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, 3600);

    console.log('[createSignedUrl Response]', {
      storagePath,
      success: Boolean(data?.signedUrl),
      cached: false,
      errorDetails: error ? {
        message: error.message,
        name: error.name,
        code: (error as any)?.statusCode || (error as any)?.code
      } : null
    });

    if (error || !data?.signedUrl) {
      console.error('[Storage] Impossible de charger ce média (échec createSignedUrl):', {
        storagePath,
        code: (error as any)?.statusCode || (error as any)?.code || (error as any)?.name || 'STORAGE_ERROR',
        message: error?.message || 'Signed URL generation failed'
      });
      return null;
    }

    signedUrlCache.set(storagePath, {
      url: data.signedUrl,
      expiresAt: now + 3600 * 1000
    });

    return data.signedUrl;
  } catch (err: any) {
    console.error('[Storage] Exception createSignedUrl:', {
      storagePath,
      code: err?.code || err?.name || 'STORAGE_EXCEPTION',
      message: err?.message || String(err)
    });
    return null;
  }
}

/**
 * Envoie une photo optimisée en WebP dans messages-media et insère la référence dans public.messages
 * Format de chemin strict : {couple_id}/photos/{uuid}.webp
 * @param coupleId UUID du couple dans Supabase
 * @param file Fichier image sélectionné
 * @param caption Légende optionnelle
 */
export async function envoyerMessagePhoto(
  coupleIdOrOptions: string | { coupleId: string; file: File | Blob; caption?: string; senderId?: string },
  argFile?: File | Blob,
  argCaption?: string
): Promise<Message> {
  let targetCoupleId: string;
  let file: File | Blob;
  let caption: string | undefined;

  if (typeof coupleIdOrOptions === 'object' && coupleIdOrOptions !== null) {
    targetCoupleId = coupleIdOrOptions.coupleId || getStoredPairingState().coupleId;
    file = coupleIdOrOptions.file;
    caption = coupleIdOrOptions.caption;
  } else {
    targetCoupleId = (typeof coupleIdOrOptions === 'string' ? coupleIdOrOptions : '') || getStoredPairingState().coupleId;
    file = argFile!;
    caption = argCaption;
  }

  if (!file) {
    throw new Error("Aucun fichier photo fourni.");
  }

  if (!targetCoupleId) {
    throw new Error("Aucun couple appairé. Veuillez d'abord appairer vos appareils.");
  }

  if (!isSupabaseConfigured()) {
    throw new Error("Supabase n'est pas configuré. Vérifiez vos variables d'environnement.");
  }

  // 1. Validation du type MIME
  const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (file.type && !validMimes.includes(file.type)) {
    throw new Error("Format non pris en charge. Seules les images JPEG, PNG et WebP sont acceptées.");
  }

  // 2. Validation de la taille maximale (15 Mo)
  if (file.size > 15 * 1024 * 1024) {
    throw new Error("L'image dépasse la taille maximale autorisée de 15 Mo.");
  }

  // 3. Compression & conversion WebP
  const webpBlob = await compressImageToWebp(file);

  // 4. Chemin strict : {couple_id}/photos/{uuid}.webp
  const fileUuid = crypto.randomUUID();
  const storagePath = `${targetCoupleId}/photos/${fileUuid}.webp`;

  // 5. Upload vers Supabase Storage bucket messages-media
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, webpBlob, {
      contentType: 'image/webp',
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError || !uploadData) {
    console.error('[messageService] Erreur lors de l\'upload de la photo dans Storage:', uploadError?.message);
    throw new Error(`Échec du téléversement de la photo : ${uploadError?.message || 'Erreur de stockage'}`);
  }

  // 6. Récupération de l'expéditeur authentifié
  let currentUserId: string;
  try {
    currentUserId = await getCurrentUserId();
  } catch (authErr: any) {
    console.error('[messageService] Échec récupération authentification:', authErr);
    throw new Error(`Échec d'authentification : ${authErr.message}`);
  }

  const cleanCaption = (caption || '').trim();
  const insertPayload: Record<string, any> = {
    couple_id: targetCoupleId,
    sender_id: currentUserId,
    message_type: 'image',
    content: cleanCaption,
    storage_path: storagePath,
    media_url: null
  };

  try {
    let { data: messageData, error: insertError } = await supabase
      .from('messages')
      .insert(insertPayload)
      .select()
      .single();

    // Si la colonne media_url n'existe pas dans le schéma Supabase ou le cache, réessayer sans media_url
    if (insertError) {
      const errLower = (insertError.message || '').toLowerCase();
      if (errLower.includes('media_url') || errLower.includes('schema cache') || errLower.includes('column') || insertError.code === 'PGRST204') {
        console.warn('[messageService] Deuxième tentative insertion photo sans media_url...');
        const fallbackPayload = {
          couple_id: targetCoupleId,
          sender_id: currentUserId,
          message_type: 'image',
          content: cleanCaption,
          storage_path: storagePath
        };
        const retryRes = await supabase
          .from('messages')
          .insert(fallbackPayload)
          .select()
          .single();
        messageData = retryRes.data;
        insertError = retryRes.error;
      }
    }

    if (insertError || !messageData) {
      console.error('[messageService] Échec insertion message après upload photo. Détails:', insertError);
      // Suppression du fichier si l'insertion DB échoue
      await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      throw new Error(`La photo a été téléversée mais l'enregistrement du message a échoué : ${insertError?.message || 'Erreur base de données'}`);
    }

    return mapDbRecordToMessage(messageData);
  } catch (err: any) {
    console.error('[messageService] Échec insertion message après upload photo. Chemin:', storagePath, err);
    throw err;
  }
}

/**
 * Envoie un message texte dans la table public.messages
 * @param coupleId UUID du couple dans Supabase
 * @param contenu Texte saisi
 */
export async function envoyerMessageTexte(coupleId: string, contenu: string): Promise<Message> {
  const cleanContent = (contenu || '').trim();
  if (!cleanContent) {
    throw new Error('Le contenu du message ne peut pas être vide.');
  }

  if (cleanContent.length > 4000) {
    throw new Error('Le message dépasse la limite maximale de 4000 caractères.');
  }

  const targetCoupleId = coupleId || getStoredPairingState().coupleId;
  if (!targetCoupleId) {
    throw new Error('Aucun espace couple associé. Veuillez appairer vos appareils.');
  }

  if (!isSupabaseConfigured()) {
    throw new Error("Supabase n'est pas configuré. Vérifiez vos variables d'environnement.");
  }

  const currentUserId = await getCurrentUserId();

  const insertPayload = {
    couple_id: targetCoupleId,
    sender_id: currentUserId,
    content: cleanContent,
    message_type: 'text',
    is_ephemeral: false
  };

  const { data, error } = await supabase
    .from('messages')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error('[messageService] Erreur Supabase complète lors de l\'insertion du message:', error);
    throw new Error(`Erreur lors de l'envoi du message : ${error.message || 'Échec de l\'insertion'}`);
  }

  if (!data) {
    throw new Error("Aucune confirmation retournée par la base de données Supabase.");
  }

  return mapDbRecordToMessage(data);
}

/**
 * Récupère tous les messages d'un couple depuis la table public.messages
 * @param coupleId UUID du couple
 */
export async function getMessages(coupleId: string): Promise<Message[]> {
  const targetCoupleId = coupleId || getStoredPairingState().coupleId;
  if (!targetCoupleId || !isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('couple_id', targetCoupleId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[messageService] Erreur récupération messages:', error.message);
      throw new Error(`Erreur lors de la récupération des messages : ${error.message}`);
    }

    const rows = data || [];
    const mapped = rows.map(mapDbRecordToMessage).sort((a, b) => a.timestamp - b.timestamp);
    console.log('[Chat] nombre de messages chargés:', mapped.length);
    return mapped;
  } catch (err: any) {
    console.error('[messageService] Exception dans getMessages:', err);
    throw err;
  }
}

export const obtenirMessages = getMessages;

/**
 * S'abonne en temps réel aux nouveaux messages (INSERT, UPDATE, DELETE) dans public.messages
 * @param coupleId UUID du couple
 * @param onNewMessage Appelé lors d'un INSERT ou UPDATE
 * @param onDeleteMessage Appelé lors d'un DELETE
 * @param onError Callback optionnel pour les erreurs fatales
 */
export function sAbonnerAuxMessages(
  coupleId: string,
  onNewMessage: (message: Message) => void,
  onDeleteMessage?: (messageId: string) => void,
  onError?: (error: Error) => void
): () => void {
  const targetCoupleId = coupleId || getStoredPairingState().coupleId;
  if (!targetCoupleId || !isSupabaseConfigured()) {
    return () => {};
  }

  let isStopped = false;
  let retryCount = 0;
  let activeChannel: any = null;

  const subscribe = (attempt = 0) => {
    if (isStopped) return;

    // Nettoyage préventif du canal précédent si existant
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
      activeChannel = null;
    }

    const channelName = `msgs-${targetCoupleId}-${Date.now()}-${attempt}`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `couple_id=eq.${targetCoupleId}` },
        (payload) => {
          if (payload.new) onNewMessage(mapDbRecordToMessage(payload.new));
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `couple_id=eq.${targetCoupleId}` },
        (payload) => {
          if (payload.new) onNewMessage(mapDbRecordToMessage(payload.new));
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages', filter: `couple_id=eq.${targetCoupleId}` },
        (payload) => {
          if (payload.old?.id && onDeleteMessage) onDeleteMessage(payload.old.id);
        }
      )
      .subscribe((status, err) => {
        if (isStopped) return;

        if (status === 'SUBSCRIBED') {
          console.log(`[Realtime] Connecté au canal: ${channelName}`);
          retryCount = 0; // Reset on success
        } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          const errorMsg = err?.message || 'Transport failure or socket closed';
          console.warn(`[Realtime] Problème (${status}): ${errorMsg}`);
          
          if (!isStopped && retryCount < 10) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 15000);
            retryCount++;
            console.log(`[Realtime] Tentative de reconnexion ${retryCount}/10 dans ${delay}ms...`);
            setTimeout(() => subscribe(retryCount), delay);
          } else if (retryCount >= 10 && onError) {
            onError(new Error("Impossible de maintenir la connexion temps réel après plusieurs tentatives."));
          }
        }
      });

    activeChannel = channel;
  };

  subscribe();

  return () => {
    console.log('[Realtime] Désabonnement demandé.');
    isStopped = true;
    if (activeChannel) {
      supabase.removeChannel(activeChannel);
      activeChannel = null;
    }
  };
}

// Alias exact demandé dans l'énoncé
export const s_abonnerAuxMessages = sAbonnerAuxMessages;

/**
 * Marque les messages reçus non délivrés comme délivrés via RPC Supabase et fallback direct
 * @param coupleId UUID du couple dans Supabase
 */
export async function marquerMessagesCommeLivrés(coupleId: string): Promise<void> {
  const targetCoupleId = coupleId || getStoredPairingState().coupleId;
  if (!targetCoupleId || !isSupabaseConfigured()) {
    return;
  }

  const now = new Date().toISOString();

  // 1. Essai via fonction RPC SQL avec diverses signatures possibles
  let rpcSuccess = false;
  const rpcParamVariants: Record<string, any>[] = [
    { target_couple_id: targetCoupleId },
    { couple_id: targetCoupleId },
    { p_couple_id: targetCoupleId },
    { couple_space_id: targetCoupleId },
    { p_couple_space_id: targetCoupleId },
    {}
  ];

  for (const params of rpcParamVariants) {
    try {
      const { error } = await supabase.rpc('mark_messages_delivered', params);
      if (!error) {
        rpcSuccess = true;
        break;
      }
    } catch {
      // Tester la variante suivante
    }
  }

  // 2. Mise à jour directe de sécurité dans public.messages
  try {
    let currentUserId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id || null;
    } catch {
      // Ignorer
    }
    if (!currentUserId) {
      try {
        currentUserId = await getCurrentUserId();
      } catch {
        // Ignorer
      }
    }

    // Essai 1 : mise à jour avec delivered_at et status
    let query = supabase
      .from('messages')
      .update({
        delivered_at: now,
        status: 'delivered'
      })
      .eq('couple_id', targetCoupleId)
      .is('delivered_at', null);

    if (currentUserId) {
      query = query.neq('sender_id', currentUserId);
    }

    const { error: updateErr } = await query;

    // Si erreur (ex: la colonne status n'existe pas dans le schéma Postgres)
    if (updateErr) {
      let retryQuery = supabase
        .from('messages')
        .update({
          delivered_at: now
        })
        .eq('couple_id', targetCoupleId)
        .is('delivered_at', null);

      if (currentUserId) {
        retryQuery = retryQuery.neq('sender_id', currentUserId);
      }

      await retryQuery;
    }
  } catch (err) {
    // Dernier repli direct sans status
    try {
      let currentUserId: string | null = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        currentUserId = user?.id || null;
      } catch {}

      let retryQuery = supabase
        .from('messages')
        .update({ delivered_at: now })
        .eq('couple_id', targetCoupleId)
        .is('delivered_at', null);

      if (currentUserId) {
        retryQuery = retryQuery.neq('sender_id', currentUserId);
      }
      await retryQuery;
    } catch (finalErr) {
      console.warn('[messageService] Repli update delivered_at:', finalErr);
    }
  }
}

export const marquerMessagesCommeLivres = marquerMessagesCommeLivrés;
export const markMessagesAsDelivered = marquerMessagesCommeLivrés;

/**
 * Marque les messages reçus non lus comme lus via RPC Supabase et fallback direct
 * @param coupleId UUID du couple dans Supabase
 */
export async function marquerMessagesCommeLus(coupleId: string): Promise<void> {
  const targetCoupleId = coupleId || getStoredPairingState().coupleId;
  if (!targetCoupleId || !isSupabaseConfigured()) {
    return;
  }

  const now = new Date().toISOString();

  // 1. Essai via fonction RPC SQL avec diverses signatures possibles
  let rpcSuccess = false;
  const rpcParamVariants: Record<string, any>[] = [
    { target_couple_id: targetCoupleId },
    { couple_id: targetCoupleId },
    { p_couple_id: targetCoupleId },
    { couple_space_id: targetCoupleId },
    { p_couple_space_id: targetCoupleId },
    {}
  ];

  for (const params of rpcParamVariants) {
    try {
      const { error } = await supabase.rpc('mark_messages_read', params);
      if (!error) {
        rpcSuccess = true;
        break;
      }
    } catch {
      // Tester la variante suivante
    }
  }

  // 2. Mise à jour directe de sécurité dans public.messages
  try {
    let currentUserId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id || null;
    } catch {
      // Ignorer
    }
    if (!currentUserId) {
      try {
        currentUserId = await getCurrentUserId();
      } catch {
        // Ignorer
      }
    }

    // Essai 1 : mise à jour avec read_at, delivered_at et status
    let query = supabase
      .from('messages')
      .update({
        read_at: now,
        delivered_at: now,
        status: 'read'
      })
      .eq('couple_id', targetCoupleId)
      .is('read_at', null);

    if (currentUserId) {
      query = query.neq('sender_id', currentUserId);
    }

    const { error: updateErr } = await query;

    // Si erreur (ex: colonne status absente), mise à jour uniquement des timestamps
    if (updateErr) {
      let retryQuery = supabase
        .from('messages')
        .update({
          read_at: now,
          delivered_at: now
        })
        .eq('couple_id', targetCoupleId)
        .is('read_at', null);

      if (currentUserId) {
        retryQuery = retryQuery.neq('sender_id', currentUserId);
      }

      const { error: retryErr } = await retryQuery;
      if (retryErr) {
        let readOnlyQuery = supabase
          .from('messages')
          .update({ read_at: now })
          .eq('couple_id', targetCoupleId)
          .is('read_at', null);

        if (currentUserId) {
          readOnlyQuery = readOnlyQuery.neq('sender_id', currentUserId);
        }
        await readOnlyQuery;
      }
    }
  } catch (err) {
    try {
      let currentUserId: string | null = null;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        currentUserId = user?.id || null;
      } catch {}

      let retryQuery = supabase
        .from('messages')
        .update({ read_at: now, delivered_at: now })
        .eq('couple_id', targetCoupleId)
        .is('read_at', null);

      if (currentUserId) {
        retryQuery = retryQuery.neq('sender_id', currentUserId);
      }
      await retryQuery;
    } catch (finalErr) {
      console.warn('[messageService] Repli update read_at:', finalErr);
    }
  }
}

export const markMessagesAsRead = marquerMessagesCommeLus;

/**
 * Vérifie si les conditions d'environnement globales permettent de marquer les messages d'un couple comme lus
 * (document visible, fenêtre avec focus, utilisateur membre du couple cible)
 */
export function canMarkConversationAsRead(targetCoupleId?: string): boolean {
  if (typeof document !== 'undefined') {
    if (document.visibilityState !== 'visible') {
      return false;
    }
    if (typeof document.hasFocus === 'function' && !document.hasFocus()) {
      return false;
    }
  }
  const pairing = getStoredPairingState();
  if (!pairing.isPaired || !pairing.coupleId) {
    return false;
  }
  if (targetCoupleId && pairing.coupleId !== targetCoupleId) {
    return false;
  }
  return true;
}

/**
 * Marque un message individuel comme lu via RPC Supabase
 */
export async function markMessageAsRead(coupleIdOrMessageId: string): Promise<void> {
  const coupleId = getStoredPairingState().coupleId || coupleIdOrMessageId;
  if (coupleId) {
    await marquerMessagesCommeLus(coupleId);
  }
}

/**
 * Supprime définitivement un média à vue unique
 */
export async function deleteViewOnceMedia(messageId: string): Promise<void> {
  if (!messageId || !isSupabaseConfigured()) return;

  try {
    const { data, error: fetchErr } = await supabase
      .from('messages')
      .select('media_url')
      .eq('id', messageId)
      .single();

    if (!fetchErr && data?.media_url) {
      const urlParts = data.media_url.split(`${STORAGE_BUCKET}/`);
      if (urlParts.length > 1) {
        const filePath = decodeURIComponent(urlParts[1].split('?')[0]);
        await supabase.storage.from(STORAGE_BUCKET).remove([filePath]);
      }
    }

    await supabase
      .from('messages')
      .update({
        media_url: null,
        is_viewed: true,
        content: 'Média à vue unique détruit 🔒🔥'
      })
      .eq('id', messageId);
  } catch (err) {
    console.error('[messageService] Exception in deleteViewOnceMedia:', err);
  }
}

/**
 * Alias de compatibilité pour le reste de l'application
 */
export const sendMessage = async (payload: SendMessagePayload): Promise<Message> => {
  const coupleId = getStoredPairingState().coupleId || '';
  if (payload.type === 'text' && payload.content) {
    return await envoyerMessageTexte(coupleId, payload.content);
  }

  // Generic insertion for other features (heartbeat, etc.)
  if (isSupabaseConfigured() && coupleId) {
    try {
      const senderId = payload.senderId || (await getCurrentUserId());
      const basePayload: Record<string, any> = {
        couple_id: coupleId,
        sender_id: senderId,
        message_type: payload.type || 'text',
        content: payload.content || ''
      };
      if (payload.receiverId) basePayload.receiver_id = payload.receiverId;
      if (payload.mediaUrl) basePayload.media_url = payload.mediaUrl;
      if (payload.storagePath) basePayload.storage_path = payload.storagePath;
      if (payload.audioDuration) basePayload.audio_duration = payload.audioDuration;
      if (payload.waveform) basePayload.waveform = payload.waveform;
      if (payload.replyToId) basePayload.reply_to_id = payload.replyToId;
      if (payload.isViewOnce) basePayload.is_view_once = payload.isViewOnce;

      const { data } = await supabase
        .from('messages')
        .insert(basePayload)
        .select()
        .single();

      if (data) {
        return mapDbRecordToMessage(data);
      }
    } catch (e) {
      console.warn('[messageService] Non-critical sendMessage generic insert error:', e);
    }
  }

  return {
    id: `msg_${Date.now()}`,
    senderId: payload.senderId || '',
    receiverId: payload.receiverId || '',
    timestamp: Date.now(),
    status: 'sent',
    type: payload.type || 'text',
    content: payload.content || ''
  };
};

/**
 * Deletes a message for everyone (Sync with DB & Storage)
 */
export async function deleteMessage(messageId: string, storagePath?: string | null): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { success: false, error: "Supabase non configuré" };

  try {
    // 1. If there's a storage path, delete the file first
    if (storagePath) {
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([storagePath]);
      
      if (storageError) {
        console.error('[messageService] Error deleting storage file:', storageError);
      }
    }

    // 2. Delete the message record
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Envoie un message audio (note vocale)
 */
export async function envoyerMessageAudio(
  coupleId: string,
  blob: Blob,
  duration: number,
  waveform: number[]
): Promise<Message> {
  const targetCoupleId = coupleId || getStoredPairingState().coupleId;
  if (!targetCoupleId || !isSupabaseConfigured()) throw new Error("Configuration manquante");

  const messageId = crypto.randomUUID();
  // Chemin strict : {coupleId}/audio/{messageId}.{extension}
  const upload = await uploadMediaToStorage(blob, targetCoupleId, messageId, 'audio');
  
  if (!upload || !upload.path) {
    throw new Error("Échec du téléversement de la note vocale.");
  }

  console.log('[Audio upload]', {
    blobType: blob.type,
    blobSize: blob.size,
    storagePath: upload.path,
  });

  const senderId = await getCurrentUserId();
  const insertPayload = {
    id: messageId,
    couple_id: targetCoupleId,
    sender_id: senderId,
    message_type: 'audio',
    storage_path: upload.path,
    audio_duration: duration,
    waveform: JSON.stringify(waveform),
    content: 'Note vocale'
  };

  const { data, error } = await supabase.from('messages').insert(insertPayload).select().single();

  console.log('[MessageInsert Audio Response]', {
    messageId,
    type: 'audio',
    storagePath: upload.path,
    success: !error && Boolean(data),
    errorDetails: error ? { code: error.code, message: error.message } : null
  });

  if (error) {
    // Suppression du fichier si l'insertion DB échoue
    await supabase.storage.from(STORAGE_BUCKET).remove([upload.path]);
    throw new Error(`Erreur DB : ${error.message}`);
  }

  return mapDbRecordToMessage(data);
}

/**
 * Envoie un message vidéo
 */
export async function envoyerMessageVideo(
  coupleId: string,
  blob: Blob,
  duration: number
): Promise<Message> {
  const targetCoupleId = coupleId || getStoredPairingState().coupleId;
  if (!targetCoupleId || !isSupabaseConfigured()) throw new Error("Configuration manquante");

  const messageId = crypto.randomUUID();
  // Chemin strict : {coupleId}/video/{messageId}.{extension}
  const upload = await uploadMediaToStorage(blob, targetCoupleId, messageId, 'video');
  
  if (!upload || !upload.path) {
    throw new Error("Échec du téléversement de la vidéo.");
  }

  const senderId = await getCurrentUserId();
  const insertPayload = {
    id: messageId,
    couple_id: targetCoupleId,
    sender_id: senderId,
    message_type: 'video',
    storage_path: upload.path,
    audio_duration: duration, // On utilise la même colonne pour la durée
    content: 'Message vidéo'
  };

  const { data, error } = await supabase.from('messages').insert(insertPayload).select().single();

  console.log('[MessageInsert Video Response]', {
    messageId,
    type: 'video',
    storagePath: upload.path,
    success: !error && Boolean(data),
    errorDetails: error ? { code: error.code, message: error.message } : null
  });

  if (error) {
    await supabase.storage.from(STORAGE_BUCKET).remove([upload.path]);
    throw new Error(`Erreur DB : ${error.message}`);
  }

  return mapDbRecordToMessage(data);
}


export const fetchMessages = obtenirMessages;
export const subscribeToMessages = (
  coupleId: string,
  onNewMessage: (message: Message) => void
) => sAbonnerAuxMessages(coupleId, onNewMessage);

export const markAsRead = markMessageAsRead;

export default {
  envoyerMessageTexte,
  envoyerMessagePhoto,
  envoyerMessageAudio,
  envoyerMessageVideo,
  obtenirSignedUrl,
  clearSignedUrlCache,
  compressImageToWebp,
  getMessages,
  obtenirMessages,
  sAbonnerAuxMessages,
  s_abonnerAuxMessages,
  subscribeToMessages,
  marquerMessagesCommeLivrés,
  marquerMessagesCommeLivres,
  marquerMessagesCommeLus,
  markMessagesAsDelivered,
  markMessagesAsRead,
  markMessageAsRead,
  markAsRead,
  canMarkConversationAsRead,
  sendMessage,
  fetchMessages,
  deleteMessage,
  deleteViewOnceMedia,
  uploadMediaToStorage,
  mapDbRecordToMessage
};
