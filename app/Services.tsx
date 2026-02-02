import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { checkIsRevenueAdmin } from './utils/firebaseUtils';

type RootStackParamList = {
  LandRegister: undefined;
  PropertyVerification: undefined;
  AdminVerification: undefined;
  PropertyOwned: undefined;
  PropertyTransfer: { propertyId: string; propertyData: any };
  TransferRequests: undefined;
  LandOwner: undefined;
  AdminDocuments: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'LandRegister'>;

export default function Services() {
  const navigation = useNavigation<NavigationProp>();
  const [isRevenueAdmin, setIsRevenueAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        setIsLoading(true);
        const isAdmin = await checkIsRevenueAdmin();
        setIsRevenueAdmin(isAdmin);
      } catch (error) {
        console.error('Error checking admin status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminStatus();
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4a90e2" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Our Services</Text>
      <View style={styles.servicesList}>
        {isRevenueAdmin ? (
          // Admin Services
          <>
            <TouchableOpacity 
              style={[styles.serviceItem, styles.adminServiceItem]}
              onPress={() => navigation.navigate('AdminVerification')}
            >
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>REVENUE DEPT</Text>
              </View>
              <Text style={styles.serviceTitle}>Verify Properties</Text>
              <Text style={styles.serviceDescription}>Review and approve property verification requests</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.serviceItem, styles.adminServiceItem]}
              onPress={() => navigation.navigate('LandOwner')}
            >
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>REVENUE DEPT</Text>
              </View>
              <Text style={styles.serviceTitle}>Land Owners</Text>
              <Text style={styles.serviceDescription}>View and manage registered land owners</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.serviceItem, styles.adminServiceItem]}
              onPress={() => navigation.navigate('AdminDocuments')}
            >
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>REVENUE DEPT</Text>
              </View>
              <Text style={styles.serviceTitle}>Documents</Text>
              <Text style={styles.serviceDescription}>Manage and verify property documents</Text>
            </TouchableOpacity>
          </>
        ) : (
          // Regular User Services
          <>
            <TouchableOpacity 
              style={styles.serviceItem}
              onPress={() => navigation.navigate('LandRegister')}
            >
              <Text style={styles.serviceTitle}>Land Registry</Text>
              <Text style={styles.serviceDescription}>Secure and transparent land registration services</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.serviceItem}
              onPress={() => navigation.navigate('PropertyVerification')}
            >
              <Text style={styles.serviceTitle}>Property Verification</Text>
              <Text style={styles.serviceDescription}>Verify property details and ownership</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.serviceItem}
              onPress={() => navigation.navigate('PropertyOwned')}
            >
              <Text style={styles.serviceTitle}>Property Owned</Text>
              <Text style={styles.serviceDescription}>View and manage your verified properties</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.serviceItem}
              onPress={() => navigation.navigate('TransferRequests')}
            >
              <Text style={styles.serviceTitle}>Transfer Requests</Text>
              <Text style={styles.serviceDescription}>Check the status of your property transfer requests</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.serviceItem}
              onPress={() => navigation.navigate('DocumentManagement')}
            >
              <Text style={styles.serviceTitle}>Document Management</Text>
              <Text style={styles.serviceDescription}>Digital storage of land documents</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  servicesList: {
    gap: 20,
  },
  serviceItem: {
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  serviceTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  serviceDescription: {
    color: '#666',
    fontSize: 14,
  },
  adminServiceItem: {
    backgroundColor: '#e6f7ed',
    borderWidth: 1,
    borderColor: '#b7e0cd',
    position: 'relative',
    paddingTop: 25,
  },
  adminBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#34a853',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  adminBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});
