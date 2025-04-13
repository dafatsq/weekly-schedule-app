# Weekly Schedule App

A dynamic web application for creating and managing your weekly schedule with a user-friendly drag-and-drop interface.

![Weekly Schedule App Screenshot](https://drive.google.com/file/d/1by6Gjgr2pcmRlNzYPjzdJXFIAAFYxQbD/view?usp=drive_link)

## Features

- **Interactive Schedule Grid**: Visualize your week with an easy-to-read grid layout
- **Drag & Drop Tasks**: Easily move tasks between different days and times
- **Task Duration**: Set tasks to span multiple hours with visual continuity
- **Customizable Time Range**: Configure which hours appear in your schedule
- **User Authentication**: Securely save your schedule with user accounts
- **Responsive Design**: Works well on both desktop and mobile devices
- **Dark Mode**: Toggle between light and dark themes for comfortable viewing
- **User Profiles**: Upload and manage profile pictures
- **Cloud Saving**: All your schedules are synced to the cloud automatically

## Technologies Used

- React.js
- Firebase Authentication
- Firestore Database
- React Beautiful DnD
- CSS3 with responsive design

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/dafatsq/weekly-schedule-app.git
   cd weekly-schedule
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

4. Create a `.env` file in the root directory with your Firebase config:
   ```
   REACT_APP_FIREBASE_API_KEY=your-api-key
   REACT_APP_FIREBASE_AUTH_DOMAIN=your-auth-domain
   REACT_APP_FIREBASE_PROJECT_ID=your-project-id
   REACT_APP_FIREBASE_STORAGE_BUCKET=your-storage-bucket
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   REACT_APP_FIREBASE_APP_ID=your-app-id
   ```

5. Start the development server:
   ```
   npm start
   ```

## Usage

1. **Create an account** or log in to an existing one
2. **Add tasks** to your schedule by filling out the form at the top
3. **Drag and drop** tasks to rearrange them on the schedule
4. **Edit tasks** by clicking on them and using the edit form
5. **Adjust the time range** shown using the Chart Settings
6. **Upload a profile picture** by clicking on your profile avatar
7. **Toggle dark mode** using the button in the sidebar

## Configuration Options

### Time Settings
You can customize which hours are shown on your schedule grid by using the Chart Settings panel. This allows you to focus on specific parts of the day.

### Task Duration
When creating or editing a task, you can set its duration from 1 to 4 hours. The task will visually span across multiple time slots.

## Data Structure

The app uses Firebase Firestore with the following structure:

- `schedules/{userId}` - Contains user's tasks and chart settings
  - `tasks` - Array of task objects
  - `chartStart` - Starting time setting
  - `chartEnd` - Ending time setting

- `users/{userId}` - Contains user profile data
  - `profilePicture` - Base64 encoded profile image

## Browser Support

The app works best in modern browsers (Chrome, Firefox, Safari, Edge).

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
