import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { LandRecord } from './components/types';

export default function DetailScreen() {
  const params = useLocalSearchParams();
  const record = params.record ? JSON.parse(params.record as string) as LandRecord : null;

  if (!record) return null;

  // Determine which owner to show
  const currentOwner = record.transferStatus === "completed" ? record.previousOwner : record.ownerName;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Property Details</Text>
      
      {/* Basic Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Survey Number:</Text>
          <Text style={styles.value}>{record.surveyNumber}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Current Owner:</Text>
          <Text style={styles.value}>{currentOwner}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Transfer Status:</Text>
          <Text style={[styles.value, styles.status]}>{record.transferStatus}</Text>
        </View>
      </View>

      {/* Location Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.label}>District:</Text>
          <Text style={styles.value}>{record.district}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>State:</Text>
          <Text style={styles.value}>{record.state}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Pin Code:</Text>
          <Text style={styles.value}>{record.pinCode}</Text>
        </View>
      </View>

      {/* Property Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Property Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Land Size:</Text>
          <Text style={styles.value}>{`${record.landSize} ${record.sizeUnit}`}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Ownership Type:</Text>
          <Text style={styles.value}>{record.ownershipType}</Text>
        </View>
      </View>

      {/* Transfer History */}
      {record.transferStatus === "completed" && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transfer History</Text>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Previous Owner:</Text>
            <Text style={styles.value}>{record.previousOwner}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Transfer Date:</Text>
            <Text style={styles.value}>
              {record.transferredAt ? new Date(record.transferredAt).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.label}>Transfer Reason:</Text>
            <Text style={styles.value}>{record.transferReason || 'N/A'}</Text>
          </View>
        </View>
      )}

      {/* Verification Details */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Verification Details</Text>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Verified:</Text>
          <Text style={styles.value}>{record.isVerified ? 'Yes' : 'No'}</Text>
        </View>
        {record.verifiedAt && (
          <View style={styles.detailRow}>
            <Text style={styles.label}>Verified On:</Text>
            <Text style={styles.value}>
              {new Date(record.verifiedAt).toLocaleDateString()}
            </Text>
          </View>
        )}
        {record.verifiedBy && (
          <View style={styles.detailRow}>
            <Text style={styles.label}>Verified By:</Text>
            <Text style={styles.value}>{record.verifiedBy}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#444',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    fontSize: 16,
    color: '#666',
    flex: 1,
  },
  value: {
    fontSize: 16,
    color: '#333',
    flex: 2,
    textAlign: 'right',
  },
  status: {
    textTransform: 'capitalize',
    fontWeight: '500',
  },
});
