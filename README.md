# 🌴 TripMaster

A comprehensive web application for managing vacation destinations, plans, users, and bookings with an intuitive interface.

## Features

- **Destination Management**: Create and track beautiful destinations around the world
- **Vacation Plans**: Design perfect vacation packages for your customers
- **User Management**: Keep track of all your customers in one place
- **Booking System**: Simple and efficient vacation booking management
- **User Authentication**: Secure login and registration functionality
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Dark Mode**: Toggle between light and dark themes for comfortable viewing
- **Profile Pictures**: Upload and manage user profile images
- **Real-time Search**: Quickly find items across all management sections
- **Cloud Storage**: All your data is securely stored and synced

## Technologies Used

- React.js
- Firebase Authentication
- Firestore Database
- CSS3 with responsive design
- Modern JavaScript (ES6+)

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/dafatsq/tripmaster.git
   cd tripmaster
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a Firebase project and enable Authentication and Firestore:
   - Visit [Firebase Console](https://console.firebase.google.com/)
   - Create a new project
   - Enable Email/Password authentication
   - Create a Firestore database in production mode

4. Create a `firebase.js` file in the `src` directory with your Firebase config:
   ```javascript
   import { initializeApp } from "firebase/app";
   import { getAuth } from "firebase/auth";
   import { getFirestore } from "firebase/firestore";

   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "your-auth-domain",
     projectId: "your-project-id",
     storageBucket: "your-storage-bucket",
     messagingSenderId: "your-messaging-sender-id",
     appId: "your-app-id"
   };

   const app = initializeApp(firebaseConfig);
   export const auth = getAuth(app);
   export const db = getFirestore(app);
   ```

5. Start the development server:
   ```
   npm start
   ```

## Usage

1. **Create an account** or log in to an existing one
2. Use the **sidebar navigation** to access different management sections:
   - Manage Destinations
   - Manage Vacation Plans
   - Manage Users
   - Manage Bookings
3. In each section you can:
   - **Search** for specific items
   - **Add new** items through the form interface
   - **Edit** existing items
   - **Delete** items with confirmation
4. Change your **profile picture** by clicking on your profile avatar
5. Toggle **dark mode** using the button in the sidebar
6. **Log out** by clicking on your profile and selecting Logout

## Data Structure

The app uses Firebase Firestore with the following collections:

- `destinations` - Contains destination information
  - City, Price, Discount, Country, Rating, Quota, User ID

- `vacations` - Contains vacation package information
  - City, Country, Price, Day Trip, Rating, Quota, User ID

- `users` - Contains user profile data and customer information
  - Name, Phone Number, Profile Picture, User ID

- `bookings` - Contains booking records
  - Name, Phone Number, Destination, Type, User ID

## Browser Support

The app works in all modern browsers (Chrome, Firefox, Safari, Edge) and is fully responsive for mobile devices.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
