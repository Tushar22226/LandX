import { Stack } from "expo-router";
import { View } from "react-native";
import 'react-native-reanimated'

export default function RootLayout() {
  return (
    <Stack screenOptions={{
      headerStyle: {
        backgroundColor: '#FFFFFF',
      },
      headerTintColor: '#4A90E2',
      headerTitleAlign: 'center',
    }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen 
        name="Login" 
        options={{ 
          headerShown: false
        }} 
      />
      <Stack.Screen 
        name="Home" 
        options={{ 
          title: "Home"
        }} 
      />
      <Stack.Screen 
        name="Register" 
        options={{
          title: "Register"
        }}
      />
      <Stack.Screen 
        name="LandRegister" 
        options={{
          title: "Land Registration"
        }}
      />
      <Stack.Screen name="PropertyVerification" options={{headerShown: false}}/>
      <Stack.Screen name="AdminVerification" options={{headerShown: false}}/>
      <Stack.Screen name="PropertyOwned" options={{headerShown: false}}/>
      <Stack.Screen name="PropertyTransfer" options={{headerShown: false}}/>
      <Stack.Screen 
        name="Services" 
        options={{
          title: "Services"
        }}
      />
      <Stack.Screen name="TransferRequests" options={{headerShown: false}}/>
      <Stack.Screen 
        name="DocumentPreview" 
        options={{
          title: "Document Preview",
          headerShown: true
        }}
      />
      <Stack.Screen 
        name="DocumentGallery" 
        options={{
          title: "Documents",
          headerShown: true
        }}
      />
    </Stack>
  );
}
