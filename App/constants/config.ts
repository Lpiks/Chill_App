import Constants from 'expo-constants';

export const config = {
  tmdbApiKey: 'db37a4b3aab009d8e4d0d885751e7ea0',
  apiUrl: Constants.expoConfig?.extra?.apiUrl || 'http://192.168.100.3:5000/api',
  tmdbBaseUrl: 'https://api.themoviedb.org/3',
  imageBaseUrl: 'https://image.tmdb.org/t/p/w342', // Optimized for speed
  backdropBaseUrl: 'https://image.tmdb.org/t/p/original',
};
