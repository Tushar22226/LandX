import React, { useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  Animated
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  ActivityIndicator,
  Surface,
  IconButton
} from "react-native-paper";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";

// Define navigation types
type RootStackParamList = {
  Home: undefined;
  Register: undefined;
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const auth = getAuth();

  // Animation values
  const logoScale = new Animated.Value(1);
  const formOpacity = new Animated.Value(0);
  const errorShake = new Animated.Value(0);
  const buttonScale = new Animated.Value(1);

  // Initial animations
  useEffect(() => {
    Animated.sequence([
      Animated.timing(logoScale, {
        toValue: 1.2,
        duration: 400,
        useNativeDriver: true
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true
      })
    ]).start();

    Animated.timing(formOpacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true
    }).start(() => {
      formOpacity.setValue(1); // Ensure opacity stays at 1 after the animation completes
    });
  }, []);

  // Animation for error shake
  useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(errorShake, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(errorShake, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(errorShake, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(errorShake, { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(errorShake, { toValue: -5, duration: 50, useNativeDriver: true }),
        Animated.timing(errorShake, { toValue: 5, duration: 50, useNativeDriver: true }),
        Animated.timing(errorShake, { toValue: 0, duration: 50, useNativeDriver: true })
      ]).start();
    }
  }, [error]);

  // Button press animation
  const animateButton = () => {
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    animateButton();
    setLoading(true);
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigation.replace("Home"); // Navigate to Home on success
    } catch (err) {
      setError("Invalid email or password");
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo Section */}
          <Animated.View style={[styles.logoContainer, {
            transform: [{ scale: logoScale }]
          }]}>
            <Image
              source={require('../assets/images/icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.logoText}>LandX</Text>
            <Text style={styles.tagline}>Secure Land Registration</Text>
          </Animated.View>

          {/* Login Form */}
          <Animated.View
            style={styles.formContainer}
          >
            { /* form content */}
            <Surface style={styles.formCard} elevation={2}>
              <Text style={styles.title}>Welcome Back</Text>

              <TextInput
                label="Email"
                mode="outlined"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                style={styles.input}
                outlineColor="#e0e0e0"
                activeOutlineColor="#007AFF"
                left={<TextInput.Icon icon="email" />}
                autoCapitalize="none"
              />

              <TextInput
                label="Password"
                mode="outlined"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                style={styles.input}
                outlineColor="#e0e0e0"
                activeOutlineColor="#007AFF"
                left={<TextInput.Icon icon="lock" />}
                right={
                  <TextInput.Icon
                    icon={showPassword ? "eye-off" : "eye"}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
              />

              {error ? (
                <Animated.View style={[styles.errorContainer, {
                  transform: [{ translateX: errorShake }]
                }]}>
                  <Text style={styles.errorText}>{error}</Text>
                </Animated.View>
              ) : null}

              <Animated.View style={{
                transform: [{ scale: buttonScale }]
              }}>
                <Button
                  mode="contained"
                  onPress={handleLogin}
                  style={styles.loginButton}
                  buttonColor="#007AFF"
                  loading={loading}
                  disabled={loading}
                >
                  <Text style={styles.buttonText}>
                    {loading ? "Logging in..." : "Login"}
                  </Text>
                </Button>
              </Animated.View>

              <TouchableOpacity style={styles.forgotPassword}>
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>
            </Surface>

            {/* Register Link */}
            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>Don't have an account?</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Register")}
                style={styles.registerButton}
              >
                <Text style={styles.registerButtonText}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 30,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  logoText: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#007AFF",
  },
  tagline: {
    fontSize: 16,
    color: "#666666",
    marginTop: 5,
  },
  formContainer: {
    width: width > 500 ? 500 : width * 0.9,
    alignItems: "center",
  },
  formCard: {
    width: "100%",
    borderRadius: 16,
    padding: 24,
    backgroundColor: "#ffffff",
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    marginBottom: 16,
    backgroundColor: "#fafafa",
  },
  errorContainer: {
    backgroundColor: "#ffecec",
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    color: "#FF3B30",
    fontSize: 14,
    textAlign: "center",
  },
  loginButton: {
    borderRadius: 10,
    height: 48,
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  forgotPassword: {
    alignSelf: "center",
    marginTop: 16,
  },
  forgotPasswordText: {
    color: "#007AFF",
    fontSize: 14,
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  registerText: {
    fontSize: 15,
    color: "#666666",
  },
  registerButton: {
    marginLeft: 5,
    padding: 5,
  },
  registerButtonText: {
    fontSize: 15,
    color: "#007AFF",
    fontWeight: "600",
  },
});
