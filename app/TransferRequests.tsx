import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { ref, get, remove, update } from 'firebase/database';
import { Ionicons } from '@expo/vector-icons';
import { database } from '../firebaseConfig';
import { getCurrentUserEmail } from './utils/firebaseUtils';
import { useFocusEffect } from '@react-navigation/native';

// Define the transfer request interface
interface TransferRequest {
  id: string;
  originalId: string;
  fromEmail: string;
  fromName: string;
  toEmail: string;
  toName: string;
  surveyNumber: string;
  propertyId: string;
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  isVerified: boolean;
  rejectReason?: string;
  verifiedAt?: string;
  [key: string]: any;
}

// Define the simplified property data interface
interface PropertyData {
  id: string;
  surveyNumber: string;
  district: string;
  state: string;
  landSize: string;
  sizeUnit: string;
  landType?: string;
  ownerName: string;
  price?: string;
  createdAt: string;
  [key: string]: any;
}

export default function TransferRequests() {
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<PropertyData | null>(null);
  const [propertyModalVisible, setPropertyModalVisible] = useState(false);
  const router = useRouter();

  // Fetch transfer requests for the current user
  const fetchTransferRequests = async (email: string) => {
    try {
      setLoading(true);
      
      // Get all transfer requests from Firebase
      const transfersRef = ref(database, 'propertyTransfers');
      const transfersSnapshot = await get(transfersRef);
      
      if (transfersSnapshot.exists()) {
        const transfersData = transfersSnapshot.val();
        const userTransfers: TransferRequest[] = [];
        
        // Filter transfers related to current user (either as sender or receiver)
        Object.keys(transfersData).forEach(key => {
          const transfer = transfersData[key];
          
          if (transfer.fromEmail === email || transfer.toEmail === email) {
            userTransfers.push({
              id: key,
              ...transfer
            });
          }
        });
        
        // Sort transfers by date (newest first)
        userTransfers.sort((a, b) => {
          const dateA = new Date(a.requestedAt || 0).getTime();
          const dateB = new Date(b.requestedAt || 0).getTime();
          return dateB - dateA;
        });
        
        console.log(`Found ${userTransfers.length} transfer requests for ${email}`);
        setTransfers(userTransfers);
      } else {
        console.log('No transfer requests found');
        setTransfers([]);
      }
    } catch (error) {
      console.error('Error fetching transfer requests:', error);
      Alert.alert('Error', 'Failed to load your transfer requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initialize component and load user email
  useEffect(() => {
    const initialize = async () => {
      try {
        const email = await getCurrentUserEmail();
        setUserEmail(email);
        
        if (email) {
          await fetchTransferRequests(email);
        } else {
          Alert.alert('Error', 'Unable to determine current user. Please sign in again.');
        }
      } catch (error) {
        console.error('Error initializing:', error);
        Alert.alert('Error', 'Failed to initialize. Please try again later.');
      }
    };

    initialize();
  }, []);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("TransferRequests screen focused - refreshing data");
      if (userEmail) {
        fetchTransferRequests(userEmail);
      }
      
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
        await fetchTransferRequests(userEmail);
      }
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [userEmail]);

  // Delete a transfer request
  const handleDeleteTransfer = async (transferId: string) => {
    Alert.alert(
      'Delete Transfer Request',
      'Are you sure you want to delete this transfer request? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Only allow deleting pending transfers - approved/rejected should remain for record
              const transferRef = ref(database, `propertyTransfers/${transferId}`);
              const snapshot = await get(transferRef);
              
              if (snapshot.exists()) {
                const transfer = snapshot.val();
                
                if (transfer.status === 'pending') {
                  // If pending, we can delete the transfer request
                  await remove(transferRef);
                  
                  // Also update the property to remove the pending transfer status
                  if (transfer.originalId) {
                    const propertyRef = ref(database, `landOwners/${transfer.originalId}`);
                    const propertySnapshot = await get(propertyRef);
                    
                    if (propertySnapshot.exists() && propertySnapshot.val().transferPending) {
                      // Update property to remove transfer pending status
                      const propertyRef = ref(database, `landOwners/${transfer.originalId}`);
                      
                      // In Firebase, setting a field to null effectively removes it
                      await update(propertyRef, {
                        transferPending: null,
                        transferId: null,
                        transferStatus: null,
                        transferRequestedAt: null,
                        transferToName: null,
                        transferToEmail: null
                      });
                    }
                  }
                  
                  // Update the local state
                  setTransfers(prevTransfers => prevTransfers.filter(t => t.id !== transferId));
                  Alert.alert('Success', 'Transfer request deleted successfully');
                } else {
                  // Don't allow deleting approved/rejected transfers
                  Alert.alert(
                    'Cannot Delete',
                    `This transfer request has already been ${transfer.status}. It cannot be deleted.`
                  );
                }
              }
            } catch (error) {
              console.error('Error deleting transfer:', error);
              Alert.alert('Error', 'Failed to delete transfer request');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // View property details in a modal
  const viewPropertyDetails = async (propertyId: string) => {
    try {
      setLoading(true);
      
      // Fetch property details from Firebase
      const propertyRef = ref(database, `landOwners/${propertyId}`);
      const snapshot = await get(propertyRef);
      
      if (snapshot.exists()) {
        const propertyData = {
          id: propertyId,
          ...snapshot.val()
        };
        
        setSelectedProperty(propertyData);
        setPropertyModalVisible(true);
      } else {
        Alert.alert('Error', 'Property details not found');
      }
    } catch (error) {
      console.error('Error fetching property details:', error);
      Alert.alert('Error', 'Failed to load property details');
    } finally {
      setLoading(false);
    }
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString().slice(0, 5);
  };

  // Render a single transfer request item
  const renderTransferItem = ({ item }: { item: TransferRequest }) => {
    // Determine the status badge style
    let statusBadge;
    let statusText = item.status.charAt(0).toUpperCase() + item.status.slice(1);
    
    switch (item.status) {
      case 'approved':
        statusBadge = styles.approvedBadge;
        break;
      case 'rejected':
        statusBadge = styles.rejectedBadge;
        break;
      case 'pending':
      default:
        statusBadge = styles.pendingBadge;
        break;
    }

    // Check if transfer can be deleted (only pending transfers)
    const canDelete = item.status === 'pending';

    return (
      <View style={styles.transferCard}>
        <View style={styles.transferHeader}>
          <View style={styles.transferHeaderLeft}>
            <Text style={styles.propertyId}>ID: {item.propertyId || `PROP-${item.surveyNumber}`}</Text>
            <Text style={[styles.statusBadge, statusBadge]}>{statusText}</Text>
          </View>
          
          {canDelete && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteTransfer(item.id)}
            >
              <Ionicons name="trash-outline" size={20} color="#FF5252" />
            </TouchableOpacity>
          )}
        </View>
        
        <Text style={styles.surveyNumber}>Survey #{item.surveyNumber}</Text>
        
        <View style={styles.transferDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>From:</Text>
            <Text style={styles.detailValue}>{item.fromName}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>To:</Text>
            <Text style={styles.detailValue}>{item.toName}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Requested:</Text>
            <Text style={styles.detailValue}>{formatDate(item.requestedAt)}</Text>
          </View>
          
          {item.status === 'approved' && item.verifiedAt && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Approved:</Text>
              <Text style={styles.detailValue}>{formatDate(item.verifiedAt)}</Text>
            </View>
          )}
          
          {item.status === 'rejected' && item.rejectReason && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reason:</Text>
              <Text style={styles.detailValue}>{item.rejectReason}</Text>
            </View>
          )}
          
          {!canDelete && (
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color="#666" style={{marginRight: 8}} />
              <Text style={styles.infoText}>
                {item.status === 'approved' 
                  ? "Approved transfers cannot be deleted for record-keeping purposes."
                  : "Rejected transfers cannot be deleted for record-keeping purposes."}
              </Text>
            </View>
          )}
        </View>
        
        <TouchableOpacity 
          style={styles.viewDetailsButton}
          onPress={() => viewPropertyDetails(item.originalId)}
        >
          <Text style={styles.viewDetailsText}>View Property Details</Text>
        </TouchableOpacity>
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
        <Text style={styles.title}>Transfer Requests</Text>
      </View>
      
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4a90e2" />
          <Text style={styles.loadingText}>Loading your transfer requests...</Text>
        </View>
      ) : transfers.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>You don't have any transfer requests yet.</Text>
        </View>
      ) : (
        <FlatList
          data={transfers}
          renderItem={renderTransferItem}
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

      {/* Property Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={propertyModalVisible}
        onRequestClose={() => setPropertyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Property Details</Text>
              <TouchableOpacity 
                onPress={() => setPropertyModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            {selectedProperty ? (
              <ScrollView style={styles.propertyDetailScroll}>
                {/* Basic Property Info */}
                <View style={styles.propertySection}>
                  <Text style={styles.propertySectionTitle}>Basic Information</Text>
                  
                  <View style={styles.propertyDetailRow}>
                    <Text style={styles.propertyDetailLabel}>Property ID:</Text>
                    <Text style={styles.propertyDetailValue}>
                      {selectedProperty.propertyId || `PROP-${selectedProperty.surveyNumber}`}
                    </Text>
                  </View>
                  
                  <View style={styles.propertyDetailRow}>
                    <Text style={styles.propertyDetailLabel}>Survey Number:</Text>
                    <Text style={styles.propertyDetailValue}>{selectedProperty.surveyNumber}</Text>
                  </View>
                  
                  <View style={styles.propertyDetailRow}>
                    <Text style={styles.propertyDetailLabel}>Owner:</Text>
                    <Text style={styles.propertyDetailValue}>{selectedProperty.ownerName}</Text>
                  </View>
                </View>
                
                {/* Location */}
                <View style={styles.propertySection}>
                  <Text style={styles.propertySectionTitle}>Location</Text>
                  
                  <View style={styles.propertyDetailRow}>
                    <Text style={styles.propertyDetailLabel}>District:</Text>
                    <Text style={styles.propertyDetailValue}>{selectedProperty.district}</Text>
                  </View>
                  
                  <View style={styles.propertyDetailRow}>
                    <Text style={styles.propertyDetailLabel}>State:</Text>
                    <Text style={styles.propertyDetailValue}>{selectedProperty.state}</Text>
                  </View>
                </View>
                
                {/* Land Details */}
                <View style={styles.propertySection}>
                  <Text style={styles.propertySectionTitle}>Land Details</Text>
                  
                  <View style={styles.propertyDetailRow}>
                    <Text style={styles.propertyDetailLabel}>Size:</Text>
                    <Text style={styles.propertyDetailValue}>
                      {selectedProperty.landSize} {selectedProperty.sizeUnit}
                    </Text>
                  </View>
                  
                  {selectedProperty.landType && (
                    <View style={styles.propertyDetailRow}>
                      <Text style={styles.propertyDetailLabel}>Type:</Text>
                      <Text style={styles.propertyDetailValue}>
                        {selectedProperty.landType.charAt(0).toUpperCase() + selectedProperty.landType.slice(1)}
                      </Text>
                    </View>
                  )}
                  
                  {selectedProperty.price && (
                    <View style={styles.propertyDetailRow}>
                      <Text style={styles.propertyDetailLabel}>Value:</Text>
                      <Text style={styles.propertyDetailValue}>₹{selectedProperty.price}</Text>
                    </View>
                  )}
                </View>
                
                {/* Registration Info */}
                <View style={styles.propertySection}>
                  <Text style={styles.propertySectionTitle}>Registration</Text>
                  
                  <View style={styles.propertyDetailRow}>
                    <Text style={styles.propertyDetailLabel}>Registered:</Text>
                    <Text style={styles.propertyDetailValue}>{formatDate(selectedProperty.createdAt)}</Text>
                  </View>
                  
                  <View style={styles.propertyDetailRow}>
                    <Text style={styles.propertyDetailLabel}>Status:</Text>
                    <Text style={[styles.propertyDetailValue, styles.verifiedBadge]}>Verified</Text>
                  </View>
                </View>
              </ScrollView>
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4a90e2" />
                <Text style={styles.loadingText}>Loading property details...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 16,
  },
  listContent: {
    padding: 16,
  },
  transferCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  transferHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transferHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  propertyId: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 'bold',
  },
  pendingBadge: {
    backgroundColor: '#FFA000',
    color: 'white',
  },
  approvedBadge: {
    backgroundColor: '#4CAF50',
    color: 'white',
  },
  rejectedBadge: {
    backgroundColor: '#F44336',
    color: 'white',
  },
  verifiedBadge: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: 8,
  },
  surveyNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  transferDetails: {
    backgroundColor: '#f9f9f9',
    borderRadius: 4,
    padding: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    width: 100,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
  },
  viewDetailsButton: {
    backgroundColor: '#4a90e2',
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
  },
  viewDetailsText: {
    color: '#fff',
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
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
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 4,
    marginTop: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 0,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  propertyDetailScroll: {
    padding: 16,
  },
  propertySection: {
    marginBottom: 20,
  },
  propertySectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#4a90e2',
  },
  propertyDetailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  propertyDetailLabel: {
    width: 120,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  propertyDetailValue: {
    flex: 1,
    fontSize: 14,
  },
});
