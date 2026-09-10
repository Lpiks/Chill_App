import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = __DEV__ ? process.env.EXPO_PUBLIC_LOCAL_URL : process.env.EXPO_PUBLIC_PROD_URL;

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

export const discover = async (params: { type: string; year?: string; language?: string; country?: string; genres?: string; page?: number }) => {
  let url = `${API_URL}/browsing/discover?type=${params.type}`;
  if (params.year) url += `&year=${params.year}`;
  if (params.language) url += `&language=${params.language}`;
  if (params.country) url += `&country=${params.country}`;
  if (params.genres) url += `&genres=${params.genres}`;
  if (params.page) url += `&page=${params.page}`;
  
  const response = await axios.get(url);
  return response.data.map((m: any) => ({
    ...m,
    tmdbId: m.id,
    type: (params.type === 'series' || params.type === 'tv') ? 'tv' : 'movie',
    posterPath: m.poster_path,
    score: m.vote_average
  }));
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
