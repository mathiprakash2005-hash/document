# Poultry Management System

A comprehensive web application for managing poultry farms, connecting farmers, veterinary doctors, and buyers in one platform.

## 🚀 Features

- **Farmer Dashboard**: Manage livestock, track health records, and medication
- **Doctor Portal**: Monitor animal health, prescribe treatments, and manage withdrawal periods
- **Buyer Interface**: Browse available livestock and make purchases
- **Real-time Updates**: Firebase Firestore integration for live data synchronization
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🛠️ Technical Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|----------|
| **React** | 18.x | Core UI library for building component-based user interfaces |
| **Vite** | 5.x | Fast build tool and development server with HMR (Hot Module Replacement) |
| **React Router DOM** | 6.x | Client-side routing for navigation between Farmer, Doctor, and Buyer dashboards |
| **CSS3** | - | Custom styling with CSS variables for theming and responsive design |
| **JavaScript (ES6+)** | - | Modern JavaScript features for application logic |

### Backend & Database

| Technology | Purpose |
|------------|----------|
| **Firebase Authentication** | User authentication and authorization with email/password |
| **Cloud Firestore** | NoSQL real-time database for storing livestock, health records, medications, and transactions |
| **Firebase SDK** | JavaScript SDK for Firebase integration (v10.x) |

### Mobile Development

| Technology | Purpose |
|------------|----------|
| **Capacitor** | Cross-platform native runtime to convert web app to Android/iOS |
| **Android Studio** | IDE for building and testing Android APK |

### Development Tools

| Tool | Purpose |
|------|----------|
| **npm/yarn** | Package manager for dependencies |
| **Git** | Version control system |
| **ESLint** | Code linting and quality checks |
| **Firebase CLI** | Command-line tools for Firebase deployment and management |

### Key Libraries & Dependencies

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.x",
  "firebase": "^10.x",
  "@capacitor/core": "^5.x",
  "@capacitor/android": "^5.x"
}
```

### Architecture Pattern

- **Component-Based Architecture**: Modular React components for reusability
- **Role-Based Access Control (RBAC)**: Different dashboards for Farmer, Doctor, and Buyer
- **Real-time Data Sync**: Firestore listeners for live updates
- **Responsive Design**: Mobile-first approach with CSS media queries

### What Each Technology Does:

#### **React**
- Builds interactive user interfaces
- Manages component state and lifecycle
- Handles user interactions and form submissions
- Renders different dashboards based on user role

#### **Vite**
- Provides lightning-fast development server
- Bundles and optimizes code for production
- Enables hot module replacement for instant updates
- Reduces build time compared to traditional bundlers

#### **Firebase Authentication**
- Manages user sign-up and login
- Secures user sessions with JWT tokens
- Handles password reset and email verification
- Provides role-based access control

#### **Cloud Firestore**
- Stores all application data (users, livestock, health records)
- Provides real-time synchronization across devices
- Enables offline data access
- Scales automatically with usage
- Supports complex queries and filtering

#### **React Router**
- Manages navigation between pages
- Implements protected routes for authenticated users
- Handles role-based routing (farmer/doctor/buyer)
- Provides browser history management

#### **Capacitor**
- Wraps web app into native Android/iOS container
- Provides access to native device features
- Enables app distribution via Play Store/App Store
- Maintains single codebase for web and mobile

### Data Flow

```
User Login → Firebase Auth → Role Detection → Dashboard Routing
                                                      ↓
                                            Firestore Queries
                                                      ↓
                                            Real-time Updates
                                                      ↓
                                            React Components
                                                      ↓
                                            UI Rendering
```

### Security Implementation

- **Firebase Security Rules**: Server-side data validation
- **Authentication Required**: All routes protected
- **Role-Based Permissions**: Users can only access their own data
- **HTTPS Only**: Secure data transmission
- **Input Validation**: Client-side form validation

## 📋 Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Firebase account
- Modern web browser

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd "poultry react"
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create a Firebase project at [https://console.firebase.google.com](https://console.firebase.google.com)
   - Enable Authentication (Email/Password)
   - Enable Firestore Database
   - Copy your Firebase config to `src/firebase/config.js`

4. **Run the application**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Open browser and navigate to `http://localhost:5173`

## 🔐 Test Credentials

### Farmer Account
- **Email**: `mathi.dualtech@gmail.com`
- **Password**: `Mathi@2005`
- **Role**: Farmer
- **Access**: Livestock management, health records, medication tracking

