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

type RootStackParamList = {
  DocumentGallery: {
    documents: { [key: string]: string };
    title: string;
  };
  // ... other screens in your navigation stack
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'DocumentGallery'>;

interface DocumentRecord {
  id: string;
  surveyNumber: string;
  ownerName: string;
  documentUrls: { [key: string]: string };
  type: 'verification' | 'transfer';
  createdAt: string;
  status?: 'pending' | 'approved' | 'rejected';
}

export default function AdminDocuments() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<DocumentRecord[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'verification' | 'transfer'>('all');
  const navigation = useNavigation<NavigationProp>();

  useEffect(() => {
    fetchAllDocuments();
  }, []);

  useEffect(() => {
    filterDocuments();
  }, [searchQuery, documents, activeFilter]);

  const filterDocuments = () => {
    let filtered = [...documents];

    // Apply type filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(doc => doc.type === activeFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(doc =>
        doc.surveyNumber.toLowerCase().includes(query) ||
        doc.ownerName.toLowerCase().includes(query)
      );
    }

    setFilteredDocuments(filtered);
  };

  const fetchAllDocuments = async () => {
    try {
      setLoading(true);
      const allDocuments: DocumentRecord[] = [];

      // Fetch from landVerifications
      const verificationRef = ref(database, 'landVerifications');
      const verificationSnapshot = await get(verificationRef);
      
      if (verificationSnapshot.exists()) {
        const verificationData = verificationSnapshot.val();
        Object.entries(verificationData).forEach(([key, value]: [string, any]) => {
          if (value.documentUrls) {
            allDocuments.push({
              id: key,
              surveyNumber: value.surveyNumber || 'N/A',
              ownerName: value.ownerName || 'N/A',
              documentUrls: value.documentUrls,
              type: 'verification',
              createdAt: value.createdAt || new Date().toISOString(),
              status: value.status || 'pending'
            });
          }
        });
      }

      // Fetch from propertyTransfers
      const transferRef = ref(database, 'propertyTransfers');
      const transferSnapshot = await get(transferRef);
      
      if (transferSnapshot.exists()) {
        const transferData = transferSnapshot.val();
        Object.entries(transferData).forEach(([key, value]: [string, any]) => {
          if (value.documents) {
            allDocuments.push({
              id: key,
              surveyNumber: value.surveyNumber || 'N/A',
              ownerName: value.fromName || 'N/A',
              documentUrls: value.documents,
              type: 'transfer',
              createdAt: value.requestedAt || new Date().toISOString(),
              status: value.status || 'pending'
            });
          }
        });
      }

      // Sort by date (newest first)
      allDocuments.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setDocuments(allDocuments);
      setFilteredDocuments(allDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const showDocuments = (record: DocumentRecord) => {
    navigation.navigate('DocumentGallery', {
      documents: record.documentUrls,
      title: `Survey #${record.surveyNumber} Documents`
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'approved': return '#4CAF50';
      case 'rejected': return '#F44336';
      default: return '#FFC107';
    }
  };

  const renderDocumentItem = ({ item }: { item: DocumentRecord }) => (
    <TouchableOpacity
      style={styles.documentCard}
      onPress={() => showDocuments(item)}
    >
      <View style={styles.documentInfo}>
        <View style={styles.headerRow}>
          <Text style={styles.surveyNumber}>Survey #{item.surveyNumber}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>
              {(item.status || 'pending').charAt(0).toUpperCase() + (item.status || 'pending').slice(1)}
            </Text>
          </View>
        </View>
        <Text style={styles.ownerName}>{item.ownerName}</Text>
        <View style={styles.footerRow}>
          <Text style={styles.documentType}>
            {item.type === 'verification' ? 'Verification Documents' : 'Transfer Documents'}
          </Text>
          <Text style={styles.date}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={24} color="#666" />
    </TouchableOpacity>
  );

  const FilterButton = ({ type, label }: { type: typeof activeFilter, label: string }) => (
    <TouchableOpacity
      style={[styles.filterButton, activeFilter === type && styles.filterButtonActive]}
      onPress={() => setActiveFilter(type)}
    >
      <Text style={[styles.filterButtonText, activeFilter === type && styles.filterButtonTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <Text style={styles.title}>Property Documents</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by survey number or owner name"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#666"
        />
      </View>

      <View style={styles.filterContainer}>
        <FilterButton type="all" label="All" />
        <FilterButton type="verification" label="Verifications" />
        <FilterButton type="transfer" label="Transfers" />
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
    fontWeight: 'bold',
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
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#4a90e2',
  },
  filterButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  documentInfo: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  surveyNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  ownerName: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  documentType: {
    fontSize: 14,
    color: '#888',
  },
  date: {
    fontSize: 12,
    color: '#888',
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
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
  },
  listContainer: {
    paddingVertical: 16,
  },
});
