import 'react-native-reanimated'
import React, { useEffect, useRef } from "react";
import { Text, View, Animated, ActivityIndicator, Image } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { onAuthStateChanged } from "firebase/auth";
import "react-native-gesture-handler"; // Keep this at the top!
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { auth } from "../firebaseConfig"; // Ensure correct import

// Define navigation types
type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Splash: undefined;
};

export default function Index() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    // Fade in and scale animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    ]).start();
  }, [fadeAnim, scaleAnim]);

  useFocusEffect(
    React.useCallback(() => {
      const timer = setTimeout(() => {
        if (!auth) {
          console.error("Firebase auth not initialized properly");
          return;
        }

        onAuthStateChanged(auth, (user) => {
          if (user) {
            navigation.replace("Home");
          } else {
            navigation.replace("Login");
          }
        });
      }, 3000);

      return () => clearTimeout(timer); // Cleanup
    }, [navigation]) // Add navigation dependency
  );

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#fff",
      }}
    >
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
          alignItems: "center",
        }}
      >
        <Image
          source={require('../assets/images/logo_512.png')}
          style={{ width: 150, height: 150, resizeMode: 'contain' }}
        />
        <Text
          style={{
            fontSize: 24,
            marginTop: 20,
            fontWeight: 'bold',
            color: "#333",
          }}
        >
          LandX
        </Text>
        <Text
          style={{
            fontSize: 16,
            marginTop: 5,
            color: "#666",
          }}
        >
          Digital Land Management
        </Text>
      </Animated.View>

      <ActivityIndicator size="large" color="#4A90E2" style={{ marginTop: 40 }} />
    </View>
  );
}
