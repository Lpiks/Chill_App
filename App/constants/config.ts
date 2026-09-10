import Constants from 'expo-constants';

export const config = {
  tmdbApiKey: process.env.EXPO_PUBLIC_TMDB_API_KEY || '',
  apiUrl: __DEV__ ? process.env.EXPO_PUBLIC_LOCAL_URL : process.env.EXPO_PUBLIC_PROD_URL,
  tmdbBaseUrl: 'https://api.themoviedb.org/3',
  imageBaseUrl: 'https://image.tmdb.org/t/p/w342', // Optimized for speed
  backdropBaseUrl: 'https://image.tmdb.org/t/p/original',
};
