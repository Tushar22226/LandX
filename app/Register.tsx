import React, { useState, useEffect } from "react";
import { 
  Platform, 
  View, 
  Alert, 
  Image, 
  ScrollView, 
  StyleSheet, 
  Text, 
  ViewStyle,
  TouchableOpacity, 
  Dimensions,
  KeyboardAvoidingView,
  SafeAreaView
} from "react-native";
import { 
  TextInput, 
  Button, 
  IconButton,
  Surface,
  Avatar
} from "react-native-paper";
import { useRouter } from "expo-router";
import * as ImagePicker from 'expo-image-picker';

// ✅ Import React Native Reanimated Correctly
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  FadeIn,
  runOnJS
} from 'react-native-reanimated';

// ✅ Ensure Reanimated is Loaded
import 'react-native-reanimated';

// Firebase Imports
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getDatabase, ref, set } from 'firebase/database';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const storage = getStorage(app);

console.log('Firebase initialized successfully');

// =================================================================
// 📱 Registration Component
// =================================================================

export default function Registration() {
  const [step, setStep] = useState<number>(1);
  const [fullName, setFullName] = useState<string>("");
  const [dob, setDob] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [progressText, setProgressText] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [profilePic, setProfilePic] = useState<string | null>(null);
  const [aadharFront, setAadharFront] = useState<string | null>(null);
  const [aadharBack, setAadharBack] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<{ address: string } | null>(null);
  
  // =================================================================
  // Animation values using Reanimated
  // =================================================================
  const formScale = useSharedValue(0.8);
  const formOpacity = useSharedValue(0);
  const slideAnimation = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  
  // Animate on mount
  useEffect(() => {
    formScale.value = withSpring(1);
    formOpacity.value = withTiming(1, { duration: 500 });
  }, []);
  
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ scale: formScale.value }]
  }));
  
  const router = useRouter();
  
  // =================================================================
  // Handle step change with animation
  // =================================================================
  const handleStepChange = (newStep: number) => {
    formOpacity.value = withTiming(0, { duration: 300 }, () => {
      runOnJS(setStep)(newStep);
      slideAnimation.value = withSpring(newStep === 1 ? 0 : 1, { damping: 10, stiffness: 100 });
      formOpacity.value = withTiming(1, { duration: 500 });
    });
  };
  
  // =================================================================
  // Animate button on press
  // =================================================================
  const animateButton = () => {
    buttonScale.value = withSpring(0.95, { damping: 10, stiffness: 100 });
    setTimeout(() => {
      buttonScale.value = withSpring(1);
    }, 150);
  };
  
  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }]
  }));
  
  // =================================================================
  // Progress Animation Style
  // =================================================================
  const progressAnimation: ViewStyle = {
    width: `${progress * 100}%`,
    opacity: loading ? 1 : 0,
  };
  
  // =================================================================
  // Image Capture and Gallery functions
  // =================================================================
  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Denied", "Camera permission is required to capture images.");
      return false;
    }
    return true;
  };
  
  const requestGalleryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Denied", "Gallery access is required to select images.");
      return false;
    }
    return true;
  };
  
  const capturePhoto = async (type: string) => {
    if (Platform.OS === "web") {
      try {
        const video = document.createElement("video");
        video.style.position = "absolute";
        video.style.top = "-9999px";
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        document.body.appendChild(video);
        await new Promise((resolve) => (video.onloadedmetadata = resolve));
        video.play();
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const uri = canvas.toDataURL("image/png");
          if (type === "profile") setProfilePic(uri);
        }
        stream.getTracks().forEach((track) => track.stop());
        document.body.removeChild(video);
      } catch (error) {
        Alert.alert("Error", "Failed to access camera.");
      }
    } else {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) return;
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!result.canceled) {
        const uri = result.assets[0].uri;
        if (!uri) {
          Alert.alert("Error", "Failed to capture image.");
          return;
        }
        if (type === "profile") setProfilePic(uri);
      }
    }
  };
  
  const selectFromGallery = async (type: string) => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (event: Event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
          const uri = URL.createObjectURL(file);
          if (type === "aadharFront") setAadharFront(uri);
          if (type === "aadharBack") setAadharBack(uri);
        } else {
          Alert.alert("Error", "Failed to select image.");
        }
      };
      input.click();
    } else {
      const hasPermission = await requestGalleryPermission();
      if (!hasPermission) return;
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        aspect: [4, 3],
        quality: 1,
      });
      if (!result.canceled) {
        const uri = result.assets[0].uri;
        if (!uri) {
          Alert.alert("Error", "Failed to select image.");
          return;
        }
        if (type === "aadharFront") setAadharFront(uri);
        if (type === "aadharBack") setAadharBack(uri);
      }
    }
  };
  
  // =================================================================
  // Aadhar Validation (Basic)
  // =================================================================
  const validateAadhar = async (uri: string): Promise<boolean> => {
    try {
      if (!uri) {
        console.error('Validation failed: No image provided');
        setError('Please provide a valid Aadhar card image');
        return false;
      }
      console.log('Basic validation passed for:', uri);
      return true;
    } catch (error) {
      console.error('Aadhar validation error:', error);
      setError('Error validating Aadhar card. Please try again.');
      return false;
    }
  };
  
  // =================================================================
  // Upload Image to Firebase Storage
  // =================================================================
  const uploadImage = async (uri: string, path: string): Promise<string> => {
    try {
      console.log('Uploading image:', path);
      const response = await fetch(uri);
      const blob = await response.blob();
      if (!storage) {
        throw new Error('Storage is not initialized');
      }
      const storageRefPath = storageRef(storage, path);
      await uploadBytes(storageRefPath, blob);
      const downloadUrl = await getDownloadURL(storageRefPath);
      console.log('Image uploaded successfully:', path);
      return downloadUrl;
    } catch (error: unknown) {
      console.error('Failed to upload image:', path, error);
      if (error instanceof Error) {
        throw new Error(`Failed to upload image: ${error.message}`);
      }
      throw new Error('Failed to upload image: Unknown error');
    }
  };
  
  interface ErrorWithCode {
    code?: string;
    message?: string;
    stack?: string;
  }
  
   // =================================================================
  const handleError = (error: unknown) => {
    console.error('Registration error:', error);
    
    const err = error as Error | ErrorWithCode;
    const errorMessage = err.message || 'Unknown error occurred';
    
    // Check if error has a code property
    if (err && typeof (err as any).code === "string") {
      const code = (err as any).code as string;
      if (code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please use a different email.');
      } else if (code === 'auth/invalid-email') {
        setError('Invalid email address format.');
      } else if (code === 'auth/operation-not-allowed') {
        setError('Email/password accounts are not enabled. Please contact support.');
      } else if (code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.');
      } else if (code === 'auth/network-request-failed') {
        setError('Network error. Please check your internet connection.');
      } else if (code.includes('storage/')) {
        setError(`Failed to upload images: ${errorMessage}`);
      } else if (code.includes('database/')) {
        setError(`Failed to save user data: ${errorMessage}`);
      } else {
        setError(`Registration failed: ${errorMessage}`);
      }
    } else {
      setError(`Registration failed: ${errorMessage}`);
    }
  
    if ('code' in err) console.error('Error code:', err.code);
    if (err.message) console.error('Error message:', err.message);
    if ('stack' in err) console.error('Error stack:', err.stack);
  };
  
  // =================================================================
  // Handle User Registration
  // =================================================================
  const handleRegistration = async () => {
    if (loading) {
      console.log('Registration already in progress');
      return;
    }
  
    if (!auth || !db || !storage) {
      setError('Firebase is not properly initialized. Please check your configuration.');
      return;
    }
  
    console.log('Starting registration process');
    console.log('Form data:', { fullName, email, phone, dob });
    setLoading(true);
    setProgress(0);
    setError("");
    setProgressText("Starting registration process...");
    
    try {
      if (!email || !password || !fullName || !phone || !dob) {
        setError("Please fill in all required fields.");
        console.log("Please fill in all required fields.");
        setLoading(false);
        return;
      }
  
      if (!profilePic || !aadharFront || !aadharBack) {
        setError("Please upload all required images (Profile Picture and Aadhar Card).");
        setLoading(false);
        return;
      }
  
      if (!/^\d{10}$/.test(phone)) {
        console.log('Invalid phone number:', phone);
        setError("Please enter a valid 10-digit phone number.");
        setLoading(false);
        return;
      }
  
      const normalizedDob = dob.replace(/\//g, '-');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDob)) {
        console.log('Invalid date format:', dob);
        setError("Please enter date in YYYY-MM-DD or YYYY/MM/DD format.");
        setLoading(false);
        return;
      }
  
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setProgressText("Validating Aadhar card...");
      if (!(await validateAadhar(aadharFront))) {
        console.log('Aadhar card validation failed');
        setError("Aadhar card validation failed. Please ensure the details match your input.");
        setLoading(false);
        return;
      }
      setProgress(0.2);
  
      setProgressText("Creating user account...");
      console.log('Attempting to create user account with email:', email);
      
      let userCredential;
      try {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('User account created successfully:', userCredential.user.uid);
        setProgress(0.4);
  
        setProgressText("Uploading profile picture...");
        const profilePicUrl = await uploadImage(profilePic, `users/${userCredential.user.uid}/profile.jpg`);
        console.log('Profile picture uploaded:', profilePicUrl);
        setProgress(0.6);
  
        setProgressText("Uploading Aadhar card images...");
        const aadharFrontUrl = await uploadImage(aadharFront, `users/${userCredential.user.uid}/aadhar_front.jpg`);
        console.log('Aadhar front uploaded:', aadharFrontUrl);
        const aadharBackUrl = await uploadImage(aadharBack, `users/${userCredential.user.uid}/aadhar_back.jpg`);
        console.log('Aadhar back uploaded:', aadharBackUrl);
        setProgress(0.8);
  
        setProgressText("Saving user information...");
        console.log('Saving user data to database...');
        
        interface UserData {
          fullName: string;
          phone: string;
          dob: string;
          email: string;
          profilePicUrl: string;
          aadharFrontUrl: string;
          aadharBackUrl: string;
          createdAt: string;
          address?: string;
        }
        
        const userData: UserData = {
          fullName,
          phone,
          dob,
          email,
          profilePicUrl,
          aadharFrontUrl,
          aadharBackUrl,
          createdAt: new Date().toISOString(),
        };
        
        if (extractedData?.address) {
          userData.address = extractedData.address;
        }
        
        console.log('Saving user data:', userData);
        await set(ref(db, `users/${userCredential.user.uid}`), userData);
        setProgress(1);
  
        Alert.alert("Success", "Registration completed successfully!");
        router.replace("/Home");
      } catch (error) {
        console.error('Registration failed:', error);
        if (userCredential?.user) {
          try {
            await userCredential.user.delete();
            console.log('Cleaned up partial user registration');
          } catch (deleteError) {
            console.error('Failed to clean up user:', deleteError);
          }
        }
        if (error instanceof Error) {
          setError(error.message);
        } else {
          setError('Registration failed. Please try again.');
        }
      }
    } catch (err: unknown) {
      console.error('Outer registration error:', err);
      handleError(err);
    } finally {
      setLoading(false);
      if (!error) {
        setProgressText("");
      }
    }
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.keyboardAvoid}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <ScrollView>
            {/* Header with step indicator */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>User Registration</Text>
              <View style={styles.stepIndicator}>
                <View style={[styles.stepDot, step >= 1 && styles.activeStepDot]}>
                  <Text style={styles.stepNumber}>1</Text>
                </View>
                <View style={styles.stepLine} />
                <View style={[styles.stepDot, step >= 2 && styles.activeStepDot]}>
                  <Text style={styles.stepNumber}>2</Text>
                </View>
              </View>
            </View>
  
            {step === 1 && (
              <View style={[styles.formContainer]}>
                {error ? (
                  <Animated.View entering={FadeIn} style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                  </Animated.View>
                ) : null}
                <Surface style={styles.card} elevation={2}>
                  <Text style={styles.title}>Personal Information</Text>
                  <View style={styles.inputGroup}>
                    <TextInput 
                      label="Full Name" 
                      value={fullName} 
                      onChangeText={setFullName} 
                      style={styles.input}
                      mode="outlined"
                      outlineColor="#e0e0e0"
                      activeOutlineColor="#007AFF"
                      left={<TextInput.Icon icon="account" />}
                    />
  
                    <TextInput 
                      label="Date of Birth (YYYY-MM-DD)" 
                      value={dob} 
                      onChangeText={setDob} 
                      style={styles.input}
                      mode="outlined"
                      outlineColor="#e0e0e0"
                      activeOutlineColor="#007AFF"
                      left={<TextInput.Icon icon="calendar" />}
                    />
  
                    <TextInput 
                      label="Email" 
                      value={email} 
                      onChangeText={setEmail} 
                      style={styles.input}
                      mode="outlined"
                      outlineColor="#e0e0e0"
                      activeOutlineColor="#007AFF"
                      left={<TextInput.Icon icon="email" />}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
  
                    <TextInput 
                      label="Phone Number" 
                      value={phone} 
                      onChangeText={setPhone} 
                      style={styles.input}
                      mode="outlined"
                      outlineColor="#e0e0e0"
                      activeOutlineColor="#007AFF"
                      left={<TextInput.Icon icon="phone" />}
                      keyboardType="phone-pad"
                    />
  
                    <TextInput 
                      label="Password" 
                      value={password} 
                      onChangeText={setPassword}
                      secureTextEntry 
                      style={styles.input}
                      mode="outlined"
                      outlineColor="#e0e0e0"
                      activeOutlineColor="#007AFF"
                      left={<TextInput.Icon icon="lock" />}
                    />
                  </View>
  
                  <View style={styles.buttonGroup}>
                    <Button 
                      mode="contained" 
                      onPress={() => {
                        animateButton();
                        setTimeout(() => handleStepChange(2), 150);
                      }} 
                      style={styles.button}
                      buttonColor="#007AFF"
                      disabled={!fullName || !email || !phone || !password || !dob}
                    >
                      <Text style={styles.buttonText}>Next</Text>
                    </Button>
                  </View>
                </Surface>
              </View>
            )}
  
            {step === 2 && (
              <Animated.View style={[styles.formContainer, animatedStyle]}>
                <Surface style={styles.card} elevation={2}>
                  <Text style={styles.title}>Upload Documents</Text>
  
                  {/* Profile Picture Section */}
                  <View style={styles.documentSection}>
                    <Text style={styles.sectionTitle}>Profile Picture</Text>
                    <View style={styles.imageUploadContainer}>
                      {profilePic ? (
                        <TouchableOpacity 
                          onPress={() => capturePhoto("profile")}
                          activeOpacity={0.8}
                        >
                          <View style={styles.avatarContainer}>
                            <Avatar.Image size={120} source={{ uri: profilePic }} />
                            <View style={styles.editBadge}>
                              <IconButton 
                                icon="pencil" 
                                size={16} 
                                iconColor="#007AFF"
                                onPress={() => capturePhoto("profile")} 
                              />
                            </View>
                          </View>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity 
                          style={styles.imageUploadBtn}
                          onPress={() => capturePhoto("profile")}
                          activeOpacity={0.7}
                        >
                          <IconButton icon="camera" size={40} iconColor="#007AFF" />
                          <Text style={styles.uploadText}>Add Photo</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
  
                  {/* Aadhaar Card Section */}
                  <View style={styles.documentSection}>
                    <Text style={styles.sectionTitle}>Aadhaar Card</Text>
                    <Text style={styles.sectionSubtitle}>Upload both sides</Text>
  
                    <View style={styles.documentRow}>
                      {/* Front Side */}
                      <View style={styles.documentItem}>
                        {aadharFront ? (
                          <TouchableOpacity 
                            onPress={() => selectFromGallery("aadharFront")}
                            activeOpacity={0.8}
                            style={styles.documentImageContainer}
                          >
                            <Image source={{ uri: aadharFront }} style={styles.documentImage} />
                            <View style={styles.editOverlay}>
                              <IconButton icon="pencil" size={24} iconColor="#FFFFFF" />
                            </View>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity 
                            style={styles.docUploadBtn}
                            onPress={() => selectFromGallery("aadharFront")}
                            activeOpacity={0.7}
                          >
                            <IconButton icon="card-account-details" size={32} iconColor="#007AFF" />
                            <Text style={styles.uploadText}>Front Side</Text>
                          </TouchableOpacity>
                        )}
                        <Text style={styles.imageLabel}>Front Side</Text>
                      </View>
  
                      {/* Back Side */}
                      <View style={styles.documentItem}>
                        {aadharBack ? (
                          <TouchableOpacity 
                            onPress={() => selectFromGallery("aadharBack")}
                            activeOpacity={0.8}
                            style={styles.documentImageContainer}
                          >
                            <Image source={{ uri: aadharBack }} style={styles.documentImage} />
                            <View style={styles.editOverlay}>
                              <IconButton icon="pencil" size={24} iconColor="#FFFFFF" />
                            </View>
                          </TouchableOpacity>
                        ) : (
                          <TouchableOpacity 
                            style={styles.docUploadBtn}
                            onPress={() => selectFromGallery("aadharBack")}
                            activeOpacity={0.7}
                          >
                            <IconButton icon="card-account-details" size={32} iconColor="#007AFF" />
                            <Text style={styles.uploadText}>Back Side</Text>
                          </TouchableOpacity>
                        )}
                        <Text style={styles.imageLabel}>Back Side</Text>
                      </View>
                    </View>
                  </View>
  
                  <View style={styles.buttonGroup}>
                    <Button 
                      mode="outlined" 
                      onPress={() => {
                        animateButton();
                        setTimeout(() => handleStepChange(1), 150);
                      }} 
                      style={[styles.button, styles.backButton]}
                      textColor="#007AFF"
                    >
                      <Text>Back</Text>
                    </Button>
  
                    <Animated.View style={buttonAnimatedStyle}>
                      <Button 
                        mode="contained" 
                        loading={loading} 
                        onPress={() => {
                          console.log('Submit button pressed');
                          animateButton();
                          handleRegistration();
                        }} 
                        disabled={loading || !fullName || !email || !phone || !password || !dob || !profilePic || !aadharFront || !aadharBack}
                        style={[styles.button, { opacity: loading ? 0.7 : 1 }]}
                        buttonColor="#007AFF"
                      >
                        <Text style={styles.buttonText}>{loading ? 'Registering...' : 'Submit'}</Text>
                      </Button>
                    </Animated.View>
                  </View>
                </Surface>
              </Animated.View>
            )}
  
            {/* Progress Animation Card */}
            {loading && (
              <View style={styles.progressContainer}>
                <Surface style={styles.progressCard} elevation={3}>
                  <Text style={styles.progressTitle}>Registration in Progress</Text>
                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, progressAnimation]} />
                    </View>
                  </View>
                  <Text style={styles.progressText}>{progressText}</Text>
                  {error && (
                    <View style={styles.errorContainer}>
                      <Text style={styles.errorText}>{error}</Text>
                    </View>
                  )}
                </Surface>
              </View>
            )}
          </ScrollView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
  
const { width } = Dimensions.get('window');
  
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  stepDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeStepDot: {
    backgroundColor: '#007AFF',
  },
  stepNumber: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  stepLine: {
    width: 80,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 10,
  },
  formContainer: {
    width: '100%',
  },
  card: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fafafa',
  },
  button: {
    paddingVertical: 6,
    borderRadius: 10,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  backButton: {
    marginRight: 12,
    borderColor: '#007AFF',
    borderWidth: 1.5,
  },
  documentSection: {
    width: '100%',
    marginBottom: 24,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  imageUploadContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarSurface: {
    padding: 12,
    borderRadius: 120,
    overflow: 'hidden',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageUploadBtn: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  uploadSurface: {
    padding: 12,
    borderRadius: 70,
    overflow: 'hidden',
  },
  uploadText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginTop: 4,
  },
  documentRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    gap: 16,
  },
  documentItem: {
    flex: 1,
    alignItems: 'center',
    maxWidth: width > 500 ? 220 : (width - 80) / 2,
  },
  documentSurface: {
    width: '100%',
    padding: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f8f9fa',
  },
  documentImageContainer: {
    width: '100%',
    aspectRatio: 3 / 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  documentImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  docUploadBtn: {
    width: '100%',
    aspectRatio: 3 / 2,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  editOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderTopLeftRadius: 12,
  },
  editText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  imageLabel: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  uploadSubtext: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  progressCard: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  progressBarContainer: {
    height: 8,
    width: '100%',
    backgroundColor: '#f2f2f2',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressTrack: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    borderRadius: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#FF3B30',
    textAlign: 'center',
  },
  errorContainer: {
    visibility: 'visible',
    backgroundColor: '#FFE5E5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF3B30',
    width: '100%',
  },
});
