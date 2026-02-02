# LandX 🏠

A comprehensive **Land Registration & Property Management** mobile application built with React Native and Expo, featuring secure document verification, property transfers, and admin verification workflows.

## ✨ Features

### 👤 User Features

- **Land Registration** - Register new land properties with complete documentation
- **Property Management** - View and manage owned properties
- **Property Transfer** - Initiate and track property ownership transfers
- **Document Management** - Upload, preview, and organize property documents
- **Property Verification** - Submit properties for official verification

### 🔐 Admin Features

- **Document Verification** - Review and verify submitted documents
- **User Management** - Manage land owner registrations
- **Transfer Approvals** - Process and approve property transfer requests
- **Admin Dashboard** - Centralized view of all pending verifications

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | React Native + Expo SDK 52 |
| **Navigation** | Expo Router (file-based routing) |
| **Backend** | Firebase (Auth, Realtime Database, Storage) |
| **UI Components** | React Native Paper |
| **OCR/Vision** | Google Cloud Vision, Tesseract.js |
| **Language** | TypeScript |

## 📱 Screenshots

*Coming soon*

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Android Studio / Xcode (for emulators) or Expo Go app

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/yourusername/LandX.git
   cd LandX
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication, Realtime Database, and Storage
   - Copy your Firebase config to `firebaseConfig.js`

4. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Start the development server**

   ```bash
   npm start
   ```

6. **Run on device/emulator**
   - Press `a` for Android
   - Press `i` for iOS
   - Scan QR code with Expo Go app

## 📁 Project Structure

```
LandX/
├── app/                    # Application screens & routing
│   ├── components/         # Reusable UI components
│   ├── navigation/         # Navigation configuration
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   ├── Login.tsx           # User authentication
│   ├── Register.tsx        # User registration
│   ├── Home.tsx            # Home dashboard
│   ├── LandRegister.tsx    # Land registration form
│   ├── PropertyOwned.tsx   # Owned properties list
│   ├── PropertyTransfer.tsx # Property transfer flow
│   ├── PropertyVerification.tsx
│   ├── AdminVerification.tsx
│   └── ...
├── assets/                 # Images, fonts, icons
├── firebaseConfig.js       # Firebase configuration
├── app.json                # Expo configuration
└── package.json
```

## 📜 Available Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo development server |
| `npm run android` | Run on Android device/emulator |
| `npm run ios` | Run on iOS simulator |
| `npm run web` | Run in web browser |
| `npm test` | Run Jest tests |
| `npm run lint` | Run ESLint |

## 🔧 Configuration

### Firebase Setup

Update `firebaseConfig.js` with your Firebase project credentials:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 👨‍💻 Author

**Jain Tushar**

---

<p align="center">Made with ❤️ using React Native & Expo</p>
