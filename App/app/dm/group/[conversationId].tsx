import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  ScrollView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';
import { colors } from '../../../constants/colors';
import { Conversation, User } from '../../../types';
import { useAuthStore } from '../../../store/authStore';

export default function GroupInfoScreen() {
  const { conversationId } = useLocalSearchParams();
  const router = useRouter();
  const { user: currentUser } = useAuthStore();

  const { data: conversation, isLoading } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      const { data } = await api.get(`/conversations`);
      return (data as Conversation[]).find(c => c._id === conversationId);
    },
  });

  const isCreator = conversation?.creator === currentUser?._id;

  const handleLeaveGroup = async () => {
    try {
      await api.delete(`/conversations/${conversationId}/members/${currentUser?._id}`);
      router.replace('/dm');
    } catch (e) {
      alert('Erreur lors de la sortie du groupe');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      await api.delete(`/conversations/${conversationId}/members/${userId}`);
      // Refetch logic usually needed or optimistic update
    } catch (e) {}
  };

  if (isLoading) return null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Infos du groupe</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.groupProfile}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>{conversation?.name?.charAt(0)}</Text>
          </View>
          <Text style={styles.groupName}>{conversation?.name}</Text>
          <Text style={styles.memberCount}>{conversation?.members.length} membres</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Membres</Text>
          {conversation?.members.map((member) => (
            <View key={member._id} style={styles.memberItem}>
              <Image source={{ uri: member.avatar }} style={styles.memberAvatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.memberName}>{member.name}</Text>
                {member._id === conversation.creator && (
                  <Text style={styles.adminTag}>Admin</Text>
                )}
              </View>
              {isCreator && member._id !== currentUser?._id && (
                <TouchableOpacity onPress={() => handleRemoveMember(member._id)}>
                  <Text style={styles.removeText}>Retirer</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveGroup}>
          <Ionicons name="log-out-outline" size={24} color={colors.red} />
          <Text style={styles.leaveText}>Quitter le groupe</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  content: { paddingBottom: 40 },
  groupProfile: { alignItems: 'center', paddingVertical: 30 },
  avatarLarge: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.red, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: 'white', fontSize: 40, fontWeight: 'bold' },
  groupName: { color: 'white', fontSize: 22, fontWeight: 'bold', marginTop: 15 },
  memberCount: { color: '#757575', fontSize: 14, marginTop: 5 },
  section: { marginTop: 20, paddingHorizontal: 20 },
  sectionTitle: { color: '#757575', fontSize: 14, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 15 },
  memberItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  memberAvatar: { width: 45, height: 45, borderRadius: 22.5, marginRight: 15 },
  memberName: { color: 'white', fontSize: 16, fontWeight: '600' },
  adminTag: { color: colors.red, fontSize: 12, fontWeight: 'bold' },
  removeText: { color: colors.red, fontSize: 14 },
  leaveBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 40, 
    borderTopWidth: 1, 
    borderTopColor: '#1a1a28',
    paddingTop: 20
  },
  leaveText: { color: colors.red, fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
});
