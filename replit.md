# Ridolore - Group Ride & Live Tracking App

## Overview
Ridolore is a mobile application for motorcycle/vehicle riders to create and join group rides with real-time location tracking, QR code sharing, and group communication features.

## Current State
Firebase integration complete with Authentication and Firestore for cloud data persistence. Users can sign in across multiple devices with the same credentials. All data is stored in Firebase Firestore.

**Google Maps Integration:** Real Google Maps routes are now displayed using the Directions API. Location autocomplete uses Google Places API (New). Ride coordinates (source, destination, waypoints) are stored in Firebase and used for route display. ETA (estimated time of arrival) and distance are calculated from the Directions API and displayed on the active ride screen.

**Real-Time Location Tracking:** Live GPS tracking implemented with high-precision (BestForNavigation accuracy). Each rider's location is published to Firebase subcollection `rides/{rideId}/locations/{riderId}` and streamed to all riders in real-time. Location updates are debounced (5m distance or 5s time threshold) to balance accuracy with battery/bandwidth usage.

**Live Ride Stats (v1.0.05):**
- **Real-time speed display**: Current rider speed shown in km/h
- **Distance-to-destination countdown**: Shows remaining distance to destination that updates as you ride
- **Distance covered tracking**: Tracks and accumulates distance traveled during the ride, saved to user profile
- **3D map view**: Camera tilts to 45° pitch for immersive navigation experience
- **Dynamic route display**: Route polyline only shows from current position to destination (not from original source)

**Social Feed:** Instagram-style social media feed for registered riders. Users can post vehicle-related content (photos, ride announcements), like posts, and comment. Data stored in Firebase `posts` collection with `posts/{postId}/likes` and `posts/{postId}/comments` subcollections. Real-time updates via Firebase onSnapshot.

## Tech Stack
- **Frontend**: React Native with Expo (Expo Go compatible)
- **Backend**: Express.js + Firebase (Firestore + Auth)
- **Authentication**: Firebase Authentication (email/password)
- **Database**: Firebase Firestore (cloud NoSQL)
- **Navigation**: React Navigation 7+
- **State Management**: React hooks + TanStack Query
- **Maps**: react-native-maps
- **Styling**: StyleSheet with custom theme system

## Firebase Configuration
Firebase is configured via `app.config.js` using the following secrets:
- FIREBASE_API_KEY
- FIREBASE_AUTH_DOMAIN
- FIREBASE_PROJECT_ID
- FIREBASE_STORAGE_BUCKET
- FIREBASE_MESSAGING_SENDER_ID
- FIREBASE_APP_ID

The configuration is exposed to the app via `Constants.expoConfig.extra` for Expo compatibility.

## Project Structure
```
client/
├── components/          # Reusable UI components
│   ├── Button.tsx       # Animated button with press feedback
│   ├── Card.tsx         # Elevated card container
│   ├── HeaderTitle.tsx  # App branding header
│   ├── QRCodeDisplay.tsx # QR code generation
│   ├── PostCard.tsx     # Social feed post display
│   └── ...
├── constants/
│   └── theme.ts         # Design tokens (colors, spacing, typography)
├── hooks/
│   ├── useStorage.ts    # AsyncStorage hooks for profile/rides
│   ├── useTheme.ts      # Theme access hook
│   ├── useResponsive.ts # Responsive design utilities (breakpoints, scaling)
│   └── ...
├── navigation/
│   ├── MainTabNavigator.tsx  # Bottom tab navigation
│   └── RootStackNavigator.tsx # Root stack with modals
├── screens/
│   ├── HomeScreen.tsx        # Home with upcoming rides
│   ├── MyRidesScreen.tsx     # Ride history list
│   ├── SocialFeedScreen.tsx  # Instagram-style social feed
│   ├── CreatePostScreen.tsx  # Create new post with media
│   ├── PostDetailScreen.tsx  # View post with comments
│   ├── ProfileScreen.tsx     # User profile & settings
│   ├── NotificationsScreen.tsx
│   ├── CreateRideScreen.tsx  # Create new ride
│   ├── QRCodeShareScreen.tsx # Share QR to invite riders
│   ├── JoinRideScreen.tsx    # QR scanner to join
│   ├── ActiveRideScreen.tsx  # Live map tracking
│   ├── GroupChatScreen.tsx   # In-ride messaging
│   ├── RiderProfileScreen.tsx # View rider details
│   └── ProfileSetupScreen.tsx # Profile onboarding
└── App.tsx              # App entry point
```

## Key Features
1. **Profile Setup**: Name, age, vehicle info, optional photo
2. **Create Ride**: Set source, destination, waypoints with Google Places autocomplete
3. **QR Code Sharing**: Generate and share ride invite codes (works on iOS and Android using react-native-qrcode-svg)
4. **Join Ride**: Scan QR or enter code manually
5. **Live Map**: Real-time rider positions with high-precision GPS tracking via Firebase
6. **Group Chat**: In-ride messaging with haptic feedback
7. **SOS Button**: Emergency alert to group
8. **Captain Controls**: Only ride creator can end the ride; other riders can only leave
9. **Share During Ride**: All participants can share QR code to invite more riders during active ride
10. **Social Feed**: Instagram-style feed where riders can post vehicle-related content
    - Post photos with captions
    - Like and comment on posts
    - Ride announcements
    - Real-time feed updates via Firebase

## Design System
- Primary: #2563EB (Blue)
- Accent: #10B981 (Green)
- Danger: #EF4444 (Red)
- Rider Marker: #8B5CF6 (Purple)

## Running the App
- The app runs on port 8081 (Expo)
- Backend API on port 5000
- Use Expo Go on mobile device for full features (camera, maps, location)

## Performance Optimizations
The app is optimized to handle 50+ riders without lag:
- **Adaptive GPS throttling**: Location update frequency adjusts based on speed (slower updates when stationary)
- **Memoized map markers**: Uses React.memo and useMemo to prevent unnecessary re-renders
- **tracksViewChanges=false**: Disables continuous marker updates for better map performance
- **Shallow location comparison**: Only updates state when rider positions actually change
- **Virtualized lists**: FlatList with proper keyExtractor, getItemLayout, and removeClippedSubviews
- **Memoized components**: RiderItem, MessageItem are memoized to prevent re-renders
- **Optimized Firebase listeners**: Single subscription per ride with cleanup on unmount

## Next Phase Features
- Push notifications for SOS alerts
- Ride search and filters
- Stale location indicator (show when a rider's location is outdated)
- Marker clustering for very large groups (100+ riders)
- Video posts in social feed
- User follow/following system
- Feed filtering by post type
