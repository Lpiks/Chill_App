import axios from 'axios';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.apiUrl || 'http://192.168.100.3:5000/api';

export const getFeed = async (page = 1) => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    const response = await axios.get(`${API_URL}/posts?page=${page}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching feed:', error);
    return { posts: [], hasNextPage: false, currentPage: 1 };
  }
};

export const likePost = async (postId: string) => {
  const response = await axios.post(`${API_URL}/posts/${postId}/like`);
  return response.data;
};

export const addComment = async (postId: string, text: string) => {
  const response = await axios.post(`${API_URL}/posts/${postId}/comments`, { text });
  return response.data;
};

export const getComments = async (postId: string) => {
  const response = await axios.get(`${API_URL}/posts/${postId}/comments`);
  return response.data;
};

export const createPost = async (postData: any) => {
  const response = await axios.post(`${API_URL}/posts`, postData);
  return response.data;
};
