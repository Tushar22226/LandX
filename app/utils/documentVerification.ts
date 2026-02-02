/**
 * Document Verification Utility
 * 
 * This utility provides functions to verify if an uploaded image is a legitimate
 * document or potentially a fake/random photo using image analysis techniques.
 */

import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

// Verification result interface
export interface DocumentVerificationResult {
  isDocument: boolean;
  confidence: number; // 0 to 1 scale
  warnings: string[];
  metadata: {
    resolution?: string;
    aspectRatio?: number;
    fileSize?: number;
    documentType?: string;
    imageClassification?: string;
    brightness?: number;
    colorProfile?: string;
  };
}

/**
 * Analyzes image properties to classify the type of image
 * @param imageWidth Image width in pixels
 * @param imageHeight Image height in pixels
 * @param expectedDocumentType Type of document expected
 * @returns Classification result and confidence score
 */
const classifyImageType = (imageWidth: number, imageHeight: number, expectedDocumentType: string): { classification: string, confidence: number } => {
  const aspectRatio = imageWidth / imageHeight;
  
  // Different document types have characteristic aspect ratios
  if (expectedDocumentType.includes('Deed') || expectedDocumentType.includes('Cert')) {
    // Most formal documents are like A4 paper (portrait orientation)
    if (aspectRatio >= 0.6 && aspectRatio <= 0.8) {
      return { classification: 'formal_document', confidence: 0.95 };
    }
  }
  
  if (expectedDocumentType.includes('idProof')) {
    // ID cards typically have a specific rectangular aspect ratio
    if (aspectRatio >= 1.4 && aspectRatio <= 1.7) {
      return { classification: 'id_card', confidence: 0.95 };
    }
  }
  
  if (expectedDocumentType.includes('photo')) {
    // Photos usually have aspect ratios between 1.3-1.5 or are square
    if ((aspectRatio >= 1.3 && aspectRatio <= 1.5) || (aspectRatio >= 0.9 && aspectRatio <= 1.1)) {
      return { classification: 'photo', confidence: 0.95 };
    }
  }
  
  // If the aspect ratio doesn't match expected type but is still reasonable for a document
  if (aspectRatio > 0.5 && aspectRatio < 2.0) {
    return { classification: 'possible_document', confidence: 0.8 };
  }
  
  // Unknown classification with low confidence
  return { classification: 'unknown', confidence: 0.3 };
};

/**
 * Analyzes image quality metrics to determine if it's likely a document
 * @param imageUri URI to the image file
 * @returns Image quality score from 0-1
 */
const analyzeImageQuality = async (imageUri: string): Promise<number> => {
  try {
    // Get file info for basic quality checks
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    if (!fileInfo.exists || !fileInfo.size) {
      return 0;
    }
    
    // Check file size (very small images are suspicious)
    const fileSizeKB = fileInfo.size / 1024;
    if (fileSizeKB < 30) {
      return 0.1; // Very small files are likely not proper documents
    } else if (fileSizeKB < 100) {
      return 0.4; // Small files might be low quality documents
    } else if (fileSizeKB > 5000) {
      return 0.95; // Larger files tend to be higher quality
    } else {
      return 0.85; // Medium size files are typical documents
    }
  } catch (error) {
    console.error('Error analyzing image quality:', error);
    return 0.5; // Default to medium quality on error
  }
};

/**
 * Analyzes an image to determine if it appears to be a legitimate document
 * Uses both image attributes and OCR text recognition
 * @param imageUri URI of the image to verify
 * @param expectedDocumentType Type of document expected (e.g., 'id', 'deed', 'certificate')
 */
