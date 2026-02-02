import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ref, get, update, set, push } from 'firebase/database';
import { database, storage, auth } from '../firebaseConfig';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { getCurrentUserEmail } from './utils/firebaseUtils';

// No type definitions needed for Expo Router

export default function PropertyTransfer() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const propertyId = params.propertyId as string;
  const propertyData = params.propertyData ? JSON.parse(params.propertyData as string) : {};

  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerAddress, setNewOwnerAddress] = useState('');
  const [newOwnerAadhaar, setNewOwnerAadhaar] = useState('');
  const [newOwnerPAN, setNewOwnerPAN] = useState('');
  const [loading, setLoading] = useState(false);
  const [transferReason, setTransferReason] = useState('');
  const [voluntaryTransfer, setVoluntaryTransfer] = useState(false);
  
  // Define document types for TypeScript
  type DocumentType = 
    | 'saleDeed'
    | 'titleDeed'
    | 'encumbranceCertificate'
    | 'mutationCertificate'
    | 'propertyTaxReceipts'
    | 'currentOwnerAadhaar'
    | 'currentOwnerPAN'
    | 'currentOwnerVoterId'
    | 'newOwnerAadhaar'
    | 'newOwnerPAN'
    | 'newOwnerVoterId'
    | 'surveyMap'
    | 'landPatta'
    | 'noc'
    | 'powerOfAttorney'
    | 'conversionCertificate'
    | 'bankReleaseCertificate';
  
  interface DocumentsState {
    [key: string]: boolean;
  }
  
  // State for document uploads
  const [documentsUploaded, setDocumentsUploaded] = useState<DocumentsState>({
    saleDeed: false,
    titleDeed: false,
    encumbranceCertificate: false,
    mutationCertificate: false,
    propertyTaxReceipts: false,
    currentOwnerAadhaar: false,
    currentOwnerPAN: false,
    currentOwnerVoterId: false,
    newOwnerAadhaar: false,
    newOwnerPAN: false,
    newOwnerVoterId: false,
    surveyMap: false,
    landPatta: false,
    noc: false,
    powerOfAttorney: false,
    conversionCertificate: false,
    bankReleaseCertificate: false
  });
  
  // State for document URLs
  const [documentUrls, setDocumentUrls] = useState<{[key in DocumentType]?: string}>({});
  
  const validateInputs = () => {
    // Validate basic information
    if (!newOwnerEmail.trim()) {
      Alert.alert('Error', 'Please enter the new owner\'s email address.');
      return false;
    }
    
    if (!newOwnerEmail.includes('@') || !newOwnerEmail.includes('.')) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return false;
    }
    
    if (!newOwnerName.trim()) {
      Alert.alert('Error', 'Please enter the new owner\'s name.');
      return false;
    }
    
    if (!newOwnerAddress.trim()) {
      Alert.alert('Error', 'Please enter the new owner\'s address.');
      return false;
    }
    
    if (!newOwnerAadhaar.trim() || newOwnerAadhaar.length !== 12) {
      Alert.alert('Error', 'Please enter a valid 12-digit Aadhaar number.');
      return false;
    }
    
    if (!voluntaryTransfer) {
      Alert.alert('Consent Required', 'Please confirm that you are transferring this property voluntarily without any coercion.');
      return false;
    }
    
    if (!newOwnerPAN.trim() || newOwnerPAN.length !== 10) {
      Alert.alert('Error', 'Please enter a valid 10-character PAN number.');
      return false;
    }
    
    if (!transferReason.trim()) {
      Alert.alert('Error', 'Please enter a reason for the transfer.');
      return false;
    }
    
    // Check for required documents
    const requiredDocs = [
      { key: 'saleDeed' as DocumentType, name: 'Sale Deed' },
      { key: 'titleDeed' as DocumentType, name: 'Title Deed' },
      { key: 'encumbranceCertificate' as DocumentType, name: 'Encumbrance Certificate' },
      { key: 'currentOwnerAadhaar' as DocumentType, name: 'Current Owner\'s Aadhaar Card' },
      { key: 'currentOwnerPAN' as DocumentType, name: 'Current Owner\'s PAN Card' },
      { key: 'currentOwnerVoterId' as DocumentType, name: 'Current Owner\'s Voter ID' },
      { key: 'newOwnerAadhaar' as DocumentType, name: 'New Owner\'s Aadhaar Card' },
      { key: 'newOwnerPAN' as DocumentType, name: 'New Owner\'s PAN Card' },
      { key: 'newOwnerVoterId' as DocumentType, name: 'New Owner\'s Voter ID' },
      { key: 'surveyMap' as DocumentType, name: 'Survey Map' }
    ];
    
    for (const doc of requiredDocs) {
      if (!documentsUploaded[doc.key]) {
        Alert.alert('Missing Document', `Please upload the ${doc.name} document.`);
        return false;
      }
    }
    
    return true;
  };

  // Function to pick and upload document
  const pickAndUploadDocument = async (documentType: DocumentType, documentName: string) => {
    try {
      // Request media library permissions
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'You need to grant permission to access your photos');
        return;
      }
      
      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        const response = await fetch(uri);
        const blob = await response.blob();
        
        // Determine the document category based on type
        let category = '';
        if (documentType.startsWith('currentOwner')) {
          category = 'current_owner_id';
        } else if (documentType.startsWith('newOwner')) {
          category = 'new_owner_id';
        } else if (['saleDeed', 'titleDeed', 'encumbranceCertificate', 'mutationCertificate', 'propertyTaxReceipts'].includes(documentType as string)) {
          category = 'property_documents';
        } else if (['surveyMap', 'landPatta', 'noc'].includes(documentType as string)) {
          category = 'land_documents';
        } else {
          category = 'additional_documents';
        }
        
        // Get user ID and survey number for the path
        const uid = auth.currentUser?.uid || 'anonymous';
        const surveyNumber = propertyData.surveyNumber || 'unknown';
        
        // Generate a unique filename
        const fileExtension = uri.split('.').pop() || 'jpg';
        const filename = `${documentType}_${new Date().getTime()}.${fileExtension}`;
        
        // Create reference to storage location following the established pattern
        // landVerifications/{uid}/{surveyNumber}/{category}/{filename}
        const storageReference = storageRef(storage, `landVerifications/${uid}/${surveyNumber}/${category}/${filename}`);
        
        // Show loading indicator
        setLoading(true);
        
        // Upload the file
        const uploadResult = await uploadBytes(storageReference, blob);
        
        // Get download URL
        const downloadURL = await getDownloadURL(storageReference);
        
        // Update state to mark document as uploaded
        setDocumentsUploaded(prev => ({
          ...prev,
          [documentType]: true
        }));
        
        // Save the download URL
        setDocumentUrls(prev => ({
          ...prev,
          [documentType]: downloadURL
        }));
        
        setLoading(false);
        Alert.alert('Success', `${documentName} uploaded successfully`);
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      setLoading(false);
      Alert.alert('Error', `Failed to upload ${documentName}. Please try again.`);
    }
  };

  // Document item component
  const DocumentItem = ({ type, name, required }: { type: DocumentType, name: string, required: boolean }) => (
    <View style={styles.documentItem}>
      <View style={styles.documentInfo}>
        <Text style={styles.documentName}>{name}</Text>
        {required && <Text style={styles.requiredTag}>Required</Text>}
        {documentsUploaded[type] && <Text style={styles.uploadedTag}>Uploaded</Text>}
      </View>
      <TouchableOpacity 
        style={[styles.uploadButton, documentsUploaded[type] ? styles.uploadedButton : {}]}
        onPress={() => pickAndUploadDocument(type, name)}
      >
        <Text style={styles.uploadButtonText}>
          {documentsUploaded[type] ? 'Re-upload' : 'Upload'}
        </Text>
      </TouchableOpacity>
    </View>
  );
  
  const handleTransfer = async () => {
    if (!validateInputs()) return;
    
    try {
      setLoading(true);
      
      // Get current user's email for verification
      const currentEmail = await getCurrentUserEmail();
      
      if (!currentEmail) {
        Alert.alert('Error', 'Unable to verify your account. Please sign in again.');
        return;
      }
      
      // Verify that current user is the owner
      if (propertyData.applicantEmail !== currentEmail && propertyData.email !== currentEmail) {
        Alert.alert('Error', 'You don\'t have permission to transfer this property.');
        return;
      }
      
      // Create transfer request in the database
      const transferId = `transfer_${Date.now()}`;
      const transferRef = ref(database, `propertyTransfers/${transferId}`);
      
      // Fetch complete property data if it's from landVerifications
      let completePropertyData = {...propertyData};
      
      if (propertyData.verificationId) {
        const verificationRef = ref(database, `landVerifications/${propertyData.verificationId}`);
        const snapshot = await get(verificationRef);
        if (snapshot.exists()) {
          completePropertyData = snapshot.val();
        }
      }
      
      // Record transfer details with timestamp and status while preserving all original data
      await set(transferRef, {
        // Original property data - preserve all fields
        ...completePropertyData,
        
        // Transfer-specific data
        propertyId: propertyData.propertyId || completePropertyData.propertyId || `PROP-${propertyData.surveyNumber}`,
        originalId: propertyId,
        verificationId: propertyData.verificationId || '',
        
        // Original owner data
        fromEmail: currentEmail,
        fromName: completePropertyData.ownerName || propertyData.ownerName,
        fromContactNumber: completePropertyData.contactNumber || '',
        fromIdType: completePropertyData.ownerIdType || 'aadhaar',
        fromIdNumber: completePropertyData.ownerId || '',
        
        // New owner details
        toEmail: newOwnerEmail,
        toName: newOwnerName,
        toAddress: newOwnerAddress,
        toAadhaar: newOwnerAadhaar,
        toPAN: newOwnerPAN,
        
        // Property details
        city: completePropertyData.city || '',
        district: completePropertyData.district || propertyData.district,
        state: completePropertyData.state || propertyData.state,
        landSize: completePropertyData.landSize || propertyData.landSize,
        sizeUnit: completePropertyData.sizeUnit || propertyData.sizeUnit,
        landType: completePropertyData.landType || 'residential',
        landPrice: completePropertyData.landPrice || '',
        encumbranceStatus: completePropertyData.encumbranceStatus || 'free',
        latitude: completePropertyData.latitude || '',
        longitude: completePropertyData.longitude || '',
        geoTagged: completePropertyData.geoTagged || false,
        
        // Transfer request details
        reason: transferReason,
        documents: documentUrls,  // Include all uploaded document URLs
        originalDocumentUrls: completePropertyData.documentUrls || {},
        requestedAt: new Date().toISOString(),
        status: 'pending', // pending, approved, rejected
        verificationNeeded: true,
        isVerified: false,
        voluntaryTransferDeclaration: true, // Declaration that the transfer is voluntary
      });
      
      // Also update the property record to show pending transfer
      const propertyPath = propertyData.verificationId ? 
        `landVerifications/${propertyData.verificationId}` : 
        `landOwners/${propertyId}`;
      
      const propertyRef = ref(database, propertyPath);
      
      // Update property to show pending transfer
      await update(propertyRef, {
        transferPending: true,
        transferId: transferId,
        transferRequestedAt: new Date().toISOString(),
        transferStatus: 'pending',
        transferToName: newOwnerName,
        transferToEmail: newOwnerEmail
      });
      
      Alert.alert(
        'Transfer Requested',
        'Your property transfer request has been submitted. The revenue department will need to verify and approve this transfer.',
        [
          { 
            text: 'OK', 
            onPress: () => router.push('/PropertyOwned')
          }
        ]
      );
    } catch (error) {
      console.error('Error transferring property:', error);
      Alert.alert('Error', 'Failed to submit transfer request. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerBackButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transfer Property</Text>
      </View>
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.propertyInfo}>
          <Text style={styles.propertyInfoTitle}>Property Information</Text>
          <Text style={styles.propertyInfoText}>Survey Number: {propertyData.surveyNumber}</Text>
          <Text style={styles.propertyInfoText}>District: {propertyData.district}</Text>
          <Text style={styles.propertyInfoText}>State: {propertyData.state}</Text>
          <Text style={styles.propertyInfoText}>Land Size: {propertyData.landSize} {propertyData.sizeUnit}</Text>
        </View>
        
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>New Owner Details</Text>
          
          <Text style={styles.inputLabel}>New Owner's Email*</Text>
          <TextInput
            style={styles.input}
            value={newOwnerEmail}
            onChangeText={setNewOwnerEmail}
            placeholder="Enter new owner's email"
            keyboardType="email-address"
          />
          
          <Text style={styles.inputLabel}>New Owner's Name*</Text>
          <TextInput
            style={styles.input}
            value={newOwnerName}
            onChangeText={setNewOwnerName}
            placeholder="Enter new owner's name"
          />
          
          <Text style={styles.inputLabel}>New Owner's Address*</Text>
          <TextInput
            style={styles.input}
            value={newOwnerAddress}
            onChangeText={setNewOwnerAddress}
            placeholder="Enter new owner's full address"
            multiline
            numberOfLines={2}
          />
          
          <Text style={styles.inputLabel}>New Owner's Aadhaar Number*</Text>
          <TextInput
            style={styles.input}
            value={newOwnerAadhaar}
            onChangeText={setNewOwnerAadhaar}
            placeholder="Enter 12-digit Aadhaar number"
            keyboardType="numeric"
            maxLength={12}
          />
          
          <Text style={styles.inputLabel}>New Owner's PAN Number*</Text>
          <TextInput
            style={styles.input}
            value={newOwnerPAN}
            onChangeText={setNewOwnerPAN}
            placeholder="Enter 10-character PAN"
            autoCapitalize="characters"
            maxLength={10}
          />
          
          <Text style={styles.inputLabel}>Reason for Transfer*</Text>
          <TextInput
            style={styles.textArea}
            value={transferReason}
            onChangeText={setTransferReason}
            placeholder="Enter reason for transfer"
            multiline
            numberOfLines={4}
          />
          
          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              style={[styles.checkbox, voluntaryTransfer ? styles.checkboxChecked : {}]}
              onPress={() => setVoluntaryTransfer(!voluntaryTransfer)}
            >
              {voluntaryTransfer && <Ionicons name="checkmark" size={18} color="#fff" />}
            </TouchableOpacity>
            <Text style={styles.checkboxLabel}>
              I declare that I am transferring this property voluntarily and am not under any pressure, threat or coercion.
            </Text>
          </View>
        </View>
        
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Required Documents</Text>
          <Text style={styles.docInstructions}>Upload all required documents for property transfer verification.</Text>
          
          <Text style={styles.docSectionTitle}>1. Basic Documents Needed</Text>
          <DocumentItem type="saleDeed" name="Sale Deed (Registered)" required={true} />
          <DocumentItem type="titleDeed" name="Title Deed" required={true} />
          <DocumentItem type="encumbranceCertificate" name="Encumbrance Certificate" required={true} />
          <DocumentItem type="mutationCertificate" name="Mutation Certificate" required={true} />
          <DocumentItem type="propertyTaxReceipts" name="Property Tax Receipts" required={true} />
          
          <Text style={styles.docSectionTitle}>2. Current Owner Identity Documents</Text>
          <DocumentItem type="currentOwnerAadhaar" name="Current Owner's Aadhaar Card" required={true} />
          <DocumentItem type="currentOwnerPAN" name="Current Owner's PAN Card" required={true} />
          <DocumentItem type="currentOwnerVoterId" name="Current Owner's Voter ID" required={true} />
          
          <Text style={styles.docSectionTitle}>3. New Owner Identity Documents</Text>
          <DocumentItem type="newOwnerAadhaar" name="New Owner's Aadhaar Card" required={true} />
          <DocumentItem type="newOwnerPAN" name="New Owner's PAN Card" required={true} />
          <DocumentItem type="newOwnerVoterId" name="New Owner's Voter ID" required={true} />
          
          <Text style={styles.docSectionTitle}>4. Land-Specific Documents</Text>
          <DocumentItem type="surveyMap" name="Survey Map / Plot Layout" required={true} />
          <DocumentItem type="landPatta" name="Land Patta / Khata Certificate" required={true} />
          <DocumentItem type="noc" name="NOC from Authorities" required={true} />
          
          <Text style={styles.docSectionTitle}>5. Additional Documents (If Applicable)</Text>
          <DocumentItem type="powerOfAttorney" name="Power of Attorney" required={false} />
          <DocumentItem type="conversionCertificate" name="Agricultural Land Conversion Certificate" required={false} />
          <DocumentItem type="bankReleaseCertificate" name="Bank Release Certificate" required={false} />
        </View>
        
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color="#4a90e2" />
          <Text style={styles.infoText}>
            Note: This transfer will need to be verified and approved by the Revenue Department before it becomes official.
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleTransfer}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="swap-horizontal" size={20} color="#fff" style={{marginRight: 8}} />
              <Text style={styles.submitButtonText}>Submit Transfer Request</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  headerBackButton: {
    padding: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  scrollView: {
    flex: 1,
    padding: 15,
  },
  propertyInfo: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  propertyInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  propertyInfoText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
  formSection: {
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 5,
    color: '#555',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    fontSize: 14,
    backgroundColor: '#f9f9f9',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    padding: 10,
    marginBottom: 15,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: '#f9f9f9',
  },
  docInstructions: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  docSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    color: '#2E7D32',
  },
  documentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  documentInfo: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  documentName: {
    fontSize: 14,
    color: '#333',
    flexShrink: 1,
    marginRight: 8,
  },
  requiredTag: {
    fontSize: 10,
    color: '#fff',
    backgroundColor: '#F44336',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 5,
  },
  uploadedTag: {
    fontSize: 10,
    color: '#fff',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  uploadButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 4,
  },
  uploadedButton: {
    backgroundColor: '#4CAF50',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#0d47a1',
    marginLeft: 10,
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 30,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  }
});
