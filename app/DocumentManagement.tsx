import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { database } from '../firebaseConfig';
import { ref, get } from 'firebase/database';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAuth } from 'firebase/auth';

type RootStackParamList = {
  DocumentUser: {
    documentUrls: { [key: string]: string };
    surveyNumber: string;
    ownerName: string;
    status: string;
  };
  // ... other screens
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'DocumentUser'>;

interface DocumentRecord {
  id: string;
  surveyNumber: string;
  ownerName: string;
  status: string;
  documentUrls: { [key: string]: string };
  type: 'verification' | 'transfer';
}

export default function DocumentManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentRecord[]>([]);
  const navigation = useNavigation<NavigationProp>();
  const currentUser = getAuth().currentUser;

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [searchQuery, documents]);

  const filterDocuments = () => {
    if (!searchQuery.trim()) {
      setFilteredDocuments(documents);
      return;
    }

    const filtered = documents.filter(doc =>
      doc.surveyNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.ownerName.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredDocuments(filtered);
  };

  const fetchDocuments = async () => {
    if (!currentUser?.email) return;

    try {
      setLoading(true);
      const allDocuments: DocumentRecord[] = [];

      // Fetch from propertyTransfers
      const transferRef = ref(database, 'propertyTransfers');
      const transferSnapshot = await get(transferRef);
      
      if (transferSnapshot.exists()) {
        const transferData = transferSnapshot.val();
        Object.entries(transferData).forEach(([key, value]: [string, any]) => {
          if (value.fromEmail === currentUser.email) {
            allDocuments.push({
              id: key,
              surveyNumber: value.surveyNumber || 'N/A',
              ownerName: value.fromName || 'N/A',
              status: value.isVerified ? 'Transferred' : 'Pending',
              documentUrls: value.documents || {},
              type: 'transfer'
            });
          }
        });
      }

      // Fetch from landVerifications
      const verificationRef = ref(database, 'landVerifications');
      const verificationSnapshot = await get(verificationRef);
      
      if (verificationSnapshot.exists()) {
        const verificationData = verificationSnapshot.val();
        Object.entries(verificationData).forEach(([key, value]: [string, any]) => {
          if (value.email === currentUser.email) {
            allDocuments.push({
              id: key,
              surveyNumber: value.surveyNumber || 'N/A',
              ownerName: value.ownerName || 'N/A',
              status: value.isVerified ? 'Verified' : 'Pending',
              documentUrls: value.documentUrls || {},
              type: 'verification'
            });
          }
        });
      }

      setDocuments(allDocuments);
      setFilteredDocuments(allDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentPress = (record: DocumentRecord) => {
    navigation.navigate('DocumentUser', {
      documentUrls: record.documentUrls,
      surveyNumber: record.surveyNumber,
      ownerName: record.ownerName,
      status: record.status
    });
  };

  const renderDocumentItem = ({ item }: { item: DocumentRecord }) => (
    <TouchableOpacity
      style={styles.documentCard}
      onPress={() => handleDocumentPress(item)}
    >
      <Text style={styles.surveyNumber}>Survey #{item.surveyNumber}</Text>
      <Text style={styles.ownerName}>{item.ownerName}</Text>
      <View style={[
        styles.statusBadge,
        { backgroundColor: item.status === 'Pending' ? '#FFC107' : '#4CAF50' }
      ]}>
        <Text style={styles.statusText}>{item.status}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>My Documents</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by survey number"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#666"
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4a90e2" />
          <Text style={styles.loadingText}>Loading documents...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredDocuments}
          renderItem={renderDocumentItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>
                {searchQuery.trim() 
                  ? "No documents match your search"
                  : "No documents found"}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    margin: 16,
    borderRadius: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  listContainer: {
    padding: 16,
  },
  documentCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  surveyNumber: {
    fontSize: 18,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
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
