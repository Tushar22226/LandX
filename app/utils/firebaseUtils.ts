import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { ref as dbRef, set, push, get, query, orderByChild, equalTo } from 'firebase/database';
import { storage, database, auth } from '../../firebaseConfig';

// Helper function to get the currently logged in user's ID
export const getCurrentUserId = () => {
  return auth.currentUser?.uid || 'anonymous';
};

// Helper function to get the currently logged in user's email
export const getCurrentUserEmail = () => {
  return auth.currentUser?.email || '';
};

// Function to check if the current user is an admin (revenue department)
export const checkIsRevenueAdmin = async (): Promise<boolean> => {
  try {
    const email = getCurrentUserEmail();
    
    if (!email) {
      return false;
    }
    
    // Check if the user's email exists in the admin path
    const adminRef = dbRef(database, 'admin');
    const snapshot = await get(adminRef);
    
    if (!snapshot.exists()) {
      return false;
    }
    
    // Look for the email in the admin data
    let isAdmin = false;
    snapshot.forEach((childSnapshot) => {
      const adminData = childSnapshot.val();
      if (adminData.email && adminData.email === email) {
        isAdmin = true;
      }
    });
    
    return isAdmin;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Function to upload an image to Firebase Storage
export const uploadImageToStorage = async (
  uri: string,
  path: string
): Promise<string> => {
  // First, get the blob data from the uri
  const response = await fetch(uri);
  const blob = await response.blob();
  
  // Create a reference to Firebase Storage
  const storageReference = ref(storage, path);
  
  // Upload the file
  return new Promise((resolve, reject) => {
    const uploadTask = uploadBytesResumable(storageReference, blob);
    
    uploadTask.on(
      'state_changed',
      (snapshot) => {
        // Optional: track upload progress
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log(`Upload is ${progress}% done`);
      },
      (error) => {
        // Handle unsuccessful uploads
        console.error('Error uploading image:', error);
        reject(error);
      },
      async () => {
        // Handle successful upload
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
};

// Function to save land verification data to Firebase Realtime Database
export const saveLandVerificationData = async (
  data: any,
  documentUrls: Record<string, string>,
  verificationResults?: Record<string, any>
): Promise<string> => {
  try {
    // Get a new unique key for this verification
    const newVerificationRef = push(dbRef(database, 'landVerifications'));
    const verificationId = newVerificationRef.key as string;
    
    // Prepare the data with document URLs, verification results, and isVerified flag
    const verificationData = {
      ...data,
      documentUrls,
      documentVerification: verificationResults || {},
      isVerified: false,
      createdAt: new Date().toISOString(),
      userId: getCurrentUserId()
    };
    
    // Save data to the database
    await set(newVerificationRef, verificationData);
    
    return verificationId;
  } catch (error) {
    console.error('Error saving verification data:', error);
    throw error;
  }
};

// Function to fetch land verification records by email
export const fetchLandVerificationsByEmail = async (email: string) => {
  try {
    // Create a query to filter by email
    const verificationRef = dbRef(database, 'landVerifications');
    const verificationQuery = query(verificationRef, orderByChild('email'), equalTo(email));
    
    // Execute the query
    const snapshot = await get(verificationQuery);
    
    if (!snapshot.exists()) {
      return [];
    }
    
    // Convert the snapshot to an array of verification records
    const verifications: any[] = [];
    snapshot.forEach((childSnapshot) => {
      verifications.push({
        id: childSnapshot.key,
        ...childSnapshot.val()
      });
    });
    
    return verifications;
  } catch (error) {
    console.error('Error fetching verification data:', error);
    throw error;
  }
};

// Function to delete a land verification record
export const deleteLandVerification = async (verificationId: string): Promise<void> => {
  try {
    if (!verificationId) {
      throw new Error('Invalid verification ID');
    }
    
    const verificationRef = dbRef(database, `landVerifications/${verificationId}`);
    await set(verificationRef, null); // Setting to null deletes the record
    
  } catch (error) {
    console.error('Error deleting verification data:', error);
    throw error;
  }
};

// Add a default export for Expo Router
export default {
  saveLandVerificationData,
  uploadImageToStorage,
  checkIsRevenueAdmin,
  getCurrentUserId,
  getCurrentUserEmail,
  fetchLandVerificationsByEmail,
  deleteLandVerification
};