### Veterinary Doctor Account
- **Email**: `mathiprakash2005@gmail.com`
- **Password**: `Mathi@2005`
- **Role**: Doctor
- **Access**: Animal health monitoring, treatment prescriptions, withdrawal period management

### Buyer Account
- **Email**: `mathiprakash.2201129@srec.ac.in`
- **Password**: `Mathi@2005`
- **Role**: Buyer
- **Access**: Browse livestock, view health status, purchase animals

## 🔥 Firebase Firestore Structure

### Database Collections

#### 1. **users** Collection
Stores user profile information and role-based data.

**Location**: `Firestore Database > users`

**Document Structure**:
```
users/
  └── {userId}/
      ├── email: string
      ├── role: string ("farmer" | "doctor" | "buyer")
      ├── name: string
      ├── createdAt: timestamp
      └── additionalInfo: object
```

**Example Document**:
```json
{
  "email": "mathi.dualtech@gmail.com",
  "role": "farmer",
  "name": "Mathi",
  "createdAt": "2024-01-15T10:30:00Z",
  "farmName": "Mathi Poultry Farm",
  "location": "Tamil Nadu"
}
```

**How to View**:
1. Go to Firebase Console
2. Select your project
3. Click "Firestore Database" in left menu
4. Click "users" collection
5. View individual user documents

---

#### 2. **livestock** Collection
Stores information about animals in the farm.

**Location**: `Firestore Database > livestock`

**Document Structure**:
```
livestock/
  └── {animalId}/
      ├── farmerId: string (user ID reference)
      ├── animalType: string ("chicken" | "duck" | "turkey")
      ├── breed: string
      ├── age: number
      ├── weight: number
      ├── healthStatus: string ("healthy" | "sick" | "under-treatment")
      ├── purchaseDate: timestamp
      ├── currentValue: number
      ├── isAvailableForSale: boolean
      ├── createdAt: timestamp
      └── updatedAt: timestamp
```

**Example Document**:
```json
{
  "farmerId": "abc123xyz",
  "animalType": "chicken",
  "breed": "Broiler",
  "age": 45,
  "weight": 2.5,
  "healthStatus": "healthy",
  "purchaseDate": "2024-01-01T00:00:00Z",
  "currentValue": 250,
  "isAvailableForSale": true,
  "createdAt": "2024-01-01T10:00:00Z",
  "updatedAt": "2024-01-15T14:30:00Z"
}
```

**How to View**:
1. Firebase Console > Firestore Database
2. Click "livestock" collection
3. Filter by farmerId to see specific farmer's animals
4. Click any document to view full details

---

#### 3. **healthRecords** Collection
Tracks health checkups and medical history.

**Location**: `Firestore Database > healthRecords`

**Document Structure**:
```
healthRecords/
  └── {recordId}/
      ├── animalId: string (livestock reference)
      ├── farmerId: string
      ├── doctorId: string (optional)
      ├── checkupDate: timestamp
      ├── symptoms: array of strings
      ├── diagnosis: string
      ├── temperature: number
      ├── weight: number
      ├── notes: string
      ├── status: string ("normal" | "requires-attention" | "critical")
      └── createdAt: timestamp
```

**Example Document**:
```json
{
  "animalId": "livestock_001",
  "farmerId": "farmer_123",
  "doctorId": "doctor_456",
  "checkupDate": "2024-01-15T09:00:00Z",
  "symptoms": ["lethargy", "reduced appetite"],
  "diagnosis": "Mild respiratory infection",
  "temperature": 41.5,
  "weight": 2.3,
  "notes": "Prescribed antibiotics for 5 days",
  "status": "requires-attention",
  "createdAt": "2024-01-15T09:30:00Z"
}
```

**How to View**:
1. Firebase Console > Firestore Database
2. Click "healthRecords" collection
3. Use filters to search by animalId or farmerId
4. Sort by checkupDate to see recent records

---

#### 4. **medications** Collection
Manages medication administration and withdrawal periods.

**Location**: `Firestore Database > medications`

**Document Structure**:
```
medications/
  └── {medicationId}/
      ├── animalId: string
      ├── farmerId: string
      ├── doctorId: string
      ├── medicationName: string
      ├── dosage: string
      ├── frequency: string
      ├── startDate: timestamp
      ├── endDate: timestamp
      ├── withdrawalPeriod: number (days)
      ├── withdrawalEndDate: timestamp
      ├── purpose: string
      ├── status: string ("active" | "completed" | "withdrawal-period")
      ├── notes: string
      └── createdAt: timestamp
```

