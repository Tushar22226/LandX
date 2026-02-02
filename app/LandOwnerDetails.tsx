import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  ActivityIndicator
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ref, get } from 'firebase/database';
import { database } from '../firebaseConfig';

interface VerificationData {
  id: string;
  city: string;
  contactNumber: string;
  dateOfBirth: string;
  district: string;
  documentUrls: {
    encumbranceCert?: string;
    gpsTaggedSelfie?: string;
    idProof?: string;
    landMap?: string;
    landPhoto?: string;
    landmarkPhotos?: string;
    mutationCert?: string;
    photo?: string;
    taxReceipts?: string;
    titleDeed?: string;
  };
  // ... other fields
}

interface TransferData {
  city: string;
  contactNumber: string;
  createdAt: string;
  dateOfBirth: string;
  district: string;
  documents?: {
    [key: string]: string;
  };
  fromName?: string;
  toName?: string;
  transferReason?: string;
  transferredAt?: string;
  // Add other fields as needed
}

const DOCUMENT_LABELS = {
  encumbranceCert: 'Encumbrance Certificate',
  gpsTaggedSelfie: 'GPS Tagged Selfie',
  idProof: 'ID Proof',
  landMap: 'Land Map',
  landPhoto: 'Land Photo',
  landmarkPhotos: 'Landmark Photos',
  mutationCert: 'Mutation Certificate',
  photo: 'Photo',
  taxReceipts: 'Tax Receipts',
  titleDeed: 'Title Deed'
};

export default function LandOwnerDetails() {
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [verificationData, setVerificationData] = useState<VerificationData | null>(null);
  const [landOwnerData, setLandOwnerData] = useState<any>(null);
  const [transferData, setTransferData] = useState<TransferData | null>(null);

  useEffect(() => {
    const parsedOwnerData = typeof params.landOwnerData === 'string' 
      ? JSON.parse(params.landOwnerData)
      : null;

    if (!parsedOwnerData) {
      console.log('No parsed owner data');
      setLoading(false);
      return;
    }

    const fetchDetails = async () => {
      try {
        setLoading(true);
        setLandOwnerData(parsedOwnerData);

        // Fetch verification data
        if (parsedOwnerData.verificationId) {
          const verificationRef = ref(database, `landVerifications/${parsedOwnerData.verificationId}`);
          const verificationSnapshot = await get(verificationRef);
          
          if (verificationSnapshot.exists()) {
            setVerificationData({
              id: parsedOwnerData.verificationId,
              ...verificationSnapshot.val()
            });
          }
        }

        // Fetch transfer data if status is completed and transferRequestId exists
        if (parsedOwnerData.transferStatus === 'completed' && parsedOwnerData.transferRequestId) {
          const transferRef = ref(database, `propertyTransfers/${parsedOwnerData.transferRequestId}`);
          const transferSnapshot = await get(transferRef);
          
          if (transferSnapshot.exists()) {
            setTransferData(transferSnapshot.val());
          }
        }
      } catch (error) {
        console.error('Error fetching details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [params.landOwnerData]);

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (e) {
      return dateString;
    }
  };

  const openDocument = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error('Error opening document:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a90e2" />
        <Text>Loading details...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Land Details</Text>

      {/* Basic Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Property ID:</Text>
          <Text style={styles.value}>{landOwnerData?.propertyId}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Survey Number:</Text>
          <Text style={styles.value}>{landOwnerData?.surveyNumber}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Owner Name:</Text>
          <Text style={styles.value}>{landOwnerData?.ownerName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>Location:</Text>
          <Text style={styles.value}>{`${landOwnerData?.city}, ${landOwnerData?.district}`}</Text>
        </View>
      </View>

      {/* Debug Information */}
      {__DEV__ && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Debug Info</Text>
          <Text>Has Verification Data: {verificationData ? 'Yes' : 'No'}</Text>
          <Text>Transfer Status: {landOwnerData?.transferStatus}</Text>
          <Text>Verification ID: {landOwnerData?.verificationId}</Text>
        </View>
      )}

      {/* Verification Details */}
      {verificationData && (
        <>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Contact Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Phone:</Text>
              <Text style={styles.value}>{verificationData.contactNumber || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Date of Birth:</Text>
              <Text style={styles.value}>{verificationData.dateOfBirth || 'N/A'}</Text>
            </View>
          </View>

          {/* Documents */}
          {verificationData.documentUrls && Object.keys(verificationData.documentUrls).length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Documents</Text>
              <View style={styles.documentsGrid}>
                {Object.entries(verificationData.documentUrls).map(([key, url]) => (
                  url && (
                    <TouchableOpacity
                      key={key}
                      style={styles.documentCard}
                      onPress={() => openDocument(url)}
                    >
                      <Image
                        source={{ uri: url }}
                        style={styles.documentThumbnail}
                        resizeMode="cover"
                      />
                      <View style={styles.documentInfo}>
                        <Text style={styles.documentName}>
                          {DOCUMENT_LABELS[key as keyof typeof DOCUMENT_LABELS] || key}
                        </Text>
                        <Ionicons name="open-outline" size={20} color="#666" />
                      </View>
                    </TouchableOpacity>
                  )
                ))}
              </View>
            </View>
          )}
        </>
      )}

      {/* Transfer Records Section */}
      {transferData && landOwnerData?.transferStatus === 'completed' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transfer Records</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Transfer Date:</Text>
            <Text style={styles.value}>{formatDate(transferData.transferredAt || transferData.createdAt)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>From:</Text>
            <Text style={styles.value}>{transferData.fromName || 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>To:</Text>
            <Text style={styles.value}>{transferData.toName || 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Reason:</Text>
            <Text style={styles.value}>{transferData.transferReason || 'N/A'}</Text>
          </View>

          {/* Transfer Documents */}
          {transferData.documents && Object.keys(transferData.documents).length > 0 && (
            <View style={styles.documentsSection}>
              <Text style={styles.subsectionTitle}>Transfer Documents</Text>
              <View style={styles.documentsGrid}>
                {Object.entries(transferData.documents).map(([key, url]) => (
                  url && (
                    <TouchableOpacity
                      key={key}
                      style={styles.documentCard}
                      onPress={() => openDocument(url)}
                    >
                      <Image
                        source={{ uri: url }}
                        style={styles.documentThumbnail}
                        resizeMode="cover"
                      />
                      <View style={styles.documentInfo}>
                        <Text style={styles.documentName}>
                          {key.split(/(?=[A-Z])/).join(' ')}
                        </Text>
                        <Ionicons name="open-outline" size={20} color="#666" />
                      </View>
                    </TouchableOpacity>
                  )
                ))}
              </View>
            </View>
          )}

          {/* Additional Transfer Details */}
          <View style={styles.additionalInfo}>
            <Text style={styles.subsectionTitle}>Additional Details</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>City:</Text>
              <Text style={styles.value}>{transferData.city || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>District:</Text>
              <Text style={styles.value}>{transferData.district || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Contact:</Text>
              <Text style={styles.value}>{transferData.contactNumber || 'N/A'}</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  value: {
    fontSize: 16,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  documentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  documentCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  documentThumbnail: {
    width: '100%',
    height: 120,
    backgroundColor: '#f0f0f0',
  },
  documentInfo: {
    padding: 8,
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
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    color: '#444',
  },
  documentsSection: {
    marginTop: 16,
  },
  additionalInfo: {
    marginTop: 16,
  }
});
