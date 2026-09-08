import axios from 'axios';
import { config } from '../constants/config';
import { Media } from '../types';

const tmdb = axios.create({
  baseURL: config.tmdbBaseUrl,
  params: {
    api_key: config.tmdbApiKey,
    language: 'fr-FR',
  },
});

const mapMedia = (m: any): Media => ({
  tmdbId: m.id,
  title: m.title || m.name || m.original_title,
  type: m.media_type || (m.first_air_date ? 'tv' : 'movie'),
  posterPath: m.poster_path,
  backdropPath: m.backdrop_path,
  overview: m.overview,
  rating: m.vote_average,
  year: (m.release_date || m.first_air_date || '').split('-')[0],
  genres: [], // Will be filled on detail page
});

export const tmdbService = {
  getTrending: async (type: 'all' | 'movie' | 'tv' = 'all'): Promise<Media[]> => {
    const { data } = await tmdb.get(`/trending/${type}/week`);
    return data.results.map(mapMedia);
  },
  getPopularMovies: async (): Promise<Media[]> => {
    const { data } = await tmdb.get('/movie/popular');
    return data.results.map(mapMedia);
  },
  getPopularSeries: async (): Promise<Media[]> => {
    const { data } = await tmdb.get('/tv/popular');
    return data.results.map(mapMedia);
  },
  getKDramas: async (): Promise<Media[]> => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_genres: 18, with_origin_country: 'KR' },
    });
    return data.results.map(mapMedia);
  },
  getAnime: async (): Promise<Media[]> => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_genres: 16, with_original_language: 'ja', sort_by: 'popularity.desc' },
    });
    return data.results.map(mapMedia);
  },
  getActionMovies: async (): Promise<Media[]> => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_genres: 28, sort_by: 'popularity.desc' },
    });
    return data.results.map(mapMedia);
  },
  getComedies: async (): Promise<Media[]> => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_genres: 35, sort_by: 'popularity.desc' },
    });
    return data.results.map(mapMedia);
  },
  getCompanyMovies: async (companyId: string | number): Promise<Media[]> => {
    const { data } = await tmdb.get('/discover/movie', {
      params: { with_companies: companyId, sort_by: 'popularity.desc' },
    });
    return data.results.map(mapMedia);
  },
  getNetworkSeries: async (networkId: string | number): Promise<Media[]> => {
    const { data } = await tmdb.get('/discover/tv', {
      params: { with_networks: networkId, sort_by: 'popularity.desc' },
    });
    return data.results.map(mapMedia);
  },
  search: async (query: string, type: 'multi' | 'movie' | 'tv' = 'multi'): Promise<Media[]> => {
    const endpoint = type === 'multi' ? '/search/multi' : `/search/${type}`;
    const { data } = await tmdb.get(endpoint, { params: { query } });
    return data.results.map((m: any) => ({
      ...mapMedia(m),
      type: type === 'multi' ? (m.media_type || (m.first_air_date ? 'tv' : 'movie')) : type
    }));
  },
  searchMulti: async (query: string): Promise<Media[]> => {
    const { data } = await tmdb.get('/search/multi', { params: { query } });
    return data.results.map(mapMedia);
  },
  getMovieDetail: async (id: string | number) => {
    const { data } = await tmdb.get(`/movie/${id}`, {
      params: { append_to_response: 'external_ids' }
    });
    return data;
  },
  getSeriesDetail: async (id: string | number) => {
    const { data } = await tmdb.get(`/tv/${id}`, {
      params: { append_to_response: 'external_ids' }
    });
    return data;
  },
  getSeasonDetail: async (id: string | number, season: number) => {
    const { data } = await tmdb.get(`/tv/${id}/season/${season}`);
    return data;
  },
  getVideos: async (id: string | number, type: 'movie' | 'tv') => {
    const { data } = await tmdb.get(`/${type}/${id}/videos`);
    return data.results;
  },
  getRecommendations: async (id: string | number, type: 'movie' | 'tv'): Promise<Media[]> => {
    const { data } = await tmdb.get(`/${type}/${id}/recommendations`);
    return data.results.map(mapMedia);
  },
  getCredits: async (id: string | number, type: 'movie' | 'tv') => {
    const { data } = await tmdb.get(`/${type}/${id}/credits`);
    return data.cast;
  },
  getPerson: async (personId: string | number) => {
    const { data } = await tmdb.get(`/person/${personId}`);
    return data;
  },
  getPersonCredits: async (personId: string | number): Promise<Media[]> => {
    const { data } = await tmdb.get(`/person/${personId}/combined_credits`);
    return data.cast.map(mapMedia);
  },
};