**Example Document**:
```json
{
  "animalId": "livestock_001",
  "farmerId": "farmer_123",
  "doctorId": "doctor_456",
  "medicationName": "Amoxicillin",
  "dosage": "10mg/kg",
  "frequency": "Twice daily",
  "startDate": "2024-01-15T00:00:00Z",
  "endDate": "2024-01-20T00:00:00Z",
  "withdrawalPeriod": 7,
  "withdrawalEndDate": "2024-01-27T00:00:00Z",
  "purpose": "Respiratory infection treatment",
  "status": "active",
  "notes": "Monitor for side effects",
  "createdAt": "2024-01-15T10:00:00Z"
}
```

**How to View**:
1. Firebase Console > Firestore Database
2. Click "medications" collection
3. Filter by status to see active medications
4. Check withdrawalEndDate for withdrawal period tracking

---

#### 5. **transactions** Collection
Records all purchase transactions between buyers and farmers.

**Location**: `Firestore Database > transactions`

**Document Structure**:
```
transactions/
  └── {transactionId}/
      ├── buyerId: string
      ├── farmerId: string
      ├── animalId: string
      ├── amount: number
      ├── quantity: number
      ├── transactionDate: timestamp
      ├── status: string ("pending" | "completed" | "cancelled")
      ├── paymentMethod: string
      ├── deliveryAddress: string
      └── createdAt: timestamp
```

**Example Document**:
```json
{
  "buyerId": "buyer_789",
  "farmerId": "farmer_123",
  "animalId": "livestock_001",
  "amount": 250,
  "quantity": 1,
  "transactionDate": "2024-01-15T12:00:00Z",
  "status": "completed",
  "paymentMethod": "UPI",
  "deliveryAddress": "123 Main St, Chennai",
  "createdAt": "2024-01-15T12:00:00Z"
}
```

**How to View**:
1. Firebase Console > Firestore Database
2. Click "transactions" collection
3. Filter by buyerId or farmerId
4. Sort by transactionDate for recent purchases

---

## 📊 How to Access Firestore Data

### Method 1: Firebase Console (Web Interface)

