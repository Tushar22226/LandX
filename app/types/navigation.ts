import React from 'react';
import { View } from 'react-native';

// Export your navigation types
export type NavigationTypes = {
  // Your navigation type definitions
  Home: undefined;
  LandOwner: undefined;
  LandOwnerDetails: {
    landOwnerData: string;
  };
  // Add other routes as needed
};

// Simple object as default export to satisfy Expo Router
const navigationConfig = {
  // You can add any navigation-related configuration here
  version: '1.0.0',
  routes: ['Home', 'LandOwner', 'LandOwnerDetails']
};

export default navigationConfig;
