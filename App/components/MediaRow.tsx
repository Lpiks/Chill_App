import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { MediaCard } from './MediaCard';
import { colors } from '../constants/colors';
import { Skeleton } from './ui/Skeleton';
import { Media } from '../types';

interface MediaRowProps {
  title: string;
  data: Media[];
  onPressItem: (item: Media) => void;
  onSeeAll?: () => void;
  loading?: boolean;
}

export const MediaRow = ({ title, data, onPressItem, onSeeAll, loading }: MediaRowProps) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {onSeeAll && (
          <TouchableOpacity onPress={onSeeAll}>
            <Text style={styles.seeAll}>Voir tout</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlashList
        data={loading ? Array(5).fill({}) : data}
        renderItem={({ item, index }) => 
          loading ? (
            <View style={{ marginRight: 12 }}>
              <Skeleton width={110} height={165} />
            </View>
          ) : (
            <MediaCard item={item} onPress={() => onPressItem(item)} />
          )
        }
        horizontal
        showsHorizontalScrollIndicator={false}
        estimatedItemSize={110}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 25 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: {
    color: colors.white,
    fontSize: 20,
    fontFamily: 'BebasNeue_400Regular',
    letterSpacing: 1,
  },
  seeAll: {
    color: colors.red,
    fontSize: 14,
    fontFamily: 'Nunito_400Regular',
  },
  listContent: {
    paddingLeft: 16,
    paddingRight: 16,
  },
});
