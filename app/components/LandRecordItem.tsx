// LandRecordItem.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { LandRecord } from "./types"; // shared type

interface LandRecordItemProps {
  record: LandRecord;
  onPressMap: (record: LandRecord) => void;
  onPressDetails: (record: LandRecord) => void;
}

const LandRecordItem: React.FC<LandRecordItemProps> = ({ record, onPressMap, onPressDetails }) => {
  const ownershipStatus = record.isPreviousOwner ? 'Previous Owner' : 'Current Owner';
  
  return (
    <TouchableOpacity 
      style={[
        styles.card,
        record.isPreviousOwner && styles.previousOwnerCard
      ]}
      onPress={() => onPressDetails(record)}
    >
      <View style={styles.mainInfo}>
        <Text style={styles.surveyNumber}>Survey No: {record.surveyNumber}</Text>
        <Text style={styles.ownerInfo}>{record.ownerName}</Text>
        <Text style={styles.ownershipStatus}>{ownershipStatus}</Text>
        {record.propertyId && (
          <Text style={styles.propertyId}>ID: {record.propertyId}</Text>
        )}
      </View>
      <TouchableOpacity 
        style={styles.mapButton}
        onPress={() => onPressMap(record)}
      >
        <Text style={styles.mapButtonText}>View Map</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  previousOwnerCard: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
    borderWidth: 1,
  },
  mainInfo: {
    flex: 1,
  },
  surveyNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  ownerInfo: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  ownershipStatus: {
    fontSize: 12,
    color: '#4A90E2',
    marginTop: 2,
  },
  propertyId: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  mapButton: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 12,
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 12,
  },
});

export default LandRecordItem;
