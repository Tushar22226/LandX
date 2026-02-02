import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { useRouter } from 'expo-router';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';
import { database } from '../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUserEmail } from './utils/firebaseUtils';
import { useFocusEffect } from '@react-navigation/native';

interface PropertyData {
  id: string;
  surveyNumber: string;
  district: string;
  state: string;
  city: string;
  landSize: string;
  sizeUnit: string;
  ownerName: string;
  propertyId?: string;
  verifiedAt: string;
  createdAt: string;
  ownershipStatus: boolean;
  transferStatus?: string;
  transferPending?: boolean;
  transferredTo?: string;
  transferRequestedAt?: string;
  transferToName?: string;
  rejectReason?: string;
  [key: string]: any; // For other properties
}

export default function PropertyOwned() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<PropertyData[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<PropertyData[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  // Get current user's email and fetch properties
  useEffect(() => {
    const initialize = async () => {
      try {
        const email = await getCurrentUserEmail();
        setUserEmail(email);
        
        if (email) {
          await fetchOwnedProperties(email);
        } else {
          Alert.alert('Error', 'Unable to determine current user. Please sign in again.');
        }
      } catch (error) {
        console.error('Error initializing:', error);
        Alert.alert('Error', 'Failed to initialize. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("PropertyOwned screen focused - refreshing data");
      const refreshData = async () => {
        if (userEmail) {
          await fetchOwnedProperties(userEmail);
        }
      };
      
      refreshData();
      
      return () => {
        // Cleanup when screen loses focus
      };
    }, [userEmail])
  );
  
  // Handle manual refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (userEmail) {
        await fetchOwnedProperties(userEmail);
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [userEmail]);

  // Filter properties based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = properties.filter(property => 
        property.surveyNumber.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProperties(filtered);
    } else {
      setFilteredProperties(properties);
    }
  }, [searchQuery, properties]);

  const fetchOwnedProperties = async (email: string) => {
    try {
      setLoading(true);
      
      // First check landOwners path where applicantEmail equals current user's email
      const landOwnersRef = ref(database, 'landOwners');
      const landOwnersSnapshot = await get(landOwnersRef);
      
      const ownedProperties: PropertyData[] = [];
      const propertyIdsAdded = new Set(); // Track IDs to prevent duplicates
      
      if (landOwnersSnapshot.exists()) {
        const data = landOwnersSnapshot.val();
        
        Object.keys(data).forEach(key => {
          // Check for any properties related to the current user (owned or previously owned)
          const property = data[key];
          const isCurrentOwner = (property.applicantEmail === email || property.email === email);
          const isPreviousOwner = (property.previousOwnerEmail === email);
          
          // Include all properties where the user is either current or previous owner
          if (isCurrentOwner || isPreviousOwner) {
            // For debugging
            console.log(`Found property ${key} for ${email}, current owner: ${isCurrentOwner}, previous owner: ${isPreviousOwner}`);
            
            // Check for duplicate before adding
            if (!propertyIdsAdded.has(key)) {
              propertyIdsAdded.add(key);
              
              ownedProperties.push({
                id: key,
                ...property,
                // If this user is only the previous owner, mark it as not owned
                ownershipStatus: isCurrentOwner ? (property.ownershipStatus !== false) : false
              });
            }
          }
        });
      }
      
      // Also check transferPending properties through propertyTransfers
      const transfersRef = ref(database, 'propertyTransfers');
      const transfersSnapshot = await get(transfersRef);
      
      if (transfersSnapshot.exists()) {
        const transfers = transfersSnapshot.val();
        
        // Check if the current user is involved in any pending transfers
        for (const key in transfers) {
          const transfer = transfers[key];
          
          // If this user is the sender and the transfer is still pending
          if ((transfer.fromEmail === email) && transfer.status === 'pending') {
            // Check if we already have this property in the list
            const existingIndex = ownedProperties.findIndex(p => p.id === transfer.originalId);
            
            if (existingIndex >= 0) {
              // Update existing property with transfer info
              ownedProperties[existingIndex].transferPending = true;
              ownedProperties[existingIndex].transferId = key;
              ownedProperties[existingIndex].transferStatus = 'pending';
              ownedProperties[existingIndex].transferRequestedAt = transfer.createdAt;
              ownedProperties[existingIndex].transferToName = transfer.toName;
            }
          }
          
          // If the transfer has been processed (approved/rejected)
          if (transfer.isVerified && (transfer.fromEmail === email || transfer.toEmail === email)) {
            // Find related property
            const existingIndex = ownedProperties.findIndex(p => p.id === transfer.originalId);
            
            if (existingIndex >= 0) {
              // Update with transfer status
              ownedProperties[existingIndex].transferStatus = transfer.status;
              
              if (transfer.status === 'rejected') {
                ownedProperties[existingIndex].transferPending = false;
                ownedProperties[existingIndex].rejectReason = transfer.rejectReason;
              }
            }
          }
        }
      }
      
      // Perform a final deduplication based on surveyNumber
      const dedupedProperties: PropertyData[] = [];
      const surveyNumbersAdded = new Set<string>();
      
      ownedProperties.forEach(property => {
        if (!surveyNumbersAdded.has(property.surveyNumber)) {
          surveyNumbersAdded.add(property.surveyNumber);
          dedupedProperties.push(property);
        } else {
          console.log(`Filtering out duplicate property with survey number ${property.surveyNumber}`);
        }
      });
      
      // Sort by creation date (newest first)
      dedupedProperties.sort((a, b) => {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
      
      console.log(`Loaded ${dedupedProperties.length} unique properties for ${email} (from ${ownedProperties.length} total)`);
      setProperties(dedupedProperties);
      setFilteredProperties(dedupedProperties);
    } catch (error) {
      console.error('Error fetching owned properties:', error);
      Alert.alert('Error', 'Failed to fetch your properties. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTransferProperty = (property: PropertyData) => {
    router.push({
      pathname: '/PropertyTransfer',
      params: {
        propertyId: property.id,
        propertyData: JSON.stringify(property)
      }
    });
  };

  const renderPropertyItem = ({ item }: { item: PropertyData }) => {
    // Dump the raw property data to console for debugging
    console.log("Property data:", JSON.stringify(item, null, 2));

    // Determine the property status - prioritize transferStatus field
    let statusText = "Verified";
    let statusColor = "#4CAF50"; // green

    // Handle completed transfers first (highest priority)
    if (item.transferStatus === "completed" || item.ownershipStatus === false) {
      statusText = "Transferred";
      statusColor = "#2196F3"; // blue
    }
    // Then handle rejected transfers
    else if (item.transferStatus === "rejected") {
      statusText = "Transfer Failed";
      statusColor = "#F44336"; // red
    } 
    // Then handle pending transfers
    else if (item.transferStatus === "pending" || item.transferPending === true) {
      statusText = "Transferring";
      statusColor = "#FFA000"; // orange
    }

    console.log(`Property ${item.id} with status: ${statusText} (${statusColor})`);
    console.log(`- transferStatus: ${item.transferStatus}`);
    console.log(`- transferPending: ${item.transferPending}`);
    console.log(`- ownershipStatus: ${item.ownershipStatus}`);

    return (
      <View style={styles.propertyCard}>
        <View style={styles.propertyHeader}>
          <Text style={styles.propertyId}>ID: {item.propertyId || `PROP-${item.surveyNumber}`}</Text>
          <Text style={[
            styles.verificationStatus, 
            { backgroundColor: statusColor, color: 'white' }
          ]}>
            {statusText}
          </Text>
        </View>
        
        <Text style={styles.surveyNumber}>Survey #{item.surveyNumber}</Text>
        
        <View style={styles.propertyDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location:</Text>
            <Text style={styles.detailValue}>{item.district}, {item.state}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Size:</Text>
            <Text style={styles.detailValue}>{item.landSize} {item.sizeUnit}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Owner:</Text>
            <Text style={styles.detailValue}>{item.ownerName}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Verified On:</Text>
            <Text style={styles.detailValue}>
              {item.verifiedAt ? new Date(item.verifiedAt).toLocaleDateString() : 'Not available'}
            </Text>
          </View>
        </View>
        
        {/* Only show transfer button if property is still owned by current user */}
        {(item.ownershipStatus !== false && item.transferPending !== true) && (
          <TouchableOpacity 
            style={styles.transferButton}
            onPress={() => handleTransferProperty(item)}
          >
            <Ionicons name="swap-horizontal" size={18} color="#fff" />
            <Text style={styles.transferButtonText}>Transfer Property</Text>
          </TouchableOpacity>
        )}
        
        {/* Show transfer details if property is in transfer process */}
        {item.transferPending === true && (
          <View style={styles.transferInfo}>
            <Text style={styles.transferInfoText}>
              Transfer requested on {new Date(item.transferRequestedAt || Date.now()).toLocaleDateString()}
            </Text>
            <Text style={styles.transferInfoText}>
              To: {item.transferToName || "New Owner"}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Your Properties</Text>
      </View>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by survey number..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            style={styles.clearButton}
          >
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4a90e2" />
          <Text style={styles.loadingText}>Loading your properties...</Text>
        </View>
      ) : filteredProperties.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            {searchQuery.trim() 
              ? "No properties match your search." 
              : "You don't have any verified properties yet."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredProperties}
          renderItem={renderPropertyItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#4a90e2"]}
            />
          }
        />
      )}
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
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    margin: 16,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
  },
  clearButton: {
    padding: 4,
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
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  propertyCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  propertyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  propertyId: {
    fontSize: 14,
    color: '#666',
  },
  verificationStatus: {
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  surveyNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  propertyDetails: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    width: 100,
    color: '#555',
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
    color: '#333',
  },
  transferButton: {
    backgroundColor: '#4a90e2',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  transferButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  transferInfo: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FFF9C4',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#FFA000',
  },
  transferInfoText: {
    fontSize: 12,
    color: '#5D4037',
    marginBottom: 2,
  },
});
