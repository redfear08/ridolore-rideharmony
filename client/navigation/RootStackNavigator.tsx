import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import MainTabNavigator from "@/navigation/MainTabNavigator";
import CreateRideScreen from "@/screens/CreateRideScreen";
import QRCodeShareScreen from "@/screens/QRCodeShareScreen";
import JoinRideScreen from "@/screens/JoinRideScreen";
import ActiveRideScreen from "@/screens/ActiveRideScreen";
import GroupChatScreen from "@/screens/GroupChatScreen";
import RiderProfileScreen from "@/screens/RiderProfileScreen";
import ProfileSetupScreen from "@/screens/ProfileSetupScreen";
import CreatePostScreen from "@/screens/CreatePostScreen";
import PostDetailScreen from "@/screens/PostDetailScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";

export type RootStackParamList = {
  Main: undefined;
  ProfileSetup: undefined;
  CreateRide: undefined;
  QRCodeShare: { rideId: string };
  JoinRide: undefined;
  ActiveRide: { rideId: string };
  GroupChat: { rideId: string };
  RiderProfile: { riderId: string };
  CreatePost: undefined;
  PostDetail: { postId: string; focusComments?: boolean };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const opaqueScreenOptions = useScreenOptions({ transparent: false });

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Main"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProfileSetup"
        component={ProfileSetupScreen}
        options={{
          ...opaqueScreenOptions,
          presentation: "modal",
          headerTitle: "Complete Profile",
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="CreateRide"
        component={CreateRideScreen}
        options={{
          ...opaqueScreenOptions,
          presentation: "modal",
          headerTitle: "Create Ride",
        }}
      />
      <Stack.Screen
        name="QRCodeShare"
        component={QRCodeShareScreen}
        options={{
          ...opaqueScreenOptions,
          headerTitle: "Invite Riders",
        }}
      />
      <Stack.Screen
        name="JoinRide"
        component={JoinRideScreen}
        options={{
          presentation: "modal",
          headerTitle: "Join Ride",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="ActiveRide"
        component={ActiveRideScreen}
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="GroupChat"
        component={GroupChatScreen}
        options={{
          ...opaqueScreenOptions,
          presentation: "modal",
          headerTitle: "Group Chat",
        }}
      />
      <Stack.Screen
        name="RiderProfile"
        component={RiderProfileScreen}
        options={{
          presentation: "modal",
          headerTitle: "Rider Profile",
        }}
      />
      <Stack.Screen
        name="CreatePost"
        component={CreatePostScreen}
        options={{
          ...opaqueScreenOptions,
          presentation: "modal",
          headerTitle: "New Post",
        }}
      />
      <Stack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{
          ...opaqueScreenOptions,
          headerTitle: "Post",
        }}
      />
    </Stack.Navigator>
  );
}
