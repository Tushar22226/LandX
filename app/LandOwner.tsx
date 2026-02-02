import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { ref, get, query, orderByChild } from 'firebase/database';
import { database } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

type RootStackParamList = {
  LandOwnerDetails: {
    landOwnerData: LandOwnerRecord;
    verificationData: {
      id: string;
      landSize?: string | number;
      sizeUnit?: string;
      ownerName: string;
      contactNumber: string;
      email: string;
      dateOfBirth: string;
      landType: string;
      landPrice: string | number;
      encumbranceStatus: string;
      residentialAddress: string;
      latitude: number;
      longitude: number;
      documentUrls?: Record<string, string>;
    };
  };
};

type LandOwnerRecord = {
  id: string;
  applicantEmail: string;
  city: string;
  district: string;
  ownerName: string;
  surveyNumber: string;
  propertyId: string;
  transferStatus: string;
  ownershipStatus: boolean;
  verifiedAt: string;
  landSize: string;
  sizeUnit: string;
  verificationId: string;
  transferredAt?: string;  // Add this line - optional string for transfer date
};

export default function LandOwner() {
  const [searchQuery, setSearchQuery] = useState('');
  const [landOwners, setLandOwners] = useState<LandOwnerRecord[]>([]);
  const [filteredOwners, setFilteredOwners] = useState<LandOwnerRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation<NavigationProp<RootStackParamList, 'LandOwnerDetails'>>();

  useEffect(() => {
    fetchLandOwners();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = landOwners.filter(owner =>
        owner.surveyNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        owner.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        owner.propertyId.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredOwners(filtered);
    } else {
      setFilteredOwners(landOwners);
    }
  }, [searchQuery, landOwners]);

  const fetchLandOwners = async () => {
    try {
      setLoading(true);
      const landOwnersRef = ref(database, 'landOwners');
      const snapshot = await get(landOwnersRef);

      if (snapshot.exists()) {
        const ownersData = snapshot.val();
        const ownersArray = Object.entries(ownersData).map(([id, data]: [string, any]) => ({
          id,
          ...data,
          // Add an isCurrentOwner flag to help with rendering
          isCurrentOwner: data.ownershipStatus === true && data.transferStatus !== "completed"
        }));

        // Include all owners (both current and previous)
        const allOwners = ownersArray.sort((a, b) => {
          // Sort by creation date (newest first)
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return dateB - dateA;
        });

        setLandOwners(allOwners);
        setFilteredOwners(allOwners);
      } else {
        setLandOwners([]);
        setFilteredOwners([]);
      }
    } catch (error) {
      console.error('Error fetching land owners:', error);
      Alert.alert('Error', 'Failed to load land owners data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (record: LandOwnerRecord) => {
    try {
      const verificationRef = ref(database, `landVerifications/${record.verificationId}`);
      const snapshot = await get(verificationRef);

      if (snapshot.exists()) {
        const verificationData = snapshot.val();
        console.log('Verification Data:', verificationData);
        // Where "record" is your LandOwnerRecord object
        navigation.navigate('LandOwnerDetails', {
          landOwnerData: JSON.stringify(record), // Now a valid JSON string is passed
          verificationData: JSON.stringify({
            id: record.verificationId,
            ...verificationData,
          }),
        });             
      } else {
        Alert.alert('Error', 'Verification details not found');
      }
    } catch (error) {
      console.error('Error fetching verification details:', error);
      Alert.alert('Error', 'Failed to load verification details');
    }
  };

  const renderOwnerCard = ({ item }: { item: LandOwnerRecord }) => {
    // Determine the status text and color
    let statusText = "Verified";
    let statusColor = "#4CAF50"; // green

    if (item.transferStatus === "completed") {
      statusText = "Previous Owner";
      statusColor = "#FFA000"; // orange
    } else if (!item.ownershipStatus) {
      statusText = "Pending";
      statusColor = "#666"; // gray
    }

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.propertyId}>{item.propertyId}</Text>
          <Text style={[styles.status, { color: statusColor }]}>
            {statusText}
          </Text>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Survey Number:</Text>
            <Text style={styles.value}>{item.surveyNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Owner:</Text>
            <Text style={styles.value}>{item.ownerName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Location:</Text>
            <Text style={styles.value}>{`${item.city}, ${item.district}`}</Text>
          </View>
          {item.transferStatus === "completed" && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Transfer Date:</Text>
              <Text style={styles.value}>
                {item.transferredAt ? new Date(item.transferredAt).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() => handleViewDetails(item)}
        >
          <Text style={styles.buttonText}>View More Details</Text>
          <Ionicons name="chevron-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by survey number, owner name, or property ID"
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#666"
        />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4a90e2" />
          <Text style={styles.loadingText}>Loading land owners...</Text>
        </View>
      ) : filteredOwners.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            {searchQuery.trim()
              ? "No matching records found"
              : "No land owners registered yet"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredOwners}
          renderItem={renderOwnerCard}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  propertyId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  status: {
    fontSize: 14,
    fontWeight: '500',
  },
  cardBody: {
    marginBottom: 12,
  },
  cardContent: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  detailsButton: {
    backgroundColor: '#4a90e2',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
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
  listContainer: {
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
  },
});
