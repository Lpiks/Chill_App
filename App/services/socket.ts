import { io, Socket } from 'socket.io-client';
import { config } from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

let socket: Socket | null = null;

export const getSocket = async () => {
  if (socket?.connected) return socket;

  const token = await AsyncStorage.getItem('cinedz_token');
  
  // Connect to root domain (socket.io default)
  const baseUrl = config.apiUrl.split('/api')[0];
  
  socket = io(baseUrl, {
    auth: { token },
    transports: ['websocket'],
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
