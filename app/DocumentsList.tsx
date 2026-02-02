import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';

export default function DocumentsList() {
  const route = useRoute();
  const navigation = useNavigation();
  const { documents } = route.params as { documents: { [key: string]: string } };

  const documentsList = Object.entries(documents).map(([key, url]) => ({
    id: key,
    name: key.split(/(?=[A-Z])/).join(' '),
    url,
  }));

  const handleDocumentPress = (url: string, name: string) => {
    // Use your existing DocumentPreview component or handle document viewing
    navigation.navigate('DocumentPreview', { url, name });
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.documentItem}
      onPress={() => handleDocumentPress(item.url, item.name)}
    >
      <Image
        source={{ uri: item.url }}
        style={styles.documentThumbnail}
        resizeMode="cover"
      />
      <View style={styles.documentInfo}>
        <Text style={styles.documentName}>{item.name}</Text>
        <Ionicons name="eye-outline" size={24} color="#4a90e2" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Documents</Text>
      </View>

      <FlatList
        data={documentsList}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        numColumns={2}
      />
    </View>
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
    marginRight: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  listContainer: {
    padding: 16,
  },
  documentItem: {
    flex: 1,
    margin: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  documentThumbnail: {
    width: '100%',
    height: 150,
    backgroundColor: '#f5f5f5',
  },
  documentInfo: {
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  documentName: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
});