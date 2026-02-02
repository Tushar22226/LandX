import React, { useState, useEffect, useLayoutEffect } from "react";
import { View, TextInput, FlatList, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useNavigation, NavigationProp } from "@react-navigation/native";
import { ref, onValue } from "firebase/database";
import { database } from "../firebaseConfig";
import LandRecordItem from "./components/LandRecordItem";
import { LandRecord } from "./components/types";
import { Ionicons } from '@expo/vector-icons';

export default function Home() {
  const [search, setSearch] = useState<string>("");
  const [records, setRecords] = useState<LandRecord[]>([]);
  const navigation = useNavigation<NavigationProp<any>>();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    const landOwnersRef = ref(database, "landOwners");
    const unsubscribe = onValue(landOwnersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const recordsArray: LandRecord[] = Object.keys(data).map((key) => ({
          id: key,
          ...data[key],
        }));
        const filteredRecords = recordsArray.filter((record) =>
          record.surveyNumber.toLowerCase().includes(search.toLowerCase())
        );
        setRecords(filteredRecords.slice(0, 10));
      }
    });
    return () => unsubscribe();
  }, [search]);

  const handleMapPress = (record: LandRecord) => {
    navigation.navigate("MapScreen", { record });
  };

  const handleDetailsPress = (record: LandRecord) => {
    navigation.navigate("DetailScreen", { record });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>LandX</Text>
        <Text style={styles.subtitle}>Digital Land Management</Text>
      </View>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchBar}
          placeholder="Search with survey number"
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#666"
        />
      </View>
      <FlatList
        data={records}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <LandRecordItem 
            record={item} 
            onPressMap={handleMapPress} 
            onPressDetails={handleDetailsPress} 
          />
        )}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />

      {/* Bottom Navigation Bar */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => navigation.navigate('Services')}
        >
          <Ionicons name="grid-outline" size={24} color="#4A90E2" />
          <Text style={styles.navText}>Services</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.navItem, styles.navItemActive]}>
          <View style={styles.homeIconContainer}>
            <Ionicons name="home" size={24} color="#fff" />
          </View>
          <Text style={[styles.navText, styles.navTextActive]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="settings-outline" size={24} color="#4A90E2" />
          <Text style={styles.navText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: "#fff",
  },
  searchBar: {
    height: 46,
    backgroundColor: "#f5f5f5",
    borderRadius: 23,
    paddingHorizontal: 20,
    fontSize: 16,
    color: "#333",
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 80, // Add padding to prevent list items from being hidden behind nav bar
  },
  // Bottom Navigation Styles
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingBottom: 25, // Add extra padding for iPhone X and newer
    borderTopWidth: 1,
    borderTopColor: '#eee',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  navItemActive: {
    transform: [{translateY: -20}],
  },
  homeIconContainer: {
    backgroundColor: '#4A90E2',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  navText: {
    fontSize: 12,
    color: '#4A90E2',
    marginTop: 4,
  },
  navTextActive: {
    color: '#4A90E2',
    fontWeight: 'bold',
  },
});
