import { create } from 'zustand';

interface PresenceState {
  onlineUsers: string[];
  setOnlineUsers: (users: string[]) => void;
  addOnlineUser: (userId: string) => void;
  removeOnlineUser: (userId: string) => void;
  isUserOnline: (userId: string) => boolean;
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  onlineUsers: [],
  setOnlineUsers: (users) => set({ onlineUsers: users }),
  addOnlineUser: (userId) => set((state) => {
    if (state.onlineUsers.includes(userId)) return state;
    return { onlineUsers: [...state.onlineUsers, userId] };
  }),
  removeOnlineUser: (userId) => set((state) => ({
    onlineUsers: state.onlineUsers.filter(id => id !== userId)
  })),
  isUserOnline: (userId) => get().onlineUsers.includes(userId),
}));
