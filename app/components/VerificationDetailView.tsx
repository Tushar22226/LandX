import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import { ref as dbRef, set, get } from 'firebase/database';
import { database } from '../../firebaseConfig';
import CheckBox from './CheckBox';

// Document type mappings for readable labels
const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  'documentVerification': 'Document Verification',
  'encumbranceCert': 'Encumbrance Certificate',
  'gpsTaggedSelfie': 'GPS Tagged Selfie',
  'idProof': 'ID Proof',
  'landMap': 'Land Map',
  'landPhoto': 'Land Photo',
  'landmarkPhotos': 'Landmark Photos',
  'mutationCert': 'Mutation Certificate',
  'photo': 'Photo'
};

export type VerificationRecord = {
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
  ownerName?: string;
  contactNumber?: string;
  dateOfBirth?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  documentUrls?: {
    [key: string]: string | {
      url?: string;
      confidence?: number;
      isDocument?: boolean;
      metadata?: {
        aspectRatio?: number;
        documentType?: string;
        fileSize?: number;
        imageClassification?: string;
        resolution?: string;
        [key: string]: any;
      };
      [key: string]: any;
    };
  };
  photos?: string[];
  [key: string]: any; // Allow for additional dynamic properties
};

type VerificationDetailViewProps = {
  verification: VerificationRecord | null;
  onClose: () => void;
  onApprove: (record: VerificationRecord) => void;
  onReject: (record: VerificationRecord) => void;
  loading: boolean;
};

