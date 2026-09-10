import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Image, 
  ActivityIndicator 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { colors } from '../../constants/colors';
import { PremiumAlert } from '../../utils/PremiumAlert';
import { User } from '../../types';

export default function NewConversationScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [groupName, setGroupName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { data: friends, isLoading } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const { data } = await api.get('/friends');
      return data as any[];
    },
  });

  const filteredFriends = friends?.filter((f: any) => 
    f?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleFriend = (id: string) => {
    if (selectedFriends.includes(id)) {
      setSelectedFriends(prev => prev.filter(fid => fid !== id));
    } else {
      setSelectedFriends(prev => [...prev, id]);
    }
  };

  const handleCreate = async () => {
    if (selectedFriends.length === 0) return;
    if (selectedFriends.length > 1 && !groupName.trim()) {
      PremiumAlert.alert('Erreur', 'Veuillez donner un nom au groupe');
      return;
    }

    setIsCreating(true);
    try {
      const { data } = await api.post('/conversations', {
        memberIds: selectedFriends,
        name: selectedFriends.length > 1 ? groupName : undefined
      });
      router.replace(`/dm/${data._id}`);
    } catch (e) {
      PremiumAlert.alert('Erreur', 'Erreur lors de la création de la conversation');
    } finally {
      setIsCreating(false);
    }
  };

  const renderFriend = ({ item }: { item: any }) => {
    const isSelected = selectedFriends.includes(item.id);
    return (
      <TouchableOpacity 
        style={styles.friendItem}
        onPress={() => toggleFriend(item.id)}
      >
        <Image source={{ uri: item.avatar }} style={styles.avatar} />
        <Text style={styles.name}>{item.name}</Text>
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelText}>Annuler</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Nouveau message</Text>
        <TouchableOpacity 
          onPress={handleCreate}
          disabled={selectedFriends.length === 0 || isCreating}
        >
          {isCreating ? (
            <ActivityIndicator color={colors.red} size="small" />
          ) : (
            <Text style={[styles.createText, selectedFriends.length === 0 && styles.disabledText]}>
              {selectedFriends.length > 1 ? 'Créer' : 'Chat'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {selectedFriends.length > 1 && (
        <View style={styles.groupInputContainer}>
          <TextInput
            style={styles.groupInput}
            placeholder="Nom du groupe..."
            placeholderTextColor="#757575"
            value={groupName}
            onChangeText={setGroupName}
          />
        </View>
      )}

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#757575" />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher des amis..."
          placeholderTextColor="#757575"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlashList
        data={filteredFriends || []}
        renderItem={renderFriend}
        {...({ estimatedItemSize: 60 } as any)}
        keyExtractor={(item: any) => item._id}
        ListEmptyComponent={
          !isLoading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Aucun ami trouvé</Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 15 
  },
  title: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  cancelText: { color: 'white', fontSize: 16 },
  createText: { color: colors.red, fontSize: 16, fontWeight: 'bold' },
  disabledText: { opacity: 0.5 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a28',
    marginHorizontal: 20,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 20
  },
  searchInput: { flex: 1, height: 40, color: 'white', marginLeft: 10 },
  groupInputContainer: { paddingHorizontal: 20, marginBottom: 15 },
  groupInput: { borderBottomWidth: 1, borderBottomColor: '#333', color: 'white', fontSize: 16, paddingVertical: 10 },
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12
  },
  avatar: { width: 45, height: 45, borderRadius: 22.5, marginRight: 15 },
  name: { color: 'white', fontSize: 16, flex: 1 },
  checkbox: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    borderWidth: 2, 
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkboxSelected: { backgroundColor: colors.red, borderColor: colors.red },
  emptyContainer: { flex: 1, alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#757575', fontSize: 16 }
});
