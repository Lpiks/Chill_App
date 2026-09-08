import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.100.3:5000/api';

const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem('userToken');
  return { Authorization: `Bearer ${token}` };
};

export const searchMovies = async (query: string, type: 'movie' | 'series' = 'movie') => {
  try {
    const response = await axios.get(`${API_URL}/browsing/search?query=${encodeURIComponent(query)}&type=${type}`);
    return response.data;
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
};

export const getTrending = async (category?: string) => {
  try {
    const url = category ? `${API_URL}/trending?category=${category}` : `${API_URL}/trending`;
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error('Error fetching trending:', error);
    return [];
  }
};

export const getWatchlist = async () => {
  const headers = await getAuthHeaders();
  const response = await axios.get(`${API_URL}/browsing/watchlist`, { headers });
  return response.data;
};

export const addToWatchlist = async (mediaData: any) => {
  const headers = await getAuthHeaders();
  const response = await axios.post(`${API_URL}/browsing/watchlist`, mediaData, { headers });
  return response.data;
};

export const getProgress = async () => {
  const headers = await getAuthHeaders();
  const response = await axios.get(`${API_URL}/browsing/progress`, { headers });
  return response.data;
};