1. **Login to Firebase Console**
   - Go to [https://console.firebase.google.com](https://console.firebase.google.com)
   - Select your project (Poultry)

2. **Navigate to Firestore**
   - Click "Firestore Database" in the left sidebar
   - You'll see all your collections listed

3. **View Collections**
   - Click on any collection name (users, livestock, etc.)
   - See all documents in that collection
   - Click on a document ID to view its fields

4. **Filter and Search**
   - Use the filter button to query specific data
   - Example: Filter livestock where `healthStatus == "sick"`

5. **Export Data**
   - Click on a collection
   - Click the three dots menu
   - Select "Export collection"

### Method 2: Using Firebase CLI

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Export data
firebase firestore:export ./backup

# Import data
firebase firestore:import ./backup
```

### Method 3: Programmatically (In Your App)

```javascript
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase/config';

// Get all livestock
const livestockRef = collection(db, 'livestock');
const snapshot = await getDocs(livestockRef);
snapshot.forEach(doc => {
  console.log(doc.id, doc.data());
});

// Query specific data
const q = query(
  collection(db, 'livestock'),
  where('healthStatus', '==', 'healthy')
);
const querySnapshot = await getDocs(q);
```

---

## 🎯 User Workflows

### Farmer Workflow

1. **Login** with farmer credentials
2. **Dashboard Overview**:
   - View total livestock count
   - Check animals under treatment
   - Monitor medication schedules
3. **Add New Livestock**:
   - Click "Add New Animal"
   - Fill in animal details (type, breed, age, weight)
   - Submit to add to database
4. **Record Health Check**:
   - Select an animal
   - Click "Health Check"
   - Enter symptoms, temperature, notes
   - Save record
5. **Manage Medications**:
   - View active medications
   - Track withdrawal periods
   - Mark as completed when done
6. **List for Sale**:
   - Toggle "Available for Sale" on healthy animals
   - Set price
   - Buyers can now see the listing

### Doctor Workflow

1. **Login** with doctor credentials
2. **Dashboard Overview**:
   - View animals requiring attention
   - Check pending consultations
   - Monitor treatment progress
3. **Review Health Records**:
   - Browse all health records
   - Filter by status or date
   - View detailed medical history
4. **Prescribe Treatment**:
   - Select an animal
   - Add diagnosis
   - Prescribe medication with dosage
   - Set withdrawal period
5. **Monitor Withdrawal Periods**:
   - View animals in withdrawal
   - Check withdrawal end dates
   - Clear for sale when safe

### Buyer Workflow

1. **Login** with buyer credentials
2. **Browse Livestock**:
   - View all available animals
   - Filter by type, breed, price
   - Check health status
3. **View Details**:
   - Click on an animal
   - See health records
   - Check medication history
   - Verify no active withdrawal period
4. **Make Purchase**:
   - Select animal
   - Click "Purchase"
   - Enter delivery details
   - Confirm transaction
5. **Track Orders**:
   - View purchase history
   - Check delivery status

---

## 🔍 Firestore Security Rules

**Location**: Firebase Console > Firestore Database > Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    // Livestock collection
    match /livestock/{animalId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
                      request.resource.data.farmerId == request.auth.uid;
      allow update, delete: if request.auth != null && 
                              resource.data.farmerId == request.auth.uid;
    }
    
    // Health records
    match /healthRecords/{recordId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && 
                     (resource.data.farmerId == request.auth.uid || 
                      resource.data.doctorId == request.auth.uid);
    }
    
    // Medications
    match /medications/{medicationId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null;
    }
    
    // Transactions
    match /transactions/{transactionId} {
      allow read: if request.auth != null && 
                    (resource.data.buyerId == request.auth.uid || 
                     resource.data.farmerId == request.auth.uid);
      allow create: if request.auth != null;
    }
  }
}
```

---

## 📱 Building for Android

1. **Install Capacitor**:
   ```bash
   npm install @capacitor/core @capacitor/cli @capacitor/android
   ```

2. **Initialize Capacitor**:
   ```bash
   npx cap init
   ```

3. **Build the web app**:
   ```bash
   npm run build
   ```

4. **Add Android platform**:
   ```bash
   npx cap add android
   ```

5. **Sync files**:
   ```bash
   npx cap sync
   ```

6. **Open in Android Studio**:
   ```bash
   npx cap open android
   ```

7. **Build APK**:
   - In Android Studio: Build > Build Bundle(s) / APK(s) > Build APK(s)
   - APK location: `android/app/build/outputs/apk/debug/`

---

## 🐛 Troubleshooting

### Firebase Connection Issues
- Check if Firebase config is correct in `src/firebase/config.js`
- Verify Firebase project is active
- Check browser console for errors

### Authentication Errors
- Ensure Email/Password authentication is enabled in Firebase Console
- Check if user exists in Firebase Authentication
- Verify credentials are correct

### Data Not Showing
- Check Firestore security rules
- Verify user is authenticated
- Check browser console for permission errors
- Ensure collections exist in Firestore

### Build Errors
- Clear node_modules: `rm -rf node_modules && npm install`
- Clear cache: `npm run dev -- --force`
- Check Node.js version: `node --version`

---

## 📞 Support

For issues or questions:
- Check Firebase Console logs
- Review browser console errors
- Verify Firestore data structure
- Check authentication status

---

## 🔒 Security Best Practices

1. **Never commit Firebase config with real credentials to public repos**
2. **Use environment variables for sensitive data**
3. **Implement proper Firestore security rules**
4. **Enable Firebase App Check for production**
5. **Regularly review Firebase usage and logs**
6. **Use strong passwords for all accounts**
7. **Enable 2FA on Firebase account**

---

## 📝 Database Backup

### Manual Backup
1. Firebase Console > Firestore Database
2. Click on collection
3. Three dots menu > Export collection
4. Save JSON file locally

### Automated Backup (Recommended)
```bash
# Schedule daily backups using Firebase CLI
firebase firestore:export gs://your-bucket-name/backups/$(date +%Y%m%d)
```

---



## 📊 Monitoring Firestore Usage

1. **Firebase Console > Firestore Database > Usage**
   - View read/write operations
   - Monitor storage usage
   - Check bandwidth consumption

2. **Set Budget Alerts**:
   - Firebase Console > Project Settings > Usage and billing
   - Set up budget alerts
   - Monitor costs

---

## 🎓 Learning Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Data Modeling](https://firebase.google.com/docs/firestore/data-model)
- [React Firebase Hooks](https://github.com/CSFrequency/react-firebase-hooks)
- [Vite Documentation](https://vitejs.dev/)

---

## 📄 License

This project is for educational purposes.

---

## 👥 Team

- **Developer**: Mathi Prakash
- **Email**: mathi.dualtech@gmail.com

---

**Last Updated**: January 2024
