import { create } from 'zustand';

interface PlayerState {
  currentMedia: any | null;
  isPlaying: boolean;
  currentTime: number;
  setMedia: (media: any) => void;
  setProgress: (time: number) => void;
  setPlaying: (playing: boolean) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentMedia: null,
  isPlaying: false,
  currentTime: 0,
  setMedia: (media) => set({ currentMedia: media, currentTime: 0 }),
  setProgress: (time) => set({ currentTime: time }),
  setPlaying: (playing) => set({ isPlaying: playing }),
}));
