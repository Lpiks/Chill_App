export interface User {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  subscriptionTier: 'free' | 'basic' | 'standard' | 'premium';
  tasteProfile: {
    genres: Record<string, number>;
    languages: string[];
  };
  createdAt: string;
}

export interface Media {
  tmdbId: number;
  title: string;
  type: 'movie' | 'tv';
  posterPath: string;
  backdropPath: string;
  overview: string;
  rating: number;
  year: string;
  genres: string[];
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  type: 'text' | 'voice' | 'card';
  createdAt: string;
  seen: boolean;
}

export interface Room {
  roomId: string;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  season?: number;
  episode?: number;
  members: string[];
}

export interface Post {
  id: string;
  userId: string;
  media: Media;
  rating: number;
  likes: string[];
  comments: number;
  createdAt: string;
}

export interface FriendRequest {
  _id: string;
  requester: Partial<User>;
  recipient: Partial<User>;
  status: 'pending' | 'accepted';
  createdAt: string;
}

export interface Notification {
  _id: string;
  type: 'friend_request' | 'request_accepted' | 'post_like' | 'post_comment' | 'watch_party_invite';
  fromUser: Partial<User>;
  data?: any;
  read: boolean;
  createdAt: string;
}

export interface Conversation {
  _id: string;
  type: 'direct' | 'group';
  name?: string;
  avatar?: string;
  members: User[];
  creator: string;
  lastMessage?: {
    content: string;
    type: 'text' | 'voice' | 'media';
    senderId: string;
    createdAt: string;
  };
  unreadCounts: Array<{ userId: string; count: number }>;
  createdAt: string;
}

export interface Message {
  _id: string;
  conversationId: string;
  senderId: User;
  type: 'text' | 'voice' | 'media';
  content?: string;
  mediaUrl?: string;
  duration?: number;
  tmdbData?: {
    tmdbId: number;
    mediaType: string;
    title: string;
    posterPath: string;
    rating: number;
    year: number;
  };
  status: 'sent' | 'delivered' | 'seen';
  createdAt: string;
}