export default function VerificationDetailView({
  verification,
  onClose,
  onApprove,
  onReject,
  loading
}: VerificationDetailViewProps) {
  const [documentModalVisible, setDocumentModalVisible] = useState(false);
  const [selectedDocumentUrl, setSelectedDocumentUrl] = useState('');
  const [selectedDocumentTitle, setSelectedDocumentTitle] = useState('');
  const [selectedDocumentMetadata, setSelectedDocumentMetadata] = useState<any>(null);
  const [checklistItems, setChecklistItems] = useState({
    documentVerified: false,
    locationVerified: false,
    ownershipVerified: false,
    sizeVerified: false
  });

  // Move useState calls outside of the render function
  useEffect(() => {
    // Reset state when verification changes
    setDocumentModalVisible(false);
    setSelectedDocumentUrl('');
    setSelectedDocumentTitle('');
    setSelectedDocumentMetadata(null);
  }, [verification?.id]);

  if (!verification) return null;

  const handleDocumentPress = (url: string, title: string, metadata?: any) => {
    setSelectedDocumentUrl(url);
    setSelectedDocumentTitle(title);
    setSelectedDocumentMetadata(metadata || null);
    setDocumentModalVisible(true);
  };

  const closeDocumentModal = () => {
    setDocumentModalVisible(false);
  };

  const toggleChecklistItem = (key: keyof typeof checklistItems) => {
    setChecklistItems(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    
    // Log the new state to help with debugging
    console.log(`Toggled ${key} to ${!checklistItems[key]}`);
  };

  const allChecklistItemsVerified = () => {
    const result = Object.values(checklistItems).every(value => value === true);
    console.log('All checklist items verified?', result, JSON.stringify(checklistItems));
    return result;
  };

  const handleApprove = () => {
    // Check if ALL checklist items have been verified
    if (!allChecklistItemsVerified()) {
      Alert.alert(
        "Verification Required",
        "Please complete ALL verification checklist items before approving.",
        [{ text: "OK" }]
      );
      return;
    }
    
    // Confirm approval
    Alert.alert(
      "Confirm Approval",
      "This will approve the land verification and publish non-sensitive data to the land registry. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Approve", 
          onPress: () => {
            console.log('Approval confirmed for verification:', verification.id);
            onApprove(verification);
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  const renderDocumentThumbnails = () => {
    if (!verification.documentUrls || Object.keys(verification.documentUrls).length === 0) {
      return (
        <Text style={styles.noDocumentsText}>No documents uploaded</Text>
      );
    }

    return (
      <View style={styles.documentGrid}>
        {Object.entries(verification.documentUrls || {}).map(([docType, urlData]) => {
          // Handle both simple string URLs and complex objects with metadata
          let url: string = '';
          let metadata: Record<string, any> | null = null;
          
          // If it's a string, use it directly as the URL
          if (typeof urlData === 'string') {
            url = urlData;
          }
          // If it's an object with nested data (like in the example)
          else if (typeof urlData === 'object' && urlData !== null) {
            // If there's a direct URL property
            if ('url' in urlData && typeof urlData.url === 'string') {
              url = urlData.url;
              metadata = urlData;
            } 
            // Otherwise this might be an object where the key is the document type
            // and the value contains metadata and possibly the URL
            else {
              // Search for a URL-like string in the object's values
              Object.entries(urlData as Record<string, any>).forEach(([key, value]) => {
                if (typeof value === 'string' && 
                    (value.startsWith('http') || value.startsWith('https') || value.startsWith('gs://') || value.startsWith('firebase'))) {
                  url = value;
                }
              });
              metadata = urlData;
            }
          }

          // Skip if no valid URL found
          if (!url) return null;
          
          return (
            <TouchableOpacity
              key={docType}
              style={styles.documentGridItem}
              onPress={() => handleDocumentPress(url, DOCUMENT_TYPE_LABELS[docType] || docType, metadata)}
            >
              <Image 
                source={{ uri: url }} 
                style={styles.documentThumbnail} 
                resizeMode="cover"
              />
              <Text style={styles.documentLabel}>{DOCUMENT_TYPE_LABELS[docType] || docType}</Text>
            </TouchableOpacity>
          );
        }).filter(Boolean)}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.detailModalHeader}>
        <TouchableOpacity
          style={styles.modalBackButton}
          onPress={onClose}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.detailModalTitle}>Verification Details</Text>
      </View>
      
      {/* Content */}
      <ScrollView style={styles.detailScrollView}>
        {/* Property Information */}
        <View style={styles.detailCard}>
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Property Information</Text>
            
            <Text style={styles.detailItemLabel}>Survey Number</Text>
            <Text style={styles.detailItemValue}>{verification.surveyNumber}</Text>
            
            <Text style={styles.detailItemLabel}>Location</Text>
            <Text style={styles.detailItemValue}>
              {verification.city}, {verification.district}, {verification.state} - {verification.pinCode}
            </Text>
            
            <Text style={styles.detailItemLabel}>GPS Coordinates</Text>
            <Text style={styles.detailItemValue}>
              {verification.latitude}, {verification.longitude}
            </Text>
            
            <Text style={styles.detailItemLabel}>Land Size</Text>
            <Text style={styles.detailItemValue}>
              {verification.landSize} {verification.sizeUnit}
            </Text>
            
            <Text style={styles.detailItemLabel}>Ownership Type</Text>
            <Text style={styles.detailItemValue}>{verification.ownershipType}</Text>
            
            <Text style={styles.detailItemLabel}>Verification ID</Text>
            <Text style={styles.detailItemValue}>{verification.id}</Text>
          </View>
        </View>
        
        {/* Owner Information */}
        <View style={styles.detailCard}>
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Owner Information</Text>
            
            <Text style={styles.detailItemLabel}>Owner Name</Text>
            <Text style={styles.detailItemValue}>{verification.ownerName || 'Not provided'}</Text>
            
            <Text style={styles.detailItemLabel}>Email</Text>
            <Text style={styles.detailItemValue}>{verification.email}</Text>
            
            <Text style={styles.detailItemLabel}>Contact Number</Text>
            <Text style={styles.detailItemValue}>{verification.contactNumber || 'Not provided'}</Text>
            
            <Text style={styles.detailItemLabel}>Date of Birth</Text>
            <Text style={styles.detailItemValue}>{verification.dateOfBirth || 'Not provided'}</Text>
            
            <Text style={styles.detailItemLabel}>User ID</Text>
            <Text style={styles.detailItemValue}>{verification.userId}</Text>
            
            <Text style={styles.detailItemLabel}>Application Date</Text>
            <Text style={styles.detailItemValue}>{formatDate(verification.createdAt)}</Text>
            
            {/* Display any other additional fields dynamically */}
            {Object.entries(verification).map(([key, value]) => {
              // Skip already displayed fields and complex objects
              if (['id', 'surveyNumber', 'city', 'district', 'state', 'pinCode', 'latitude', 'longitude',
                   'landSize', 'sizeUnit', 'ownershipType', 'ownerName', 'email', 'contactNumber',
                   'dateOfBirth', 'userId', 'createdAt', 'documentUrls', 'isVerified', 'ownershipStatus',
                   'rejectReason', 'verifiedAt', 'verifiedBy'].includes(key) || 
                  typeof value === 'object') {
                return null;
              }
              
              return (
                <React.Fragment key={key}>
                  <Text style={styles.detailItemLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                  <Text style={styles.detailItemValue}>{value?.toString() || 'Not provided'}</Text>
                </React.Fragment>
              );
            })}
          </View>
        </View>
        
        {/* Documents */}
        <View style={styles.detailCard}>
          <View style={styles.detailSection}>
            <Text style={styles.detailSectionTitle}>Documents</Text>
            {renderDocumentThumbnails()}
          </View>
        </View>
        
        {/* Verification Checklist */}
        <View style={styles.detailCard}>
          <View style={styles.checklistSection}>
            <Text style={styles.detailSectionTitle}>Verification Checklist</Text>
            
            <TouchableOpacity 
              style={styles.checklistItem}
              onPress={() => toggleChecklistItem('documentVerified')}
            >
              <CheckBox checked={checklistItems.documentVerified} />
              <Text style={styles.checklistText}>All documents are valid and verified</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.checklistItem}
              onPress={() => toggleChecklistItem('locationVerified')}
            >
              <CheckBox checked={checklistItems.locationVerified} />
              <Text style={styles.checklistText}>Property location has been verified</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.checklistItem}
              onPress={() => toggleChecklistItem('ownershipVerified')}
            >
              <CheckBox checked={checklistItems.ownershipVerified} />
              <Text style={styles.checklistText}>Ownership details are valid</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.checklistItem}
              onPress={() => toggleChecklistItem('sizeVerified')}
            >
              <CheckBox checked={checklistItems.sizeVerified} />
              <Text style={styles.checklistText}>Land size and measurements are accurate</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      
      {/* Action Buttons */}
      <View style={styles.detailActionButtonsContainer}>
        <TouchableOpacity 
          style={[styles.detailActionButton, styles.rejectButton]}
          onPress={() => onReject(verification)}
          disabled={loading}
        >
          <Feather name="x-circle" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Reject</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.detailActionButton, styles.approveButton]}
          onPress={handleApprove}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="check-circle" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Approve</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Document View Modal */}
      <Modal
        visible={documentModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={closeDocumentModal}
      >
        <View style={styles.documentModalContainer}>
          <View style={styles.documentModalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={closeDocumentModal}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.documentModalTitle}>{selectedDocumentTitle}</Text>
          </View>
          
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.documentImageContainer}>
              <Image 
                source={{ uri: selectedDocumentUrl }} 
                style={styles.documentImage} 
                resizeMode="contain"
              />
            </View>
            
            {/* Document Metadata */}
            {selectedDocumentMetadata && (
              <View style={styles.metadataContainer}>
                <Text style={styles.metadataTitle}>Document Details</Text>
                
                {Object.entries(selectedDocumentMetadata).map(([key, value]) => {
                  // Skip rendering complex nested objects directly
                  if (key === 'metadata' && typeof value === 'object' && value !== null) {
                    return (
                      <View key={key} style={styles.nestedMetadata}>
                        <Text style={styles.metadataSubtitle}>File Metadata</Text>
                        {Object.entries(value).map(([nestedKey, nestedValue]) => {
                          if (typeof nestedValue !== 'object') {
                            return (
                              <View key={nestedKey} style={styles.metadataItem}>
                                <Text style={styles.metadataLabel}>
                                  {nestedKey.charAt(0).toUpperCase() + nestedKey.slice(1).replace(/([A-Z])/g, ' $1')}
                                </Text>
                                <Text style={styles.metadataValue}>
                                  {nestedValue?.toString() || 'N/A'}
                                </Text>
                              </View>
                            );
                          }
                          return null;
                        })}
                      </View>
                    );
                  } else if (typeof value !== 'object') {
                    // Only show primitive values directly
                    return (
                      <View key={key} style={styles.metadataItem}>
                        <Text style={styles.metadataLabel}>
                          {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}
                        </Text>
                        <Text style={styles.metadataValue}>
                          {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (value?.toString() || 'N/A')}
                        </Text>
                      </View>
                    );
                  }
                  return null;
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({  
  // New styles for metadata display
  metadataContainer: {
    backgroundColor: '#f7f9fc',
    padding: 16,
    marginTop: 10,
    marginBottom: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e1e8ed',
  },
  metadataTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  metadataSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 8,
    color: '#333',
  },
  metadataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  metadataLabel: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  metadataValue: {
    fontSize: 14,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  nestedMetadata: {
    marginLeft: 10,
    marginTop: 10,
    paddingLeft: 10,
    borderLeftWidth: 2,
    borderLeftColor: '#4a90e2',
  },
  modalScrollView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  detailModalHeader: {
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
  modalBackButton: {
    padding: 8,
  },
  detailModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  detailScrollView: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    margin: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  detailSection: {
    padding: 16,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  detailItemLabel: {
    fontSize: 14,
    color: '#888',
    marginBottom: 4,
  },
  detailItemValue: {
    fontSize: 16,
    color: '#333',
    marginBottom: 16,
  },
  documentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  documentGridItem: {
    width: '50%',
    padding: 8,
  },
  documentThumbnail: {
    width: '100%',
    height: 120,
    borderRadius: 6,
    backgroundColor: '#eee',
  },
  documentLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  noDocumentsText: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  checklistSection: {
    padding: 16,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checklistText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  detailActionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 16,
    marginTop: 8,
  },
  detailActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  rejectButton: {
    backgroundColor: '#e74c3c',
  },
  approveButton: {
    backgroundColor: '#27ae60',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  documentModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  documentModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  modalCloseButton: {
    padding: 8,
  },
  documentModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#fff',
  },
  documentImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentImage: {
    width: '100%',
    height: '90%',
  },
});
