import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { verifyDocument, DocumentVerificationResult } from '../utils/documentVerification';

type VerificationStatus = 'unverified' | 'verifying' | 'verified' | 'rejected';

type DocumentUploadProps = {
  document?: {
    id: string;
    title: string;
    description: string;
    mandatory: boolean;
    category?: string;
  };
  title?: string;
  description?: string;
  mandatory?: boolean;
  category?: string;
  onToggle?: () => void;
  onPress?: (isSelected: boolean, imageUri?: string, verificationResult?: DocumentVerificationResult) => void;
  isUploaded?: boolean;
};

export default function DocumentUpload({
  document,
  title: propTitle,
  description: propDescription,
  mandatory = false,
  category: propCategory,
  onToggle,
  onPress,
  isUploaded = false,
}: DocumentUploadProps) {
  // Use either document properties or individual props
  const title = document?.title || propTitle || '';
  const description = document?.description || propDescription;
  const isMandatory = document?.mandatory || mandatory;
  const category = document?.category || propCategory;
  const [image, setImage] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('unverified');
  const [verificationResult, setVerificationResult] = useState<DocumentVerificationResult | null>(null);
  
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Sorry, we need camera roll permissions to upload documents!'
          );
        }
      }
    })();
  }, []);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const selectedImage = result.assets[0].uri;
      setImage(selectedImage);
      setVerificationStatus('verifying');
      
      try {
        // Get document ID for verification
        const docId = document?.id || 'document';
        const docVerificationResult = await verifyDocument(selectedImage, docId);
        setVerificationResult(docVerificationResult);
        
        if (docVerificationResult.isDocument) {
          setVerificationStatus('verified');
          if (onToggle) {
            onToggle();
          } else if (onPress) {
            onPress(true, selectedImage, docVerificationResult);
          }
        } else {
          setVerificationStatus('rejected');
          Alert.alert(
            'Document Verification Warning',
            docVerificationResult.warnings.join('\n'),
            [
              { 
                text: 'Upload Anyway', 
                onPress: () => {
                  if (onToggle) onToggle();
                  else if (onPress) onPress(true, selectedImage, docVerificationResult);
                }
              },
              { 
                text: 'Try Again', 
                style: 'cancel',
                onPress: () => {
                  setImage(null);
                  setVerificationStatus('unverified');
                }
              }
            ]
          );
        }
      } catch (error) {
        console.error('Verification error:', error);
        setVerificationStatus('unverified');
        // Allow upload despite verification error
        Alert.alert(
          'Verification Error',
          'Could not verify document. Do you want to upload anyway?',
          [
            { 
              text: 'Upload Anyway', 
              onPress: () => {
                if (onToggle) onToggle();
                else if (onPress) onPress(true, selectedImage);
              }
            },
            { 
              text: 'Cancel', 
              style: 'cancel',
              onPress: () => {
                setImage(null);
              }
            }
          ]
        );
      }
    }
  };
  
  const handlePress = () => {
    if (!isUploaded) {
      pickImage();
    } else if (onToggle) {
      onToggle();
    } else if (onPress) {
      onPress(false);
      setImage(null);
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.container, isUploaded && styles.containerSelected]} 
      onPress={handlePress}
    >
      {category && (
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{category}</Text>
        </View>
      )}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {isMandatory && <Text style={styles.mandatory}>*</Text>}
        {isUploaded ? (
          verificationStatus === 'verifying' ? (
            <View style={styles.verificationIndicator}>
              <ActivityIndicator size="small" color="#FFA500" />
              <Text style={styles.verifyingText}>Verifying...</Text>
            </View>
          ) : verificationStatus === 'verified' ? (
            <View style={styles.verificationIndicator}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          ) : verificationStatus === 'rejected' ? (
            <View style={styles.verificationIndicator}>
              <Ionicons name="warning" size={24} color="#FF9800" />
              <Text style={styles.warningText}>Verification Warning</Text>
            </View>
          ) : (
            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
          )
        ) : (
          <Text style={styles.uploadText}>{Platform.OS === 'android' ? 'Tap to Upload' : 'Click to Upload'}</Text>
        )}
      </View>
      {description && (
        <Text style={styles.description}>{description}</Text>
      )}
      {image && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: image }} style={styles.imagePreview} />
          
          {verificationStatus === 'verified' && (
            <View style={styles.verificationResultsContainer}>
              <Text style={styles.verificationTitle}>Document Verification Results</Text>
              
              {verificationResult?.metadata?.imageClassification && (
                <View style={styles.classificationContainer}>
                  <Text style={styles.verificationSubtitle}>Document Classification:</Text>
                  <View style={styles.classificationBadge}>
                    <Text style={styles.classificationText}>
                      {verificationResult.metadata.imageClassification.replace('_', ' ').toUpperCase()}
                    </Text>
                  </View>
                </View>
              )}
              
              <View style={styles.confidenceContainer}>
                <Text style={styles.verificationSubtitle}>Verification Confidence:</Text>
                <View style={styles.confidenceBarContainer}>
                  <View 
                    style={[styles.confidenceBar, { width: `${(verificationResult?.confidence || 0) * 100}%` }]}
                  />
                </View>
                <Text style={styles.confidenceText}>
                  {Math.round((verificationResult?.confidence || 0) * 100)}%
                </Text>
              </View>
              
              {verificationResult?.metadata?.resolution && verificationResult?.metadata?.aspectRatio && (
                <TouchableOpacity 
                  style={styles.showDetailsButton}
                  onPress={() => Alert.alert(
                    'Document Details', 
                    `Resolution: ${verificationResult.metadata.resolution || 'Unknown'}\nAspect Ratio: ${verificationResult.metadata.aspectRatio ? verificationResult.metadata.aspectRatio.toFixed(2) : 'Unknown'}\nFile Size: ${verificationResult.metadata.fileSize ? `${(verificationResult.metadata.fileSize / 1024).toFixed(1)} KB` : 'Unknown'}`,
                    [{ text: 'OK' }]
                  )}
                >
                  <Text style={styles.showDetailsButtonText}>Show Document Details</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          
          {verificationStatus === 'rejected' && verificationResult?.warnings && (
            <View style={styles.warningContainer}>
              <Text style={styles.warningTitle}>Verification Failed</Text>
              <Text style={styles.warningSubtitle}>Our system requires 80% confidence to verify documents</Text>
              {verificationResult.warnings.map((warning, index) => (
                <Text key={index} style={styles.warningText}>• {warning}</Text>
              ))}
              <Text style={styles.warningHelpText}>
                Try uploading a clearer image with better lighting and make sure the entire document is visible.
              </Text>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  containerSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#f0fff0',
  },
  categoryBadge: {
    position: 'absolute',
    top: -10,
    right: 10,
    backgroundColor: '#2196F3',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 1,
  },
  categoryText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  uploadText: {
    color: '#007AFF',
    fontSize: 14,
  },
  imagePreviewContainer: {
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginTop: 5,
  },
  container: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  mandatory: {
    color: '#FF5252',
    fontWeight: 'bold',
  },
  description: {
    marginTop: 5,
    color: '#666',
    fontSize: 14,
  },
  verificationIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifyingText: {
    fontSize: 12,
    color: '#FFA500',
    fontWeight: '500',
  },
  verifiedText: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '500',
  },
  warningText: {
    fontSize: 12,
    color: '#FF9800',
    fontWeight: '500',
  },
  verificationResultsContainer: {
    marginTop: 10,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  verificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  verificationSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#555',
    marginBottom: 4,
  },
  classificationContainer: {
    marginBottom: 10,
  },
  classificationBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#a5d6a7',
    alignSelf: 'flex-start',
  },
  classificationText: {
    fontSize: 11,
    color: '#2e7d32',
    fontWeight: '500',
  },
  confidenceContainer: {
    marginVertical: 8,
  },
  confidenceBarContainer: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 4,
  },
  confidenceBar: {
    height: '100%',
    backgroundColor: '#4caf50',
    borderRadius: 3,
  },
  confidenceText: {
    fontSize: 10,
    color: '#555',
    alignSelf: 'flex-end',
  },
  showDetailsButton: {
    backgroundColor: '#eeeeee',
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 8,
  },
  showDetailsButtonText: {
    fontSize: 12,
    color: '#555',
  },
  warningContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffe0b2',
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e65100',
    marginBottom: 4,
  },
  warningSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#e65100',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  warningHelpText: {
    fontSize: 12,
    color: '#555',
    marginTop: 10,
    backgroundColor: '#fff8e1',
    padding: 8,
    borderRadius: 4,
    borderLeftWidth: 2,
    borderLeftColor: '#ffb74d',
  },
});
