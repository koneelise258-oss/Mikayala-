/**
 * Utilitaires de traitement média (Photos & Vidéos)
 * Dédié à la Galerie Mikayla & PWA / TWA Mobile
 */

export interface VideoMetadata {
  thumbnailUrl: string;
  thumbnailBlob: Blob;
  duration: number; // en secondes entières
  width: number;
  height: number;
}

/**
 * Extrait la vignette d'une vidéo et sa durée exacte côté client sans serveur
 */
export async function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      video.remove();
    };

    video.onloadedmetadata = () => {
      // Aller à 0.5s ou 10% de la vidéo pour éviter un écran noir initial
      video.currentTime = Math.min(0.5, Math.max(0.1, video.duration / 10));
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        const maxDim = 720;
        let width = video.videoWidth || 640;
        let height = video.videoHeight || 360;

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

        if (!ctx) {
          cleanup();
          reject(new Error("Impossible d'initialiser le contexte Canvas"));
          return;
        }

        ctx.drawImage(video, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) {
            cleanup();
            reject(new Error("Échec de la génération de la vignette vidéo"));
            return;
          }

          const thumbnailUrl = URL.createObjectURL(blob);
          const duration = Math.round(video.duration) || 0;

          cleanup();
          resolve({
            thumbnailUrl,
            thumbnailBlob: blob,
            duration,
            width,
            height
          });
        }, 'image/jpeg', 0.82);
      } catch (err) {
        cleanup();
        reject(err);
      }
    };

    video.onerror = () => {
      cleanup();
      reject(new Error("Format vidéo non supporté ou fichier illisible"));
    };
  });
}

/**
 * Formate un nombre de secondes au format mm:ss (ex: 75 -> "01:15")
 */
export function formatVideoDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Valide un fichier sélectionné selon les règles de taille
 */
export function validateMediaFile(file: File): { valid: boolean; error?: string } {
  const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv)$/i.test(file.name);
  const maxVideoSize = 50 * 1024 * 1024; // 50 Mo
  const maxPhotoSize = 25 * 1024 * 1024; // 25 Mo

  if (isVideo) {
    if (file.size > maxVideoSize) {
      return { valid: false, error: `La vidéo "${file.name}" dépasse la taille maximale autorisée (50 Mo).` };
    }
  } else {
    if (file.size > maxPhotoSize) {
      return { valid: false, error: `La photo "${file.name}" dépasse la taille maximale autorisée (25 Mo).` };
    }
  }

  return { valid: true };
}

/**
 * Redimensionne et compresse une image côté client pour économiser la bande passante
 */
export async function compressImage(file: File, maxDimension = 1920, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // Si c'est un GIF animé, ne pas recompresser via canvas
    if (file.type === 'image/gif') {
      resolve(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob && blob.size < file.size) {
          resolve(blob);
        } else {
          resolve(file); // garder l'original s'il est déjà plus petit
        }
      }, 'image/jpeg', quality);
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };
  });
}
