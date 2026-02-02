import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { fetchLandVerificationsByEmail, getCurrentUserEmail, deleteLandVerification } from './utils/firebaseUtils';

type VerificationRecord = {
  id: string;
  surveyNumber: string;
  district: string;
  longitude: string;
  latitude: string;
  userId: string;
  ownershipType: string;
  pinCode: string;
  landSize: string;
  sizeUnit: string;
  state: string;
  city: string;
  email: string;
  isVerified: boolean;
  ownershipStatus?: boolean;
  rejectReason?: string;
  createdAt: string;
};

export default function PropertyVerification() {
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation();

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const userEmail = getCurrentUserEmail();
      
      if (!userEmail) {
        setError('You need to be logged in to view your property verifications');
        setLoading(false);
        return;
      }
      
      const records = await fetchLandVerificationsByEmail(userEmail);
      setVerifications(records);
    } catch (err) {
      console.error('Error fetching verifications:', err);
      setError('Failed to load property verification records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchVerifications();
  };

  const handleDeleteRequest = (verificationId: string, surveyNumber: string) => {
    Alert.alert(
      'Delete Verification Request',
      `Are you sure you want to delete the verification request for Survey Number ${surveyNumber}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await deleteLandVerification(verificationId);
              
              // After successful deletion, refresh the list
              fetchVerifications();
              
              // Show success message
              Alert.alert(
                'Success',
                'Verification request deleted successfully',
                [{ text: 'OK' }]
              );
            } catch (err) {
              console.error('Error deleting verification:', err);
              Alert.alert(
                'Error',
                'Failed to delete verification request. Please try again later.',
                [{ text: 'OK' }]
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Property Verifications</Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4a90e2" />
          <Text style={styles.loadingText}>Loading your properties...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color="#e74c3c" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchVerifications}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {verifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-outline" size={64} color="#aaa" />
              <Text style={styles.emptyText}>No property verification records found</Text>
              <Text style={styles.emptySubText}>
                Submit a property verification request from the Services page
              </Text>
            </View>
          ) : (
            verifications.map((verification) => (
              <View key={verification.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.surveyNumberContainer}>
                    <Text style={styles.surveyNumberLabel}>Survey Number</Text>
                    <Text style={styles.surveyNumber}>{verification.surveyNumber}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    verification.isVerified && verification.ownershipStatus ? styles.verifiedBadge : 
                    verification.isVerified && (verification.ownershipStatus === false || verification.ownershipStatus === null) ? styles.rejectedBadge : 
                    styles.pendingBadge
                  ]}>
                    <Text style={styles.statusText}>
                      {verification.isVerified && verification.ownershipStatus ? 'Verified' : 
                       verification.isVerified && !verification.ownershipStatus ? 'Rejected' : 
                       'Pending'}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />
                
                {verification.isVerified && !verification.ownershipStatus && verification.rejectReason && (
                  <View style={styles.rejectionContainer}>
                    <Text style={styles.rejectionTitle}>Rejection Reason:</Text>
                    <Text style={styles.rejectionReason}>{verification.rejectReason}</Text>
                  </View>
                )}

                <View style={styles.detailsContainer}>
                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>District</Text>
                      <Text style={styles.detailValue}>{verification.district}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>State</Text>
                      <Text style={styles.detailValue}>{verification.state}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>City</Text>
                      <Text style={styles.detailValue}>{verification.city || 'N/A'}</Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Pin Code</Text>
                      <Text style={styles.detailValue}>{verification.pinCode}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Size</Text>
                      <Text style={styles.detailValue}>
                        {verification.landSize} {verification.sizeUnit}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Ownership</Text>
                      <Text style={styles.detailValue}>
                        {verification.ownershipType.charAt(0).toUpperCase() + verification.ownershipType.slice(1)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Coordinates</Text>
                      <Text style={styles.detailValue}>
                        {verification.latitude}, {verification.longitude}
                      </Text>
                    </View>
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>User ID</Text>
                      <Text style={styles.detailValue} numberOfLines={1} ellipsizeMode="middle">
                        {verification.userId}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <Text style={styles.dateText}>
                    Submitted on {formatDate(verification.createdAt)}
                  </Text>
                  <TouchableOpacity 
                    style={styles.deleteButton}
                    onPress={() => handleDeleteRequest(verification.id, verification.surveyNumber)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#e74c3c" />
                    <Text style={styles.deleteButtonText}>Delete Request</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
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
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1.41,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#555',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#4a90e2',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#555',
    marginTop: 16,
  },
  emptySubText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  surveyNumberContainer: {
    flex: 1,
  },
  surveyNumberLabel: {
    fontSize: 12,
    color: '#888',
  },
  surveyNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  verifiedBadge: {
    backgroundColor: '#e6f7ed',
  },
  pendingBadge: {
    backgroundColor: '#fff4e5',
  },
  rejectedBadge: {
    backgroundColor: '#ffe5e5',
  },
  rejectionContainer: {
    padding: 12,
    marginTop: 4,
    backgroundColor: '#fff0f0',
    borderRadius: 8,
    margin: 16,
    marginBottom: 0,
    borderLeftWidth: 4,
    borderLeftColor: '#e74c3c',
  },
  rejectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e74c3c',
    marginBottom: 4,
  },
  rejectionReason: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
  },
  detailsContainer: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    color: '#333',
  },
  cardFooter: {
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 12,
    color: '#888',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 4,
    backgroundColor: '#fff0f0',
  },
  deleteButtonText: {
    fontSize: 12,
    color: '#e74c3c',
    marginLeft: 4,
    fontWeight: '500',
  },
});
