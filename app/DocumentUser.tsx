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

interface DocumentUserParams {
  documentUrls: { [key: string]: string };
  surveyNumber: string;
  ownerName: string;
  status: string;
}

export default function DocumentUser() {
  const route = useRoute();
  const navigation = useNavigation();
  const { documentUrls, surveyNumber, ownerName, status } = route.params as DocumentUserParams;

  const formatDocumentName = (key: string): string => {
    return key
      .split(/(?=[A-Z])/)
      .join(' ')
      .split('_')
      .join(' ')
      .replace(/^\w/, c => c.toUpperCase())
      .trim();
  };

  const documentsList = Object.entries(documentUrls || {}).map(([key, url]) => ({
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
        <Image
          source={{ uri: item.url }}
          style={styles.documentThumbnail}
          resizeMode="cover"
        />
        <View style={styles.overlay}>
          <Ionicons name="eye-outline" size={24} color="#fff" />
        </View>
      </View>
      <Text style={styles.documentName} numberOfLines={2}>
        {item.name}
      </Text>
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
        <Text style={styles.title} numberOfLines={1}>Documents</Text>
      </View>

      <View style={styles.propertyInfo}>
        <Text style={styles.surveyNumber}>Survey #{surveyNumber}</Text>
        <Text style={styles.ownerName}>{ownerName}</Text>
        <View style={[
          styles.statusBadge,
          { backgroundColor: status === 'Pending' ? '#FFC107' : '#4CAF50' }
        ]}>
          <Text style={styles.statusText}>{status}</Text>
        </View>
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
  propertyInfo: {
    padding: 16,
    backgroundColor: '#f8f9fa',
  },
  surveyNumber: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  ownerName: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
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
  documentName: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    padding: 12,
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