import Constants from 'expo-constants';

export const config = {
  tmdbApiKey: 'db37a4b3aab009d8e4d0d885751e7ea0',
  apiUrl: __DEV__ ? process.env.EXPO_PUBLIC_LOCAL_URL : process.env.EXPO_PUBLIC_PROD_URL,
  tmdbBaseUrl: 'https://api.themoviedb.org/3',
  imageBaseUrl: 'https://image.tmdb.org/t/p/w342', // Optimized for speed
  backdropBaseUrl: 'https://image.tmdb.org/t/p/original',
};
