import { create } from 'zustand';
import { User, FriendRequest } from '../types';

interface FriendStore {
  friends: any[];
  pendingReceived: FriendRequest[];
  pendingSent: FriendRequest[];
  unreadNotifications: number;
  setFriends: (friends: any[]) => void;
  setRequests: (received: FriendRequest[], sent: FriendRequest[]) => void;
  setUnreadNotifications: (count: number) => void;
}

export const useFriendStore = create<FriendStore>((set) => ({
  friends: [],
  pendingReceived: [],
  pendingSent: [],
  unreadNotifications: 0,
  setFriends: (friends) => set({ friends }),
  setRequests: (received, sent) => set({ 
    pendingReceived: received, 
    pendingSent: sent,
  }),
  setUnreadNotifications: (count) => set({ unreadNotifications: count }),
}));
