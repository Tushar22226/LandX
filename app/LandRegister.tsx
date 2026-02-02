import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import DocumentUpload from './components/DocumentUpload';
import { uploadImageToStorage, saveLandVerificationData, getCurrentUserId } from './utils/firebaseUtils';

type Document = {
  id: string;
  title: string;
  description: string;
  mandatory: boolean;
  category: string;
};

type FormData = {
  surveyNumber: string;
  landSize: string;
  sizeUnit: 'sqm' | 'acres' | 'hectares';
  landType: 'residential' | 'agricultural' | 'commercial' | 'industrial';
  latitude: string;
  longitude: string;
  village: string;
  town: string;
  city: string;
  district: string;
  state: string;
  pinCode: string;
  geoTagged: boolean;
  encumbranceStatus: 'clear' | 'loan' | 'disputed';
  landPrice: string;
  ownerName: string;
  ownerId: string;
  ownerIdType: 'aadhaar' | 'pan' | 'voter';
  dateOfBirth: string;
  contactNumber: string;
  email: string;
  residentialAddress: string;
  ownershipType: 'sole' | 'joint' | 'leasehold';
};

import { DocumentVerificationResult } from './utils/documentVerification';

type UploadedDocs = {
  [key: string]: {
    isUploaded: boolean;
    imageUri?: string;
    verificationResult?: DocumentVerificationResult;
  };
};

