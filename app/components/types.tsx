import React from 'react';
import { View } from 'react-native';

// types.
export interface LandRecord {
  id: string;
  surveyNumber: string;
  transferStatus: string;
  ownerName: string;
  district: string;
  state: string;
  pinCode: string;
  landSize: string;
  sizeUnit: string;
  ownershipType: string;
  isVerified: boolean;
  verifiedAt: string;
  verifiedBy: string;
  propertyId?: string;
  transferredAt?: string;
  transferredTo?: string;
  previousOwner?: string;
  transferReason?: string;
  applicantEmail?: string;
  isPreviousOwner?: boolean;
}

// Add a default export for Expo Router
export default null;

