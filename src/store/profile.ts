import { create } from 'zustand';
import type { Profile } from '@/lib/types';
import { KEY_PROFILE, readJSON, writeJSON } from '@/lib/storage';

const DEFAULT_PROFILE: Profile = {
  name: '',
  role: 'Aprendiz',
  level: 'Principiante',
  bio: '',
  avatar: '',
  goalMinutesPerDay: 30,
};

interface ProfileStore extends Profile {
  set: (patch: Partial<Profile>) => void;
  reset: () => void;
}

export const useProfile = create<ProfileStore>((set, get) => {
  function save(patch: Partial<Profile>) {
    const next = { ...get(), ...patch };
    const { set: _set, reset: _reset, ...profile } = next;
    void _set;
    void _reset;
    writeJSON(KEY_PROFILE, profile);
  }

  return {
    ...DEFAULT_PROFILE,
    ...readJSON<Partial<Profile>>(KEY_PROFILE, {}),
    set: (patch) => {
      set(patch);
      save(patch);
    },
    reset: () => {
      set({ ...DEFAULT_PROFILE });
      save({ ...DEFAULT_PROFILE });
    },
  };
});

/** Reduce una imagen a 160 px de lado y la guarda como data URL. */
export function fileToAvatar(file: File, size = 160): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('El archivo no es una imagen valida.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const side = Math.min(img.width, img.height);
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('El navegador no permite procesar la imagen.'));
          return;
        }
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}