export default function LandRegister() {
  const [currentStep, setCurrentStep] = useState(1);
  const [currentDocIndex, setCurrentDocIndex] = useState(0);

  // 1. Land Ownership Documents
  const landOwnershipDocuments: Document[] = [
    {
      id: 'titleDeed',
      title: 'Title Deed / Sale Deed (Proof of Ownership)',
      description: 'Confirms legal ownership of the land. Should have Registration Number, Stamp Duty, and Notary Signatures. Upload in PDF/JPEG format.',
      mandatory: true,
      category: 'Land Ownership Documents'
    },
    {
      id: 'encumbranceCert',
      title: 'Encumbrance Certificate (EC) (No Loan or Legal Issues Proof)',
      description: 'Confirms the land has no pending loans or disputes. Must be issued by the Revenue Department.',
      mandatory: true,
      category: 'Land Ownership Documents'
    },
    {
      id: 'mutationCert',
      title: 'Mutation Certificate (Ownership Transfer Proof)',
      description: 'Confirms ownership transfer in government records. Needed for new owners after property transfer.',
      mandatory: true,
      category: 'Land Ownership Documents'
    },
    {
      id: 'taxReceipts',
      title: 'Property Tax Receipts (Land Tax Payment Proof)',
      description: 'Confirms that the landowner has paid all taxes. Latest tax receipts should be uploaded.',
      mandatory: true,
      category: 'Land Ownership Documents'
    },
    {
      id: 'landMap',
      title: 'Government-Approved Land Map / Survey Sketch (Plot Verification)',
      description: 'Shows the official layout of the land. Helps in geo-verification and checking encroachments.',
      mandatory: true,
      category: 'Land Ownership Documents'
    },
    {
      id: 'landUseCert',
      title: 'Land Use Certificate (LUC) (Usage Approval)',
      description: 'Confirms land classification (Agricultural, Residential, Commercial, Industrial). Required for land conversion approvals.',
      mandatory: false,
      category: 'Land Ownership Documents'
    }
  ];
  
  // 2. Owner Identity Verification Documents
  const ownerIdentityDocuments: Document[] = [
    {
      id: 'idProof',
      title: 'Aadhaar Card / PAN Card / Voter ID / Passport (Identity & Ownership Proof)',
      description: 'Used to verify the owner\'s details with government records. Should match the name on the Title Deed.',
      mandatory: true,
      category: 'Owner Identity Verification Documents'
    },
    {
      id: 'photo',
      title: 'Recent Passport-Size Photograph (For Identity Verification)',
      description: 'Helps in facial recognition verification.',
      mandatory: true,
      category: 'Owner Identity Verification Documents'
    },
    {
      id: 'selfie',
      title: 'Selfie Verification (Optional but Recommended)',
      description: 'A live selfie can be compared with the ID card photo to prevent fraud.',
      mandatory: false,
      category: 'Owner Identity Verification Documents'
    }
  ];
  
  // 3. Additional Documents (Special Cases)
  const specialCaseDocuments: Document[] = [
    {
      id: 'affidavit',
      title: 'Affidavit of Ownership (If Deed is Lost or Not Available)',
      description: 'Used when the Title Deed is missing but ownership needs to be claimed.',
      mandatory: false,
      category: 'Additional Documents (Special Cases)'
    },
    {
      id: 'poa',
      title: 'Power of Attorney (POA) Document (If Applicable)',
      description: 'Required if someone else (not the actual owner) is registering on behalf of the owner.',
      mandatory: false,
      category: 'Additional Documents (Special Cases)'
    },
    {
      id: 'courtOrder',
      title: 'Court Order (If Land is Under Dispute and Settled in Court)',
      description: 'Required if the land was previously under legal disputes but now cleared.',
      mandatory: false,
      category: 'Additional Documents (Special Cases)'
    },
    {
      id: 'partitionDeed',
      title: 'Partition Deed (If Joint Ownership Land is Divided Among Family Members)',
      description: 'Used when a single land parcel is divided among multiple owners.',
      mandatory: false,
      category: 'Additional Documents (Special Cases)'
    },
    {
      id: 'noc',
      title: 'No Objection Certificate (NOC) (For Government Lands or Transfers)',
      description: 'If the land is acquired from the government, an NOC is required.',
      mandatory: false,
      category: 'Additional Documents (Special Cases)'
    }
  ];
  
  // 4. Live Geo-Tagged Images (For Physical Verification)
  const geoTaggedDocuments: Document[] = [
    {
      id: 'landPhoto',
      title: 'Real-Time Photo of Land (Taken from the Location)',
      description: 'Ensures that the land physically exists and matches the documents.',
      mandatory: true,
      category: 'Live Geo-Tagged Images'
    },
    {
      id: 'gpsTaggedSelfie',
      title: 'GPS-Tagged Selfie of the Owner Standing on the Land',
      description: 'Confirms that the registered owner is present at the location.',
      mandatory: true,
      category: 'Live Geo-Tagged Images'
    },
    {
      id: 'landmarkPhotos',
      title: 'Nearby Landmarks & Boundaries Photo',
      description: 'Helps in checking encroachments or incorrect mapping.',
      mandatory: true,
      category: 'Live Geo-Tagged Images'
    }
  ];
  
  // Combine all document categories into a single array
  const documents: Document[] = [
    ...landOwnershipDocuments,
    ...ownerIdentityDocuments,
    ...specialCaseDocuments,
    ...geoTaggedDocuments
  ];

  const [formData, setFormData] = useState<FormData>({
    // Land Details
    surveyNumber: '',
    landSize: '',
    sizeUnit: 'sqm',
    landType: 'residential',
    latitude: '',
    longitude: '',
    village: '',
    town: '',
    city: '',
    district: '',
    state: '',
    pinCode: '',
    geoTagged: false,
    encumbranceStatus: 'clear',
    landPrice: '',

    // Owner Details
    ownerName: '',
    ownerId: '',
    ownerIdType: 'aadhaar',
    dateOfBirth: '',
    contactNumber: '',
    email: '',
    residentialAddress: '',
    ownershipType: 'sole',
  });

  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocs>({
    // Land Ownership Documents
    titleDeed: { isUploaded: false },
    encumbranceCert: { isUploaded: false },
    mutationCert: { isUploaded: false },
    taxReceipts: { isUploaded: false },
    landMap: { isUploaded: false },
    landUseCert: { isUploaded: false },
    
    // Owner Identity Documents
    idProof: { isUploaded: false },
    photo: { isUploaded: false },
    selfie: { isUploaded: false },
    
    // Special Case Documents
    affidavit: { isUploaded: false },
    poa: { isUploaded: false },
    courtOrder: { isUploaded: false },
    partitionDeed: { isUploaded: false },
    noc: { isUploaded: false },
    
    // Geo-Tagged Images
    landPhoto: { isUploaded: false },
    gpsTaggedSelfie: { isUploaded: false },
    landmarkPhotos: { isUploaded: false }
  });

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDocumentToggle = (docId: string, imageUri?: string, verificationResult?: DocumentVerificationResult) => {
    setUploadedDocs(prev => ({
      ...prev,
      [docId]: { 
        isUploaded: !prev[docId].isUploaded,
        imageUri: imageUri || prev[docId].imageUri,
        verificationResult
      }
    }));
  };

  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleNextDocument = () => {
    if (currentDocIndex < documents.length - 1) {
      setCurrentDocIndex(currentDocIndex + 1);
    }
  };

  const handlePrevDocument = () => {
    if (currentDocIndex > 0) {
      setCurrentDocIndex(currentDocIndex - 1);
    }
  };

  const totalRequiredDocs = documents.filter(doc => doc.mandatory).length;
  const uploadedRequiredDocs = documents
    .filter(doc => doc.mandatory)
    .filter(doc => uploadedDocs[doc.id]?.isUploaded)
    .length;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigation = useNavigation();

  const validateForm = () => {
    const requiredFields = [
      'surveyNumber', 'landSize', 'landType', 'district', 'state',
      'ownerName', 'ownerId', 'ownerIdType', 'contactNumber'
    ] as (keyof FormData)[];

    const missingFields = requiredFields.filter(field => !formData[field]);
    if (missingFields.length > 0) {
      Alert.alert(
        'Missing Information',
        `Please fill in the following required fields: ${missingFields.join(', ')}`
      );
      return false;
    }

    const mandatoryDocs = documents.filter(doc => doc.mandatory);
    const missingDocs = mandatoryDocs.filter(doc => !uploadedDocs[doc.id]?.isUploaded);
    if (missingDocs.length > 0) {
      Alert.alert(
        'Missing Documents',
        `Please upload the following required documents: ${missingDocs.map(doc => doc.title).join(', ')}`
      );
      return false;
    }

    return true;
  };

  const uploadAllDocuments = async () => {
    const uid = getCurrentUserId();
    const surveyNumber = formData.surveyNumber;
    const documentUrls: Record<string, string> = {};
    const verificationResults: Record<string, DocumentVerificationResult | undefined> = {};

    // Prepare upload promises for all uploaded documents
    const uploadPromises = Object.entries(uploadedDocs)
      .filter(([_, docData]) => docData.isUploaded && docData.imageUri)
      .map(async ([docId, docData]) => {
        const imagePath = `landVerifications/${uid}/${surveyNumber}/${docId}`;
        if (!docData.imageUri) {
          console.warn(`Missing image URI for document: ${docId}`);
          return { docId, url: '' };
        }
        try {
          // Store verification result if available
          if (docData.verificationResult) {
            verificationResults[docId] = docData.verificationResult;
          }
          
          const downloadUrl = await uploadImageToStorage(docData.imageUri, imagePath);
          documentUrls[docId] = downloadUrl;
          return { docId, url: downloadUrl };
        } catch (error) {
          console.error(`Error uploading ${docId}:`, error);
          throw error;
        }
      });

    // Wait for all uploads to complete
    await Promise.all(uploadPromises);
    return { documentUrls, verificationResults };
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Upload all documents and get their URLs and verification results
      const { documentUrls, verificationResults } = await uploadAllDocuments();
      
      // Save all form data, document URLs, and verification results to Firebase
      const verificationId = await saveLandVerificationData(formData, documentUrls, verificationResults);
      
      // Success notification
      Alert.alert(
        'Submission Successful',
        `Your land registration has been submitted successfully. Your verification ID is: ${verificationId}`,
        [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]
      );
    } catch (error) {
      console.error('Error during submission:', error);
      Alert.alert(
        'Submission Failed',
        'There was an error submitting your land registration. Please try again later.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Land Registration Form</Text>
        
        {currentStep === 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Land Details</Text>
            
            <Text style={styles.label}>Survey Number</Text>
            <TextInput
              style={styles.input}
              value={formData.surveyNumber}
              onChangeText={(value) => handleInputChange('surveyNumber', value)}
              placeholder="Enter survey number"
            />
            
            <View style={styles.row}>
              <View style={styles.column}>
                <Text style={styles.label}>Land Size</Text>
                <TextInput
                  style={styles.input}
                  value={formData.landSize}
                  onChangeText={(value) => handleInputChange('landSize', value)}
                  placeholder="Enter size"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.column}>
                <Text style={styles.label}>Unit</Text>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={formData.sizeUnit}
                    onValueChange={(value) => handleInputChange('sizeUnit', value as FormData['sizeUnit'])}
                    style={styles.picker}
                  >
                    <Picker.Item label="Square Meters" value="sqm" />
                    <Picker.Item label="Acres" value="acres" />
                    <Picker.Item label="Hectares" value="hectares" />
                  </Picker>
                </View>
              </View>
            </View>
            
            <Text style={styles.label}>Land Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.landType}
                onValueChange={(value) => handleInputChange('landType', value as FormData['landType'])}
                style={styles.picker}
              >
                <Picker.Item label="Residential" value="residential" />
                <Picker.Item label="Agricultural" value="agricultural" />
                <Picker.Item label="Commercial" value="commercial" />
                <Picker.Item label="Industrial" value="industrial" />
              </Picker>
            </View>

            <Text style={styles.label}>Location</Text>
            <View style={styles.row}>
              <View style={styles.column}>
                <TextInput
                  style={styles.input}
                  value={formData.latitude}
                  onChangeText={(value) => handleInputChange('latitude', value)}
                  placeholder="Latitude"
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.column}>
                <TextInput
                  style={styles.input}
                  value={formData.longitude}
                  onChangeText={(value) => handleInputChange('longitude', value)}
                  placeholder="Longitude"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <Text style={styles.label}>Address Details</Text>
            <TextInput
              style={styles.input}
              value={formData.village}
              onChangeText={(value) => handleInputChange('village', value)}
              placeholder="Village"
            />
            <TextInput
              style={styles.input}
              value={formData.town}
              onChangeText={(value) => handleInputChange('town', value)}
              placeholder="Town"
            />
            <TextInput
              style={styles.input}
              value={formData.city}
              onChangeText={(value) => handleInputChange('city', value)}
              placeholder="City"
            />
            <TextInput
              style={styles.input}
              value={formData.district}
              onChangeText={(value) => handleInputChange('district', value)}
              placeholder="District"
            />
            <TextInput
              style={styles.input}
              value={formData.state}
              onChangeText={(value) => handleInputChange('state', value)}
              placeholder="State"
            />
            <TextInput
              style={styles.input}
              value={formData.pinCode}
              onChangeText={(value) => handleInputChange('pinCode', value)}
              placeholder="PIN Code"
              keyboardType="numeric"
            />

            <Text style={styles.label}>Encumbrance Status</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.encumbranceStatus}
                onValueChange={(value) => handleInputChange('encumbranceStatus', value as FormData['encumbranceStatus'])}
                style={styles.picker}
              >
                <Picker.Item label="Clear" value="clear" />
                <Picker.Item label="Loan" value="loan" />
                <Picker.Item label="Disputed" value="disputed" />
              </Picker>
            </View>

            <Text style={styles.label}>Land Price (₹)</Text>
            <TextInput
              style={styles.input}
              value={formData.landPrice}
              onChangeText={(value) => handleInputChange('landPrice', value)}
              placeholder="Enter land price"
              keyboardType="numeric"
            />
          </View>
        )}
        
        {currentStep === 2 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Owner Details</Text>
            
            <Text style={styles.label}>Owner Name</Text>
            <TextInput
              style={styles.input}
              value={formData.ownerName}
              onChangeText={(value) => handleInputChange('ownerName', value)}
              placeholder="Enter owner name"
            />
            
            <Text style={styles.label}>ID Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.ownerIdType}
                onValueChange={(value) => handleInputChange('ownerIdType', value as FormData['ownerIdType'])}
                style={styles.picker}
              >
                <Picker.Item label="Aadhaar Card" value="aadhaar" />
                <Picker.Item label="PAN Card" value="pan" />
                <Picker.Item label="Voter ID" value="voter" />
              </Picker>
            </View>
            
            <Text style={styles.label}>ID Number</Text>
            <TextInput
              style={styles.input}
              value={formData.ownerId}
              onChangeText={(value) => handleInputChange('ownerId', value)}
              placeholder="Enter ID number"
            />

            <Text style={styles.label}>Date of Birth</Text>
            <TextInput
              style={styles.input}
              value={formData.dateOfBirth}
              onChangeText={(value) => handleInputChange('dateOfBirth', value)}
              placeholder="DD/MM/YYYY"
            />

            <Text style={styles.label}>Contact Number</Text>
            <TextInput
              style={styles.input}
              value={formData.contactNumber}
              onChangeText={(value) => handleInputChange('contactNumber', value)}
              placeholder="Enter contact number"
              keyboardType="phone-pad"
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              placeholder="Enter email"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Residential Address</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.residentialAddress}
              onChangeText={(value) => handleInputChange('residentialAddress', value)}
              placeholder="Enter residential address"
              multiline
              numberOfLines={4}
            />

            <Text style={styles.label}>Ownership Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.ownershipType}
                onValueChange={(value) => handleInputChange('ownershipType', value as FormData['ownershipType'])}
                style={styles.picker}
              >
                <Picker.Item label="Sole Owner" value="sole" />
                <Picker.Item label="Joint Ownership" value="joint" />
                <Picker.Item label="Leasehold" value="leasehold" />
              </Picker>
            </View>
          </View>
        )}
        
        {currentStep === 3 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Document Upload</Text>
            
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                Progress: {uploadedRequiredDocs}/{totalRequiredDocs} required documents
              </Text>
              <View style={styles.progressBarContainer}>
                <View 
                  style={[
                    styles.progressBar, 
                    { width: `${(uploadedRequiredDocs / totalRequiredDocs) * 100}%` }
                  ]} 
                />
              </View>
            </View>
            
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryTitle}>{documents[currentDocIndex].category}</Text>
            </View>
            
            <Text style={styles.docInstruction}>
              Please upload: <Text style={styles.docHighlight}>{documents[currentDocIndex].title}</Text>
            </Text>
            
            <DocumentUpload
              document={documents[currentDocIndex]}
              isUploaded={uploadedDocs[documents[currentDocIndex].id]?.isUploaded}
              onPress={(isUploaded, imageUri, verificationResult) => 
                handleDocumentToggle(documents[currentDocIndex].id, imageUri, verificationResult)
              }
            />
            
            <View style={styles.docNavigation}>
              <TouchableOpacity
                style={[styles.docNavButton, currentDocIndex === 0 && styles.disabledButton]}
                onPress={handlePrevDocument}
                disabled={currentDocIndex === 0}
              >
                <Ionicons name="chevron-back" size={24} color={currentDocIndex === 0 ? '#999' : '#fff'} />
                <Text style={styles.docNavButtonText}>Previous</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.docNavButton, 
                  currentDocIndex === documents.length - 1 && styles.disabledButton
                ]}
                onPress={handleNextDocument}
                disabled={currentDocIndex === documents.length - 1}
              >
                <Text style={styles.docNavButtonText}>Next</Text>
                <Ionicons 
                  name="chevron-forward" 
                  size={24} 
                  color={currentDocIndex === documents.length - 1 ? '#999' : '#fff'} 
                />
              </TouchableOpacity>
            </View>
          </View>
        )}
        
        <View style={styles.navigation}>
          <TouchableOpacity
            style={[styles.navButton, currentStep === 1 && styles.disabledButton]}
            onPress={handlePrevStep}
            disabled={currentStep === 1}
          >
            <Text style={styles.navButtonText}>Previous</Text>
          </TouchableOpacity>
          
          {currentStep < 3 ? (
            <TouchableOpacity
              style={styles.navButton}
              onPress={handleNextStep}
            >
              <Text style={styles.navButtonText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.navButton, 
                (uploadedRequiredDocs < totalRequiredDocs || isSubmitting) && styles.disabledButton
              ]}
              onPress={handleSubmit}
              disabled={uploadedRequiredDocs < totalRequiredDocs || isSubmitting}
            >
              {isSubmitting ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.navButtonText}>Submitting...</Text>
                </View>
              ) : (
                <Text style={styles.navButtonText}>
                  {uploadedRequiredDocs < totalRequiredDocs ? 'Upload Required Documents' : 'Submit'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  column: {
    flex: 1,
    marginRight: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  picker: {
    height: 50,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressText: {
    fontSize: 14,
    marginBottom: 8,
    color: '#555',
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#eee',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  docInstruction: {
    fontSize: 14,
    marginBottom: 16,
    color: '#555',
  },
  docHighlight: {
    fontWeight: 'bold',
    color: '#333',
  },
  categoryHeader: {
    backgroundColor: '#f0f8ff',
    padding: 10,
    borderRadius: 5,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3',
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  docNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  docNavButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    borderRadius: 4,
    padding: 10,
    minWidth: 100,
    justifyContent: 'center',
  },
  docNavButtonText: {
    color: '#fff',
    marginHorizontal: 8,
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  navButton: {
    backgroundColor: '#2196F3',
    borderRadius: 4,
    padding: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  navButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});