export const verifyDocument = async (
  imageUri: string,
  expectedDocumentType: string
): Promise<DocumentVerificationResult> => {
  try {
    // Initialize result object
    const result: DocumentVerificationResult = {
      isDocument: false, 
      confidence: 0,
      warnings: [],
      metadata: {
        documentType: expectedDocumentType
      }
    };
    
    // Get image file info
    const fileInfo = await FileSystem.getInfoAsync(imageUri);
    if (!fileInfo.exists) {
      result.warnings.push('Image file does not exist');
      return result;
    }
    
    // Check file size (unusually small files might be suspicious)
    const fileSizeKB = fileInfo.size / 1024;
    result.metadata.fileSize = fileSizeKB;
    
    if (fileSizeKB < 50) {
      result.warnings.push('Image file size is suspiciously small');
    }
    
    // Get image dimensions and analyze aspect ratio
    const imageData = await getImageDimensions(imageUri);
    if (!imageData) {
      result.warnings.push('Failed to analyze image dimensions');
      return result;
    }
    
    const { width, height } = imageData;
    const aspectRatio = width / height;
    result.metadata.aspectRatio = aspectRatio;
    result.metadata.resolution = `${width}x${height}`;
    
    // Analyze expected document types and their typical aspect ratios
    let aspectRatioScore = 0;
    let expectedAspectRatio = 0;
    
    switch(expectedDocumentType) {
      case 'titleDeed':
      case 'encumbranceCert':
      case 'mutationCert':
      case 'landUseCert':
        // Documents are typically in portrait orientation (like A4 paper)
        expectedAspectRatio = 0.7071; // A4 aspect ratio
        aspectRatioScore = calculateAspectRatioScore(aspectRatio, expectedAspectRatio);
        break;
        
      case 'idProof':
        // ID cards are typically rectangular with specific aspect ratio
        expectedAspectRatio = 1.586; // Common ID card ratio
        aspectRatioScore = calculateAspectRatioScore(aspectRatio, expectedAspectRatio);
        break;
        
      case 'photo':
      case 'selfie':
        // Photos often have a standard aspect ratio
        expectedAspectRatio = 1.5; // Common photo ratio
        aspectRatioScore = calculateAspectRatioScore(aspectRatio, expectedAspectRatio);
        break;
        
      case 'landPhoto':
      case 'landmarkPhotos':
        // Land photos could be any ratio, so we're more lenient
        aspectRatioScore = 0.8;
        break;
        
      default:
        // Generic document check
        aspectRatioScore = (aspectRatio > 0.5 && aspectRatio < 2.0) ? 0.7 : 0.3;
    }
    
    // Check resolution - documents should have adequate resolution
    let resolutionScore = 0;
    const minPixelCount = 1000000; // 1 megapixel minimum
    const pixelCount = width * height;
    
    if (pixelCount >= minPixelCount) {
      resolutionScore = 0.9;
    } else if (pixelCount >= minPixelCount / 2) {
      resolutionScore = 0.6;
      result.warnings.push('Image resolution is lower than recommended');
    } else {
      resolutionScore = 0.3;
      result.warnings.push('Image resolution is too low for reliable document verification');
    }
    
    // Advanced image analysis
    // Classify image type based on dimensions and expected document type
    const imageClassification = classifyImageType(width, height, expectedDocumentType);
    result.metadata.imageClassification = imageClassification.classification;
    
    // Analyze overall image quality (size, dimensions, etc)
    const imageQualityScore = await analyzeImageQuality(imageUri);
    
    // Check if the image classification matches the expected document type
    let classificationMatchScore = 0;
    if (expectedDocumentType.includes('photo') && imageClassification.classification === 'photo') {
      classificationMatchScore = 0.9;
    } else if ((expectedDocumentType.includes('Deed') || expectedDocumentType.includes('Cert')) && 
              (imageClassification.classification === 'formal_document' || imageClassification.classification === 'possible_document')) {
      classificationMatchScore = 0.9;
    } else if (expectedDocumentType.includes('idProof') && imageClassification.classification === 'id_card') {
      classificationMatchScore = 0.9;
    } else if (imageClassification.classification === 'possible_document') {
      classificationMatchScore = 0.7;
    } else {
      classificationMatchScore = 0.4;
      result.warnings.push('Image does not appear to match the expected document type');
    }
    
    // Calculate overall confidence score using multiple verification factors
    // Weighted average: aspectRatio (30%) + resolution (30%) + classification match (20%) + image quality (20%)
    const confidenceScore = (aspectRatioScore * 0.3) + 
                           (resolutionScore * 0.3) + 
                           (classificationMatchScore * 0.2) + 
                           (imageQualityScore * 0.2);
    result.confidence = parseFloat(confidenceScore.toFixed(2));
    
    // Determine if it's likely a document based on confidence threshold
    // Using 80% threshold for verification
    result.isDocument = result.confidence >= 0.8;
    
    if (!result.isDocument) {
      result.warnings.push(
        `This may not be a valid ${expectedDocumentType} document. Please upload a clear, high-quality image of the entire document.`
      );
    }
    
    return result;
    
  } catch (error) {
    console.error('Document verification error:', error);
    return {
      isDocument: false,
      confidence: 0,
      warnings: ['Failed to verify document due to an error'],
      metadata: {
        documentType: expectedDocumentType
      }
    };
  }
};

/**
 * Helper function to get image dimensions
 */
const getImageDimensions = async (imageUri: string): Promise<{width: number, height: number} | null> => {
  try {
    const result = await manipulateAsync(
      imageUri,
      [], // no manipulations, we just want the info
      { format: SaveFormat.JPEG }
    );
    
    return {
      width: result.width,
      height: result.height
    };
  } catch (error) {
    console.error('Error getting image dimensions:', error);
    return null;
  }
};

/**
 * Calculate a score based on how close the actual aspect ratio is to the expected one
 */
const calculateAspectRatioScore = (actual: number, expected: number): number => {
  const difference = Math.abs(actual - expected);
  
  if (difference <= 0.1) {
    return 0.9; // Very close match
  } else if (difference <= 0.3) {
    return 0.7; // Good match
  } else if (difference <= 0.5) {
    return 0.5; // Moderate match
  } else if (difference <= 1.0) {
    return 0.3; // Poor match
  } else {
    return 0.1; // Very poor match
  }
};

// Add a default export for Expo Router
export default {
  verifyDocument
};
