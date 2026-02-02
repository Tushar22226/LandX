import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { RouteProp, useRoute } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';

type DocumentPreviewRouteProp = RouteProp<RootStackParamList, 'DocumentPreview'>;

interface DocumentPreviewProps {
  documentUrl: string;
  documentName?: string;
  onClose?: () => void;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({ 
  documentUrl, 
  documentName = 'Document',
  onClose 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState<'image' | 'pdf' | 'unknown'>('unknown');
  const [localFilePath, setLocalFilePath] = useState<string | null>(null);

  const detectDocumentType = (url: string): 'image' | 'pdf' | 'unknown' => {
    const lowerUrl = url.toLowerCase();
    if (lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || lowerUrl.endsWith('.png') || lowerUrl.endsWith('.gif')) {
      return 'image';
    } else if (lowerUrl.endsWith('.pdf')) {
      return 'pdf';
    } else {
      // Try to determine by content type or assume based on content
      if (lowerUrl.includes('image')) {
        return 'image';
      } else if (lowerUrl.includes('pdf')) {
        return 'pdf';
      }
    }
    return 'unknown';
  };

  const downloadForPreview = async (url: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Detect document type from URL
      const detectedType = detectDocumentType(url);
      setDocumentType(detectedType);
      
      // For PDFs, we'll need to download them to a local file for viewing
      if (detectedType === 'pdf') {
        // Generate a temporary file path
        const fileUri = `${FileSystem.cacheDirectory}temp_document_${Date.now()}.pdf`;
        
        // Download the file
        const downloadResult = await FileSystem.downloadAsync(url, fileUri);
        
        if (downloadResult.status === 200) {
          setLocalFilePath(fileUri);
        } else {
          setError('Failed to download document');
        }
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error preparing document for preview:', err);
      setError('Failed to load document. Please try again later.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (documentUrl) {
      downloadForPreview(documentUrl);
    }
  }, [documentUrl]);

  const handleViewPdf = async () => {
    try {
      if (localFilePath) {
        await WebBrowser.openBrowserAsync(localFilePath);
      } else if (documentUrl) {
        await WebBrowser.openBrowserAsync(documentUrl);
      }
    } catch (error) {
      console.error('Error opening PDF:', error);
      setError('Failed to open PDF viewer');
    }
  };

  const renderPreview = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4a90e2" />
          <Text style={styles.loadingText}>Loading document...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color="#e74c3c" />
          <Text style={styles.errorTitle}>Failed to Load Document</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => downloadForPreview(documentUrl)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    switch (documentType) {
      case 'image':
        return (
          <ScrollView 
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            maximumZoomScale={3}
            minimumZoomScale={1}
          >
            <Image
              source={{ uri: documentUrl }}
              style={styles.imagePreview}
              resizeMode="contain"
            />
          </ScrollView>
        );
      
      case 'pdf':
        return (
          <View style={styles.pdfContainer}>
            <View style={styles.pdfPlaceholder}>
              <Ionicons name="document-text-outline" size={80} color="#4a90e2" />
              <Text style={styles.pdfTitle}>{documentName || 'PDF Document'}</Text>
            </View>
            <TouchableOpacity 
              style={styles.openPdfButton}
              onPress={handleViewPdf}
            >
              <Ionicons name="open-outline" size={18} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.openPdfButtonText}>Open PDF</Text>
            </TouchableOpacity>
          </View>
        );
      
      default:
        return (
          <View style={styles.unsupportedContainer}>
            <Ionicons name="document-outline" size={80} color="#f1c40f" />
            <Text style={styles.unsupportedTitle}>Unsupported Document Type</Text>
            <Text style={styles.unsupportedMessage}>This document format cannot be previewed</Text>
            <TouchableOpacity 
              style={styles.openExternalButton}
              onPress={() => WebBrowser.openBrowserAsync(documentUrl)}
            >
              <Ionicons name="open-outline" size={18} color="#fff" style={styles.buttonIcon} />
              <Text style={styles.openExternalButtonText}>Open in Browser</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{documentName}</Text>
        {onClose && (
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.previewContainer}>
        {renderPreview()}
      </View>
    </View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  previewContainer: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: width - 40,
    height: height * 0.6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginTop: 12,
  },
  errorMessage: {
    marginTop: 8,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4a90e2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  pdfContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pdfPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 30,
  },
  pdfTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  openPdfButton: {
    backgroundColor: '#4a90e2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  openPdfButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  unsupportedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  unsupportedTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  unsupportedMessage: {
    marginTop: 8,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  openExternalButton: {
    backgroundColor: '#4a90e2',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  openExternalButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonIcon: {
    marginRight: 8,
  },
});

export default DocumentPreview;