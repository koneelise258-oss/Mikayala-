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

        // Générer une Data URL permanente et inaltérable pour la miniature
        const permanentDataUrl = canvas.toDataURL('image/jpeg', 0.82);
        const duration = Math.round(video.duration) || 0;

        canvas.toBlob((blob) => {
          const finalBlob = blob || new Blob([], { type: 'image/jpeg' });
          cleanup();
          resolve({
            thumbnailUrl: permanentDataUrl,
            thumbnailBlob: finalBlob,
            duration,
            width,
            height
          });
        }, 'image/jpeg', 0.82);
      } catch (err) {
        cleanup();
        resolve({
          thumbnailUrl: '',
          thumbnailBlob: new Blob([], { type: 'image/jpeg' }),
          duration: 0,
          width: 640,
          height: 360
        });
      }
    };

    video.onerror = () => {
      cleanup();
      // Fallback gracieux si le codec ne permet pas d'extraire une frame
      resolve({
        thumbnailUrl: '',
        thumbnailBlob: new Blob([], { type: 'image/jpeg' }),
        duration: 0,
        width: 640,
        height: 360
      });
    };
  });
}

/**
 * Compresse et optimise une photo côté client pour un affichage instantané et persistant
 */
export async function compressImageFile(file: File, maxDimension: number = 1600, quality: number = 0.85): Promise<string> {
  return new Promise((resolve) => {
    // Si ce n'est pas une image standard
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
      reader.onerror = () => resolve('');
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
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

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => {
        resolve(e.target?.result as string);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
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
  const isVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv|avi|flv|wmv|3gp|ts|ogv)$/i.test(file.name);
  const maxVideoSize = 100 * 1024 * 1024; // 100 Mo
  const maxPhotoSize = 35 * 1024 * 1024; // 35 Mo

  if (isVideo) {
    if (file.size > maxVideoSize) {
      return { valid: false, error: `La vidéo "${file.name}" dépasse la taille maximale (100 Mo).` };
    }
  } else {
    if (file.size > maxPhotoSize) {
      return { valid: false, error: `La photo "${file.name}" dépasse la taille maximale (35 Mo).` };
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
