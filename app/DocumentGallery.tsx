import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  DocumentPreview: {
    documentUrl: string;
    documentName: string;
  };
  // ... other screens
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'DocumentPreview'>;

interface DocumentGalleryParams {
  documents: { [key: string]: string };
  title?: string;
}

export default function DocumentGallery() {
  const route = useRoute();
  const navigation = useNavigation<NavigationProp>();
  const { documents, title = 'Document Gallery' } = route.params as DocumentGalleryParams;

  const formatDocumentName = (key: string): string => {
    return key
      .split(/(?=[A-Z])/)
      .join(' ')
      .split('_')
      .join(' ')
      .replace(/^\w/, c => c.toUpperCase())
      .trim();
  };

  const documentsList = Object.entries(documents || {}).map(([key, url]) => ({
    id: key,
    name: formatDocumentName(key),
    url: url as string,
  }));

  const handleDocumentPress = (url: string, name: string) => {
    navigation.navigate('DocumentPreview', { documentUrl: url, documentName: name });
  };

  const renderItem = ({ item }: { item: { id: string; name: string; url: string } }) => (
    <TouchableOpacity
      style={styles.documentCard}
      onPress={() => handleDocumentPress(item.url, item.name)}
    >
      <View style={styles.imageContainer}>
        {item.url.toLowerCase().endsWith('.pdf') ? (
          <View style={[styles.documentThumbnail, styles.pdfPlaceholder]}>
            <Ionicons name="document-text-outline" size={40} color="#4a90e2" />
          </View>
        ) : (
          <Image
            source={{ uri: item.url }}
            style={styles.documentThumbnail}
            resizeMode="cover"
          />
        )}
        <View style={styles.overlay}>
          <Ionicons name="eye-outline" size={24} color="#fff" />
        </View>
      </View>
      <View style={styles.documentInfo}>
        <Text style={styles.documentName} numberOfLines={2}>
          {item.name}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>

      <FlatList
        data={documentsList}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.galleryContainer}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No documents available</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  galleryContainer: {
    padding: 12,
  },
  documentCard: {
    flex: 1,
    margin: 6,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  imageContainer: {
    position: 'relative',
  },
  documentThumbnail: {
    width: '100%',
    height: 160,
    backgroundColor: '#f5f5f5',
  },
  pdfPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentInfo: {
    padding: 12,
  },
  documentName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
