import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LandRecord } from './components/types';

export default function MapScreen() {
  const params = useLocalSearchParams();
  const record = params.record ? JSON.parse(params.record as string) as LandRecord : null;

  return (
    <View style={styles.container}>
      <Text>Map View for Survey Number: {record?.surveyNumber}</Text>
      {/* Add your map implementation here */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
