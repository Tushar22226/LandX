import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  ScrollView,
  ViewStyle,
  TextStyle,
  ImageStyle,
  Dimensions,
  Linking,
  Platform,
  Image
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getAuth } from 'firebase/auth';
import { getDatabase, ref, get, push, update, set } from 'firebase/database';
import { getStorage, ref as storageRef, getDownloadURL } from 'firebase/storage';
import VerificationDetailView, { VerificationRecord } from './components/VerificationDetailView';
import DocumentPreview from './components/DocumentPreview';
import { database } from '../firebaseConfig';
import { checkIsRevenueAdmin } from './utils/firebaseUtils';

// Define the transfer request type
type TransferRequest = {
  id: string;
  surveyNumber: string;
  landType: string;
  size: string;
  price: string;
  location: string;
  isEncumbered: boolean;
  isGeoTagged: boolean;
  fromName: string;
  fromEmail: string;
  fromPhone: string;
  fromIdType: string;
  fromIdNumber: string;
  toName: string;
  toEmail: string;
  toPhone?: string;
  toDob?: string;
  reason?: string;
  documents?: string;
  documentUrls?: Record<string, string>;
  isVerified: boolean;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  originalId?: string;
};

export default function AdminVerification() {
  const [allVerifications, setAllVerifications] = useState<VerificationRecord[]>([]);
  const [allTransfers, setAllTransfers] = useState<TransferRequest[]>([]);
  const [filteredVerifications, setFilteredVerifications] = useState<VerificationRecord[]>([]);
  const [filteredTransfers, setFilteredTransfers] = useState<TransferRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<VerificationRecord | null>(null);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferRequest | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<{url: string, name: string} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'verifications' | 'transfers'>('verifications');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();
  const user = getAuth().currentUser;

  useEffect(() => {
    const initialize = async () => {
      try {
        // Check if user is an admin
        const adminStatus = await checkIsRevenueAdmin();
        setIsAdmin(adminStatus);

        if (!adminStatus) {
          setLoading(false);
          return;
        }

        // Fetch all verifications and transfer requests
        await Promise.all([
          fetchVerifications(),
          fetchTransferRequests()
        ]);
      } catch (error) {
        console.error('Error initializing:', error);
        Alert.alert('Error', 'Failed to load admin data');
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  const fetchVerifications = async () => {
    try {
      setLoading(true);
      
      const verificationsRef = ref(database, 'landVerifications');
      const snapshot = await get(verificationsRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const verifications: VerificationRecord[] = [];
        
        // Convert the object to an array
        Object.keys(data).forEach(key => {
          // Make sure each record has the expected fields
          const verification: VerificationRecord = {
            id: key,
            surveyNumber: data[key].surveyNumber || '',
            district: data[key].district || '',
            longitude: data[key].longitude || '',
            latitude: data[key].latitude || '',
            userId: data[key].userId || '',
            ownershipType: data[key].ownershipType || '',
            pinCode: data[key].pinCode || '',
            landSize: data[key].landSize || '',
            sizeUnit: data[key].sizeUnit || '',
            state: data[key].state || '',
            city: data[key].city || '',
            email: data[key].email || '',
            isVerified: data[key].isVerified || false,
            createdAt: data[key].createdAt || new Date().toISOString(),
            ...data[key] // Include other fields that might be in the data
          };
          verifications.push(verification);
        });
        
        // Sort by creation date (newest first)
        verifications.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        setAllVerifications(verifications);
        // Initially show unverified records
        const unverified = verifications.filter(v => !v.isVerified);
        setFilteredVerifications(unverified);
      } else {
        setAllVerifications([]);
        setFilteredVerifications([]);
      }
    } catch (error) {
      console.error('Error fetching verifications:', error);
      Alert.alert('Error', 'Failed to fetch verification requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransferRequests = async () => {
    try {
      setLoading(true);
      
      const transfersRef = ref(database, 'propertyTransfers');
      const snapshot = await get(transfersRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        const transfers: TransferRequest[] = [];
        
        // Convert the object to an array
        Object.keys(data).forEach(key => {
          const transfer: TransferRequest = {
            id: key,
            surveyNumber: data[key].surveyNumber || '',
            landType: data[key].landType || '',
            size: data[key].landSize || '',
            price: data[key].landPrice || '',
            location: data[key].city && data[key].district ? `${data[key].city}, ${data[key].district}` : '',
            isEncumbered: data[key].encumbranceStatus || false,
            isGeoTagged: data[key].geoTagged || false,
            fromName: data[key].fromName || '',
            fromEmail: data[key].fromEmail || '',
            fromPhone: data[key].fromContactNumber || '',
            fromIdType: data[key].fromIdType || '',
            fromIdNumber: data[key].fromIdNumber || '',
            toName: data[key].toName || '',
            toEmail: data[key].toEmail || '',
            toPhone: data[key].toPhone || '',
            toDob: data[key].dateOfBirth || '',
            reason: data[key].reason || '',
            documents: data[key].documents || '',
            documentUrls: data[key].documentUrls || {},
            isVerified: data[key].isVerified || false,
            status: data[key].status || 'pending',
            submittedAt: data[key].requestedAt || new Date().toISOString(),
            originalId: data[key].originalId || '',
          };
          transfers.push(transfer);
        });
        
        // Sort by request date (newest first)
        transfers.sort((a, b) => {
          return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
        });
        
        setAllTransfers(transfers);
        // Initially show pending transfers
        const pendingTransfers = transfers.filter(t => t.status === 'pending');
        setFilteredTransfers(pendingTransfers);
      } else {
        setAllTransfers([]);
        setFilteredTransfers([]);
      }
    } catch (error) {
      console.error('Error fetching transfer requests:', error);
      Alert.alert('Error', 'Failed to fetch property transfer requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchQuery.trim()) {
      // Filter verifications
      if (activeTab === 'verifications') {
        const filtered = allVerifications.filter(v => 
          // Only show unverified records that match search query
          !v.isVerified && (
            v.surveyNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            v.district.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (v.ownerName && v.ownerName.toLowerCase().includes(searchQuery.toLowerCase()))
          )
        );
        setFilteredVerifications(filtered);
      } 
      // Filter transfer requests
      else if (activeTab === 'transfers') {
        const filtered = allTransfers.filter(t => 
          t.surveyNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.fromName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.toName.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredTransfers(filtered);
      }
    } else {
      // Show unverified records or pending transfers when not searching
      if (activeTab === 'verifications') {
        const unverified = allVerifications.filter(v => !v.isVerified);
        setFilteredVerifications(unverified);
      } else if (activeTab === 'transfers') {
        const pending = allTransfers.filter(t => t.status === 'pending');
        setFilteredTransfers(pending);
      }
    }
  }, [searchQuery, allVerifications, allTransfers, activeTab]);

  // Function to handle approving a transfer request
  const handleApproveTransfer = async (transfer: TransferRequest) => {
    try {
      setLoading(true);
      
      // Update the transfer request in Firebase
      const transferRef = ref(database, `propertyTransfers/${transfer.id}`);
      await update(transferRef, {
        isVerified: true,
        status: 'approved',
        verifiedAt: new Date().toISOString(),
        verifiedBy: user?.email || 'admin'
      });

      // Get the original land data if originalId is available
      if (transfer.originalId) {
        try {
          const landOwnerRef = ref(database, `landOwners/${transfer.originalId}`);
          const snapshot = await get(landOwnerRef);
          
          if (snapshot.exists()) {
            const landData = snapshot.val();
            console.log("Original land data:", landData);
            
            // Create a new entry in landOwners with the new owner while preserving history
            const newLandOwnerRef = push(ref(database, 'landOwners'));
            
            // Safe copying of data properties
            const newLandRecord = {
              // Property details (preserved from original)
              surveyNumber: landData.surveyNumber || '',
              district: landData.district || '',
              state: landData.state || '',
              city: landData.city || '',
              landSize: landData.landSize || '',
              sizeUnit: landData.sizeUnit || '',
              pinCode: landData.pinCode || '',
              ownershipType: landData.ownershipType || 'sole',
              
              // Conditionally copy fields that might not exist
              ...(landData.propertyId ? { propertyId: landData.propertyId } : {}),
              ...(landData.verificationId ? { verificationId: landData.verificationId } : {}),
              ...(landData.email ? { previousEmail: landData.email } : {}),
              
              // New owner details
              ownerName: transfer.toName || '',
              applicantEmail: transfer.toEmail || '',
              applicationPhone: transfer.toPhone || '',
              email: transfer.toEmail || '',
              ownershipStatus: true,
              isVerified: true,
              verifiedAt: new Date().toISOString(),
              verifiedBy: user?.email || 'admin',
              
              // Transfer history
              previousOwnerName: landData.ownerName || '',
              previousOwnerEmail: landData.applicantEmail || landData.email || '',
              previousRecordId: transfer.originalId,
              transferDate: new Date().toISOString(),
              transferReason: transfer.reason || 'Property transfer',
              transferRequestId: transfer.id,
              documentUrls: transfer.documentUrls || {},
              
              // Mark original record as transferred
              createdAt: new Date().toISOString()
            };
            
            console.log("Creating new land record:", newLandRecord);
            await set(newLandOwnerRef, newLandRecord);
            
            // Mark the original record as transferred but don't delete it
            await update(landOwnerRef, {
              ownershipStatus: false,
              transferPending: false, // Explicitly set to false when transfer is complete
              transferredTo: newLandOwnerRef.key,
              transferredAt: new Date().toISOString(),
              transferRequestId: transfer.id,
              transferStatus: 'completed'
            });
            
            console.log("Transfer completed successfully");
            Alert.alert(
              "Transfer Approved", 
              `Property successfully transferred to ${transfer.toName}`,
              [{ text: "OK" }]
            );
          } else {
            console.error("Original land record not found:", transfer.originalId);
            Alert.alert("Error", "Original land record not found");
          }
        } catch (error) {
          console.error("Error during land record creation:", error);
          Alert.alert("Error", "Failed to create new land record: " + (error instanceof Error ? error.message : String(error)));
        }
      } else {
        console.error("Missing originalId in transfer request");
        Alert.alert("Error", "Missing original property reference");
      }

      // Update the local state
      setAllTransfers(prevTransfers => 
        prevTransfers.map(t => 
          t.id === transfer.id 
            ? {...t, isVerified: true, status: 'approved'} 
            : t
        )
      );

      setSelectedTransfer(null);
      setModalVisible(false);
      
    } catch (error) {
      console.error("Error approving transfer:", error);
      Alert.alert("Error", "Failed to approve transfer: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  // Function to handle rejecting a transfer request
  const handleRejectTransfer = async () => {
    if (!selectedTransfer) return;
    
    if (!rejectReason.trim()) {
      Alert.alert("Error", "Please provide a reason for rejection.");
      return;
    }

    try {
      setLoading(true);
      // Update the transfer request in Firebase
      const transferRef = ref(database, `propertyTransfers/${selectedTransfer.id}`);
      await update(transferRef, {
        isVerified: true, // Still mark as verified (processed)
        status: 'rejected',
        rejectReason: rejectReason,
        rejectedAt: new Date().toISOString(),
        rejectedBy: user?.email || 'revenue-department'
      });

      // Also update the original property record if available
      if (selectedTransfer.originalId) {
        const landOwnerRef = ref(database, `landOwners/${selectedTransfer.originalId}`);
        const snapshot = await get(landOwnerRef);
        
        if (snapshot.exists()) {
          // Update the original property to remove the transferPending flag and add rejection info
          await update(landOwnerRef, {
            transferPending: false,
            transferStatus: 'rejected',
            rejectedAt: new Date().toISOString(),
            rejectedBy: user?.email || 'revenue-department',
            rejectReason: rejectReason
          });

          console.log("Updated land record with rejection status");
        } else {
          console.error("Original land record not found:", selectedTransfer.originalId);
        }
      }

      // Update the local state
      setAllTransfers(prevTransfers => 
        prevTransfers.map(t => 
          t.id === selectedTransfer.id 
            ? {...t, status: 'rejected', rejectReason} 
            : t
        )
      );

      // Close both modals
      setShowRejectModal(false);
      setSelectedTransfer(null);
      setRejectReason('');
      
      // Show success message
      Alert.alert(
        "Transfer Rejected",
        "The property transfer has been rejected and the owner has been notified.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error('Error rejecting transfer:', error);
      Alert.alert(
        "Error",
        "Failed to reject the transfer. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: 'verifications' | 'transfers') => {
    setActiveTab(tab);
    setSelectedRecord(null);
    setSelectedTransfer(null);
    setRejectReason('');
  };

  const saveToLandOwnersDatabase = async (verification: VerificationRecord) => {
    // Create a new entry for landOwners database with only non-sensitive data
    const landOwnerData = {
      // Land information (non-sensitive)
      surveyNumber: verification.surveyNumber,
      district: verification.district,
      city: verification.city,
      state: verification.state,
      pinCode: verification.pinCode,
      landSize: verification.landSize,
      sizeUnit: verification.sizeUnit,
      ownershipType: verification.ownershipType,
      ownerName: verification.ownerName,
      ownershipStatus: true,
      
      // Include applicant's email (as per request)
      applicantEmail: verification.email,
      
      // Verification metadata
      verifiedAt: new Date().toISOString(),
      verifiedBy: 'revenue-department',
      isVerified: true,
      propertyId: `PROP-${verification.surveyNumber}-${Date.now().toString().slice(-6)}`,
      verificationId: verification.id,
      
      // Add any other non-sensitive fields that should be publicly available
      createdAt: verification.createdAt
    };

    // Create a new entry in the landOwners path
    const landOwnersRef = ref(database, `landOwners/${verification.id}`);
    await set(landOwnersRef, landOwnerData);
    console.log('Land data successfully added to landOwners database');
  };

  const handleApprove = async (verification: VerificationRecord) => {
    try {
      setLoading(true);
      
      // First check if the record exists
      const verificationRef = ref(database, `landVerifications/${verification.id}`);
      const snapshot = await get(verificationRef);
      
      if (!snapshot.exists()) {
        Alert.alert('Error', 'Verification record not found');
        return;
      }
      
      const verificationData = snapshot.val();
      
      // 1. Update the verification status in landVerifications path
      await set(verificationRef, {
        ...verificationData,
        isVerified: true,
        ownershipStatus: true,
        verifiedAt: new Date().toISOString(),
        verifiedBy: 'revenue-department'
      });
      
      // 2. Add approved property to landOwners path (without sensitive data)
      await saveToLandOwnersDatabase(verification);
      
      // Reset state
      setSelectedRecord(null);
      
      // Refresh the list
      await fetchVerifications();
      
      Alert.alert('Success', 'Verification approved and property data published to land registry');
    } catch (error) {
      console.error('Error approving verification:', error);
      Alert.alert('Error', 'Failed to approve verification request');
    } finally {
      setLoading(false);
    }
  };

  const toggleRejectView = (verification: VerificationRecord) => {
    setSelectedRecord(verification);
    setRejectReason('Reason for rejection...');
  };

  const submitRejection = async (): Promise<void> => {
    if (!selectedRecord) return;
    
    if (!rejectReason.trim() || rejectReason === 'Reason for rejection...') {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }
    
    try {
      setLoading(true);
      
      const verificationRef = ref(database, `landVerifications/${selectedRecord.id}`);
      const snapshot = await get(verificationRef);
      
      if (!snapshot.exists()) {
        Alert.alert('Error', 'Verification record not found');
        return;
      }
      
      const verificationData = snapshot.val();
      
      // Update with rejected status and reason
      await set(verificationRef, {
        ...verificationData,
        isVerified: true,
        ownershipStatus: false,
        rejectReason: rejectReason.trim(),
        verifiedAt: new Date().toISOString(),
        verifiedBy: 'revenue-department'
      });
      
      // Reset state
      setSelectedRecord(null);
      setRejectReason('');
      
      // Refresh the list
      await fetchVerifications();
      
      Alert.alert('Success', 'Verification request has been rejected');
    } catch (error) {
      console.error('Error rejecting verification:', error);
      Alert.alert('Error', 'Failed to reject verification request');
    } finally {
      setLoading(false);
    }
  };

  const cancelRejection = (): void => {
    setSelectedRecord(null);
    setRejectReason('');
  };

  const showDetailedView = (verification: VerificationRecord) => {
    setSelectedRecord(verification);
  };

  const hideDetailedView = (): void => {
    setSelectedRecord(null);
    setRejectReason('');
  };

  if (loading && !isAdmin) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a90e2" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return (
      <View style={styles.accessDeniedContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#e74c3c" />
        <Text style={styles.accessDeniedText}>Access Denied</Text>
        <Text style={styles.accessDeniedSubText}>
          You do not have permission to access this page. 
          Please contact the administrator if you believe this is an error.
        </Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Verification Panel</Text>
      </View>
      
      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'verifications' && styles.activeTabButton]}
          onPress={() => handleTabChange('verifications')}
        >
          <Ionicons name="document-text-outline" size={20} color={activeTab === 'verifications' ? '#4a90e2' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'verifications' && styles.activeTabText]}>Property Verifications</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'transfers' && styles.activeTabButton]}
          onPress={() => handleTabChange('transfers')}
        >
          <Ionicons name="swap-horizontal" size={20} color={activeTab === 'transfers' ? '#4a90e2' : '#666'} />
          <Text style={[styles.tabText, activeTab === 'transfers' && styles.activeTabText]}>Transfer Requests</Text>
        </TouchableOpacity>
      </View>
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={activeTab === 'verifications' ? "Search by survey number..." : "Search by survey number or owner name..."}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      {/* Info Banner */}
      <View style={styles.infoBox}>
        <Ionicons name="information-circle" size={24} color="#4a90e2" />
        <Text style={styles.infoText}>
          {activeTab === 'verifications' 
            ? "Verify property ownership requests from citizens. Check all documents before approving."
            : "Review property transfer requests. Verify all documents and identity proofs before approving ownership changes."}
        </Text>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4a90e2" />
          <Text style={styles.loadingText}>
            Loading {activeTab === 'verifications' ? 'verification' : 'transfer'} requests...
          </Text>
        </View>
      ) : activeTab === 'verifications' ? (
        // Property Verification Requests
        filteredVerifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-done-circle-outline" size={60} color="#27ae60" />
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptyText}>
              {searchQuery.trim() 
                ? "No verification requests match your search." 
                : "There are no pending verification requests at this time."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredVerifications}
            contentContainerStyle={styles.listContent}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.surveyCard}
                onPress={() => showDetailedView(item)}
              >
                <View style={styles.surveyCardContent}>
                  <View>
                    <Text style={styles.surveyNumber}>Survey #{item.surveyNumber}</Text>
                    <Text style={styles.surveyLocation}>
                      {item.district}, {item.state}
                    </Text>
                    <Text style={styles.surveyDate}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={24} color="#888" />
                </View>
              </TouchableOpacity>
            )}
          />
        )
      ) : (
        // Property Transfer Requests
        filteredTransfers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="swap-horizontal" size={60} color="#27ae60" />
            <Text style={styles.emptyTitle}>No Transfer Requests</Text>
            <Text style={styles.emptyText}>
              {searchQuery.trim() 
                ? "No transfer requests match your search." 
                : "There are no pending property transfer requests at this time."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredTransfers}
            contentContainerStyle={styles.listContent}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={[styles.surveyCard, styles.transferCard]}
                onPress={() => setSelectedTransfer(item)}
              >
                <View style={styles.surveyCardContent}>
                  <View style={styles.transferInfo}>
                    <Text style={styles.surveyNumber}>Transfer Request</Text>
                    <Text style={styles.transferDetails}>
                      <Text style={styles.detailLabel}>From: </Text>{item.fromName}
                    </Text>
                    <Text style={styles.transferDetails}>
                      <Text style={styles.detailLabel}>To: </Text>{item.toName}
                    </Text>
                    <Text style={styles.transferDetails}>
                      <Text style={styles.detailLabel}>Property: </Text>Survey #{item.surveyNumber}
                    </Text>
                    <Text style={styles.surveyDate}>
                      {new Date(item.submittedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.statusContainer}>
                    <Text style={[styles.statusBadge, 
                      item.status === 'approved' ? styles.approvedBadge : 
                      item.status === 'rejected' ? styles.rejectedBadge : 
                      styles.pendingBadge]}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </Text>
                    <Ionicons name="chevron-forward" size={24} color="#888" style={{marginTop: 10}} />
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />
        )
      )}
      
      {/* Transfer Request Modal */}
      {selectedTransfer && (
        <Modal
          transparent={true}
          visible={!!selectedTransfer}
          animationType="fade"
          onRequestClose={() => setSelectedTransfer(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.detailModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Transfer Request Details</Text>
                <TouchableOpacity onPress={() => setSelectedTransfer(null)}>
                  <Ionicons name="close" size={24} color="#333" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.transferDetailScroll}>
                {/* Status Badge */}
                <View style={[styles.statusContainer, {alignItems: 'center', marginBottom: 15}]}>
                  <Text style={[styles.transferDetailStatus, 
                    selectedTransfer.isVerified ? styles.statusApproved : styles.statusPending
                  ]}>
                    {selectedTransfer.isVerified ? 'APPROVED' : 'PENDING'}
                  </Text>
                  <Text style={{fontSize: 12, color: '#888', marginTop: 5}}>
                    Created: {selectedTransfer.submittedAt ? new Date(selectedTransfer.submittedAt).toLocaleDateString('en-IN') : 'N/A'}
                  </Text>
                </View>

                {/* Property Information */}
                <View style={styles.transferDetailSection}>
                  <Text style={styles.transferDetailSectionTitle}>Property Information</Text>
                  <View style={styles.transferDetailItem}>
                    <Text style={styles.transferDetailLabel}>Survey Number:</Text>
                    <Text style={styles.transferDetailValue}>{selectedTransfer.surveyNumber || 'N/A'}</Text>
                  </View>
                  <View style={styles.transferDetailItem}>
                    <Text style={styles.transferDetailLabel}>Land Type:</Text>
                    <Text style={styles.transferDetailValue}>
                      {selectedTransfer.landType ? selectedTransfer.landType.charAt(0).toUpperCase() + selectedTransfer.landType.slice(1) : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.transferDetailItem}>
                    <Text style={styles.transferDetailLabel}>Land Size:</Text>
                    <Text style={styles.transferDetailValue}>{selectedTransfer.size ? `${selectedTransfer.size} sq.ft` : 'N/A'}</Text>
                  </View>
                  <View style={styles.transferDetailItem}>
                    <Text style={styles.transferDetailLabel}>Land Price:</Text>
                    <Text style={styles.transferDetailValue}>{selectedTransfer.price ? `₹${selectedTransfer.price}` : 'N/A'}</Text>
                  </View>
                  <View style={styles.transferDetailItem}>
                    <Text style={styles.transferDetailLabel}>Location:</Text>
                    <Text style={styles.transferDetailValue}>
                      {selectedTransfer.location || 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.transferDetailItem}>
                    <Text style={styles.transferDetailLabel}>Encumbrance:</Text>
                    <Text style={styles.transferDetailValue}>
                      {selectedTransfer.isEncumbered ? 'Yes' : 'No'}
                    </Text>
                  </View>
                  <View style={styles.transferDetailItem}>
                    <Text style={styles.transferDetailLabel}>Geo Tagged:</Text>
                    <Text style={styles.transferDetailValue}>
                      {selectedTransfer.isGeoTagged ? 'Yes' : 'No'}
                    </Text>
                  </View>
                </View>

                {/* Current Owner Details */}
                <View style={styles.transferDetailSection}>
                  <Text style={styles.transferDetailSectionTitle}>Current Owner Details</Text>
                  <View style={styles.transferDetailItem}>
                    <Text style={styles.transferDetailLabel}>Owner Name:</Text>
                    <Text style={styles.transferDetailValue}>{selectedTransfer.fromName || 'N/A'}</Text>
                  </View>
                  <View style={styles.transferDetailItem}>
                    <Text style={styles.transferDetailLabel}>Email:</Text>
                    <Text style={styles.transferDetailValue}>{selectedTransfer.fromEmail || 'N/A'}</Text>
                  </View>
                  <View style={styles.transferDetailItem}>
                    <Text style={styles.transferDetailLabel}>Contact:</Text>
                    <Text style={styles.transferDetailValue}>{selectedTransfer.fromPhone || 'N/A'}</Text>
                  </View>
                  <View style={styles.transferDetailItem}>
                    <Text style={styles.transferDetailLabel}>ID Type:</Text>
                    <Text style={styles.transferDetailValue}>
                      {selectedTransfer.fromIdType ? selectedTransfer.fromIdType.toUpperCase() : 'N/A'}
                    </Text>
                  </View>
                  <View style={styles.transferDetailItem}>
                    <Text style={styles.transferDetailLabel}>ID Number:</Text>
                    <Text style={styles.transferDetailValue}>{selectedTransfer.fromIdNumber || 'N/A'}</Text>
                  </View>
                </View>

                {/* New Owner Details */}
                <View style={styles.transferDetailSection}>
                  <Text style={styles.transferDetailSectionTitle}>New Owner Details</Text>
                  <View style={styles.transferDetailItem}>
                    <Text style={styles.transferDetailLabel}>Owner Name:</Text>
                    <Text style={styles.transferDetailValue}>{selectedTransfer.toName || 'N/A'}</Text>
                  </View>
                  <View style={styles.transferDetailItem}>
                    <Text style={styles.transferDetailLabel}>Email:</Text>
                    <Text style={styles.transferDetailValue}>{selectedTransfer.toEmail || 'N/A'}</Text>
                  </View>
                  <View style={styles.transferDetailItem}>
                    <Text style={styles.transferDetailLabel}>Contact:</Text>
                    <Text style={styles.transferDetailValue}>{selectedTransfer.toPhone || 'N/A'}</Text>
                  </View>
                  <View style={styles.transferDetailItem}>
                    <Text style={styles.transferDetailLabel}>DOB:</Text>
                    <Text style={styles.transferDetailValue}>{selectedTransfer.toDob || 'N/A'}</Text>
                  </View>
                </View>

                {/* Documents Section */}
                <View style={styles.transferDetailSection}>
                  <Text style={styles.transferDetailSectionTitle}>Documents</Text>
                  <View style={styles.documentsContainer}>
                    {selectedTransfer.documentUrls && Object.keys(selectedTransfer.documentUrls).length > 0 ? (
                      <>
                        {/* Seller's (From) Documents */}
                        <View style={styles.partyDocumentsSection}>
                          <Text style={styles.partyDocumentsTitle}>Seller's Documents ({selectedTransfer.fromName})</Text>
                          
                          {/* Filter documents for the 'from' party */}
                          {Object.entries(selectedTransfer.documentUrls)
                            .filter(([docType]) => docType.startsWith('from_'))
                            .map(([docType, url], index) => {
                              const docName = docType.replace('from_', '').charAt(0).toUpperCase() + 
                                            docType.replace('from_', '').slice(1).replace(/_/g, ' ');
                              return (
                                <View key={index} style={styles.documentItem}>
                                  <View style={styles.documentHeader}>
                                    <Ionicons 
                                      name={
                                        docType.includes('aadhar') ? "card-outline" : 
                                        docType.includes('pan') ? "document-text-outline" : 
                                        docType.includes('voter') ? "person-circle-outline" : 
                                        "document-outline"
                                      } 
                                      size={24} 
                                      color="#4a90e2" 
                                    />
                                    <Text style={styles.documentTitle}>
                                      {docName}
                                    </Text>
                                  </View>
                                  <TouchableOpacity 
                                    style={styles.viewDocButton}
                                    onPress={() => {
                                      if (typeof url === 'string') {
                                        setSelectedDocument({url, name: docName});
                                      } else {
                                        Alert.alert("Error", "Invalid document URL");
                                      }
                                    }}
                                  >
                                    <Text style={styles.viewDocButtonText}>View Document</Text>
                                    <Ionicons name="eye-outline" size={18} color="#fff" />
                                  </TouchableOpacity>
                                </View>
                              );
                            })
                          }
                          
                          {!Object.keys(selectedTransfer.documentUrls).some(key => key.startsWith('from_aadhar')) && (
                            <Text style={styles.documentMissing}>Aadhar Card not provided</Text>
                          )}
                          {!Object.keys(selectedTransfer.documentUrls).some(key => key.startsWith('from_pan')) && (
                            <Text style={styles.documentMissing}>PAN Card not provided</Text>
                          )}
                          {!Object.keys(selectedTransfer.documentUrls).some(key => key.startsWith('from_voter')) && (
                            <Text style={styles.documentMissing}>Voter ID not provided</Text>
                          )}
                        </View>
                        
                        {/* Buyer's (To) Documents */}
                        <View style={styles.partyDocumentsSection}>
                          <Text style={styles.partyDocumentsTitle}>Buyer's Documents ({selectedTransfer.toName})</Text>
                          
                          {/* Filter documents for the 'to' party */}
                          {Object.entries(selectedTransfer.documentUrls)
                            .filter(([docType]) => docType.startsWith('to_'))
                            .map(([docType, url], index) => {
                              const docName = docType.replace('to_', '').charAt(0).toUpperCase() + 
                                            docType.replace('to_', '').slice(1).replace(/_/g, ' ');
                              return (
                                <View key={index} style={styles.documentItem}>
                                  <View style={styles.documentHeader}>
                                    <Ionicons 
                                      name={
                                        docType.includes('aadhar') ? "card-outline" : 
                                        docType.includes('pan') ? "document-text-outline" : 
                                        docType.includes('voter') ? "person-circle-outline" : 
                                        "document-outline"
                                      } 
                                      size={24} 
                                      color="#4a90e2" 
                                    />
                                    <Text style={styles.documentTitle}>
                                      {docName}
                                    </Text>
                                  </View>
                                  <TouchableOpacity 
                                    style={styles.viewDocButton}
                                    onPress={() => {
                                      if (typeof url === 'string') {
                                        setSelectedDocument({url, name: docName});
                                      } else {
                                        Alert.alert("Error", "Invalid document URL");
                                      }
                                    }}
                                  >
                                    <Text style={styles.viewDocButtonText}>View Document</Text>
                                    <Ionicons name="eye-outline" size={18} color="#fff" />
                                  </TouchableOpacity>
                                </View>
                              );
                            })
                          }
                          
                          {!Object.keys(selectedTransfer.documentUrls).some(key => key.startsWith('to_aadhar')) && (
                            <Text style={styles.documentMissing}>Aadhar Card not provided</Text>
                          )}
                          {!Object.keys(selectedTransfer.documentUrls).some(key => key.startsWith('to_pan')) && (
                            <Text style={styles.documentMissing}>PAN Card not provided</Text>
                          )}
                          {!Object.keys(selectedTransfer.documentUrls).some(key => key.startsWith('to_voter')) && (
                            <Text style={styles.documentMissing}>Voter ID not provided</Text>
                          )}
                        </View>
                        
                        {/* Other Documents */}
                        <View style={styles.partyDocumentsSection}>
                          <Text style={styles.partyDocumentsTitle}>Other Documents</Text>
                          
                          {/* Filter other documents that don't start with from_ or to_ */}
                          {Object.entries(selectedTransfer.documentUrls)
                            .filter(([docType]) => !docType.startsWith('from_') && !docType.startsWith('to_'))
                            .map(([docType, url], index) => {
                              const docName = docType.charAt(0).toUpperCase() + docType.slice(1).replace(/_/g, ' ');
                              return (
                                <View key={index} style={styles.documentItem}>
                                  <View style={styles.documentHeader}>
                                    <Ionicons name="document-outline" size={24} color="#4a90e2" />
                                    <Text style={styles.documentTitle}>{docName}</Text>
                                  </View>
                                  <TouchableOpacity 
                                    style={styles.viewDocButton}
                                    onPress={() => {
                                      if (typeof url === 'string') {
                                        setSelectedDocument({url, name: docName});
                                      } else {
                                        Alert.alert("Error", "Invalid document URL");
                                      }
                                    }}
                                  >
                                    <Text style={styles.viewDocButtonText}>View Document</Text>
                                    <Ionicons name="eye-outline" size={18} color="#fff" />
                                  </TouchableOpacity>
                                </View>
                              );
                            })
                          }
                          
                          {Object.entries(selectedTransfer.documentUrls).filter(([docType]) => 
                            !docType.startsWith('from_') && !docType.startsWith('to_')).length === 0 && (
                            <Text style={styles.noDocumentsText}>No other documents</Text>
                          )}
                        </View>
                      </>
                    ) : (
                      <Text style={styles.noDocumentsText}>No documents available</Text>
                    )}
                  </View>
                </View>

                {/* Action Buttons */}
                {!selectedTransfer.isVerified && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity 
                      style={styles.approveButton} 
                      onPress={() => handleApproveTransfer(selectedTransfer)}
                    >
                      <Text style={styles.actionButtonText}>Approve Transfer</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.rejectButton} 
                      onPress={() => {
                        setRejectReason('');
                        setShowRejectModal(true);
                      }}
                    >
                      <Text style={styles.actionButtonText}>Reject Transfer</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Document Preview Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={!!selectedDocument}
        onRequestClose={() => setSelectedDocument(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedDocument && (
              <DocumentPreview
                documentUrl={selectedDocument.url}
                documentName={selectedDocument.name}
                onClose={() => setSelectedDocument(null)}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Verification Rejection Modal */}
      {selectedRecord && rejectReason ? (
        <Modal
          transparent={true}
          visible={!!selectedRecord && !!rejectReason}
          animationType="fade"
          onRequestClose={cancelRejection}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.rejectModalContent}>
              <Text style={styles.rejectModalTitle}>Provide Rejection Reason</Text>
              <TextInput
                style={styles.rejectInput}
                multiline
                placeholder="Please specify the reason for rejection..."
                value={rejectReason}
                onChangeText={setRejectReason}
              />
              
              <View style={styles.rejectButtonsRow}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={cancelRejection}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.confirmButton]}
                  onPress={submitRejection}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
      
      {/* Verification Detail View */}
      {selectedRecord && !rejectReason ? (
        <Modal
          visible={!!selectedRecord && !rejectReason}
          animationType="slide"
          onRequestClose={hideDetailedView}
        >
          <VerificationDetailView 
            verification={selectedRecord}
            onClose={hideDetailedView}
            onApprove={() => handleApprove(selectedRecord)}
            onReject={() => toggleRejectView(selectedRecord)}
            loading={loading}
          />
        </Modal>
      ) : null}

      {/* Reject Modal */}
      {showRejectModal && (
        <Modal
          transparent={true}
          visible={showRejectModal}
          animationType="fade"
          onRequestClose={() => setShowRejectModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.rejectModalContent}>
              <Text style={styles.rejectModalTitle}>Provide Rejection Reason</Text>
              <TextInput
                style={styles.rejectInput}
                multiline
                placeholder="Please specify the reason for rejection..."
                value={rejectReason}
                onChangeText={setRejectReason}
              />
              
              <View style={styles.rejectButtonsRow}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.cancelButton]}
                  onPress={() => setShowRejectModal(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.confirmButton]}
                  onPress={handleRejectTransfer}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.confirmButtonText}>Submit</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

interface Styles {
  container: ViewStyle;
  header: ViewStyle;
  title: TextStyle;
  headerRight: ViewStyle;
  tabContainer: ViewStyle;
  tabButton: ViewStyle;
  activeTabButton: ViewStyle;
  tabButtonText: TextStyle;
  activeTabButtonText: TextStyle;
  content: ViewStyle;
  recordItem: ViewStyle;
  recordHeader: ViewStyle;
  recordHeaderLeft: ViewStyle;
  recordSurveyNumber: TextStyle;
  recordOwnerName: TextStyle;
  recordStatus: TextStyle;
  statusBadge: TextStyle;
  approvedBadge: TextStyle;
  pendingBadge: TextStyle;
  rejectedBadge: TextStyle;
  badgeText: TextStyle;
  recordDetails: ViewStyle;
  detailRow: ViewStyle;
  detailLabel: TextStyle;
  detailValue: TextStyle;
  actionButtons: ViewStyle;
  actionButton: ViewStyle;
  actionButtonText: TextStyle;
  searchContainer: ViewStyle;
  searchInput: TextStyle;
  modalOverlay: ViewStyle;
  modalContent: ViewStyle;
  modalHeader: ViewStyle;
  modalTitle: TextStyle;
  modalCloseButton: ViewStyle;
  propertyDetails: ViewStyle;
  propertyDetailItem: ViewStyle;
  propertyDetailLabel: TextStyle;
  propertyDetailValue: TextStyle;
  sectionTitle: TextStyle;
  ownerDetails: ViewStyle;
  ownerDetailItem: ViewStyle;
  ownerDetailLabel: TextStyle;
  ownerDetailValue: TextStyle;
  documentsSection: ViewStyle;
  documentItem: ViewStyle;
  documentHeader: ViewStyle;
  documentTitle: TextStyle;
  viewDocButton: ViewStyle;
  viewDocButtonText: TextStyle;
  noDocumentsText: TextStyle;
  documentActions: ViewStyle;
  documentActionButton: ViewStyle;
  documentActionButtonText: TextStyle;
  documentsContainer: ViewStyle;
  transferItem: ViewStyle;
  transferHeader: ViewStyle;
  transferHeaderLeft: ViewStyle;
  surveyNumber: TextStyle;
  ownerName: TextStyle;
  statusContainer: ViewStyle;
  surveyDate: TextStyle;
  transferDetails: TextStyle;
  transferDetailSection: ViewStyle;
  transferDetailSectionTitle: TextStyle;
  transferDetailItem: ViewStyle;
  transferDetailLabel: TextStyle;
  transferDetailValue: TextStyle;
  transferModalContent: ViewStyle;
  rejectModalContent: ViewStyle;
  rejectReasonInput: TextStyle;
  rejectButton: ViewStyle;
  rejectButtonText: TextStyle;
  cancelButton: ViewStyle;
  cancelButtonText: TextStyle;
  loadingContainer: ViewStyle;
  loadingText: TextStyle;
  accessDeniedContainer: ViewStyle;
  accessDeniedText: TextStyle;
  accessDeniedSubText: TextStyle;
  backButton: ViewStyle;
  backButtonText: TextStyle;
  headerBackButton: ViewStyle;
  headerTitle: TextStyle;
  tabText: TextStyle;
  activeTabText: TextStyle;
  searchIcon: TextStyle;
  infoBox: ViewStyle;
  infoText: TextStyle;
  emptyContainer: ViewStyle;
  emptyTitle: TextStyle;
  emptyText: TextStyle;
  listContent: ViewStyle;
  surveyCard: ViewStyle;
  surveyCardContent: ViewStyle;
  surveyLocation: TextStyle;
  transferCard: ViewStyle;
  transferInfo: ViewStyle;
  detailModalContent: ViewStyle;
  transferDetailScroll: ViewStyle;
  transferDetailStatus: TextStyle;
  statusApproved: TextStyle;
  statusPending: TextStyle;
  approveButton: ViewStyle;
  rejectModalTitle: TextStyle;
  rejectInput: TextStyle;
  rejectButtonsRow: ViewStyle;
  confirmButton: ViewStyle;
  confirmButtonText: TextStyle;
  partyDocumentsSection: ViewStyle;
  partyDocumentsTitle: TextStyle;
  documentMissing: TextStyle;
}

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1.41,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  headerRight: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: '#4a90e2',
  },
  tabButtonText: {
    fontSize: 14,
    marginLeft: 5,
    color: '#666',
  },
  activeTabButtonText: {
    color: '#4a90e2',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  recordItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordHeaderLeft: {
    flex: 1,
  },
  recordSurveyNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  recordOwnerName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  recordStatus: {
    fontSize: 12,
    color: '#888',
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 'bold',
    overflow: 'hidden',
  },
  approvedBadge: {
    backgroundColor: '#e8f5e9',
    color: '#388e3c',
  },
  pendingBadge: {
    backgroundColor: '#fff9c4',
    color: '#ffa000',
  },
  rejectedBadge: {
    backgroundColor: '#ffebee',
    color: '#d32f2f',
  },
  badgeText: {
    fontSize: 12,
    color: '#333',
  },
  recordDetails: {
    marginTop: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    width: '35%',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 15,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 8,
  },
  propertyDetails: {
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  propertyDetailItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  propertyDetailLabel: {
    width: '35%',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
  },
  propertyDetailValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4a90e2',
    marginBottom: 10,
  },
  ownerDetails: {
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  ownerDetailItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  ownerDetailLabel: {
    width: '35%',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
  },
  ownerDetailValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  documentsSection: {
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  documentItem: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  documentTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  viewDocButton: {
    backgroundColor: '#4a90e2',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDocButtonText: {
    fontSize: 14,
    color: '#fff',
    marginRight: 8,
  },
  noDocumentsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  documentActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  documentActionButton: {
    backgroundColor: '#4a90e2',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  documentActionButtonText: {
    fontSize: 14,
    color: '#fff',
    marginRight: 8,
  },
  documentsContainer: {
    padding: 12,
  },
  transferItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transferHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transferHeaderLeft: {
    flex: 1,
  },
  surveyNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  ownerName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  statusContainer: {
    alignItems: 'flex-end',
  },
  surveyDate: {
    fontSize: 12,
    color: '#888',
  },
  transferDetails: {
    marginTop: 16,
  },
  transferDetailSection: {
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
  },
  transferDetailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4a90e2',
    marginBottom: 10,
  },
  transferDetailItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  transferDetailLabel: {
    width: '35%',
    fontSize: 14,
    fontWeight: 'bold',
    color: '#555',
  },
  transferDetailValue: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  transferModalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  rejectModalContent: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
  },
  rejectReasonInput: {
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    minHeight: 80,
    marginBottom: 16,
    color: '#333',
  },
  rejectButton: {
    backgroundColor: '#f44336',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#333',
    marginTop: 16,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  accessDeniedText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 8,
  },
  accessDeniedSubText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#4a90e2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  headerBackButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  tabText: {
    fontSize: 14,
    marginLeft: 5,
    color: '#666',
  },
  activeTabText: {
    color: '#4a90e2',
    fontWeight: 'bold',
  },
  searchIcon: {
    fontSize: 20,
    color: '#888',
    marginRight: 8,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  surveyCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  surveyCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  surveyLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  transferCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  transferInfo: {
    flex: 1,
  },
  detailModalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  transferDetailScroll: {
    maxHeight: '80%',
  },
  transferDetailStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  statusApproved: {
    color: '#388e3c',
  },
  statusPending: {
    color: '#ffa000',
  },
  approveButton: {
    backgroundColor: '#4a90e2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
  },
  rejectModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  rejectInput: {
    backgroundColor: '#fff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    minHeight: 80,
    marginBottom: 16,
    color: '#333',
  },
  rejectButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  confirmButton: {
    backgroundColor: '#4a90e2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  partyDocumentsSection: {
    marginBottom: 16,
  },
  partyDocumentsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4a90e2',
    marginBottom: 10,
  },
  documentMissing: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
})
