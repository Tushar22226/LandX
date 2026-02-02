import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, TouchableOpacity, Dimensions, ScrollView } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { useLocalSearchParams } from 'expo-router';

export default function DocumentPreview() {
  const params = useLocalSearchParams();
  const documentUrl = params.documentUrl as string;
  const documentName = params.documentName as string;

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
      
      const detectedType = detectDocumentType(url);
      setDocumentType(detectedType);
      
      if (detectedType === 'pdf') {
        const fileUri = `${FileSystem.cacheDirectory}temp_document_${Date.now()}.pdf`;
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
      </View>
      
      <View style={styles.previewContainer}>
        {renderPreview()}
      </View>
    </View>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  previewContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e74c3c',
    marginTop: 10,
  },
  errorMessage: {
    marginTop: 5,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#4a90e2',
    borderRadius: 5,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreview: {
    width: width,
    height: height - 100,
  },
  pdfContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pdfPlaceholder: {
    alignItems: 'center',
  },
  pdfTitle: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
  },
  openPdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 12,
    backgroundColor: '#4a90e2',
    borderRadius: 5,
  },
  buttonIcon: {
    marginRight: 5,
  },
  openPdfButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  unsupportedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  unsupportedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#f1c40f',
    marginTop: 10,
  },
  unsupportedMessage: {
    marginTop: 5,
    color: '#666',
    textAlign: 'center',
  },
  openExternalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 12,
    backgroundColor: '#4a90e2',
    borderRadius: 5,
  },
  openExternalButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
});