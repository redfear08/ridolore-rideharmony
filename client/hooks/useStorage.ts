import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/AuthContext";

export interface UserProfile {
  id: string;
  name: string;
  age: string;
  vehicleName: string;
  vehicleNumber: string;
  profilePicture?: string;
  email?: string;
  phone?: string;
}

export interface Rider {
  id: string;
  name: string;
  vehicleName: string;
  vehicleNumber: string;
  profilePicture?: string;
  latitude?: number;
  longitude?: number;
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
}

export interface Ride {
  id: string;
  source: string;
  destination: string;
  waypoints: string[];
  departureTime: string;
  createdAt: string;
  createdBy: string;
  status: "waiting" | "active" | "completed";
  riders: Rider[];
  messages: Message[];
}

const PROFILE_KEY_PREFIX = "@ridesync_profile_";
const RIDES_KEY_PREFIX = "@ridesync_rides_";

function getProfileKey(userId: string): string {
  return `${PROFILE_KEY_PREFIX}${userId}`;
}

function getRidesKey(userId: string): string {
  return `${RIDES_KEY_PREFIX}${userId}`;
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadProfile(user.id);
    } else {
      setProfile(null);
      setIsLoading(false);
    }
  }, [user?.id]);

  const loadProfile = async (userId: string) => {
    setIsLoading(true);
    try {
      const stored = await AsyncStorage.getItem(getProfileKey(userId));
      if (stored) {
        setProfile(JSON.parse(stored));
      } else {
        setProfile(null);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async (newProfile: UserProfile) => {
    if (!user?.id) return;
    try {
      await AsyncStorage.setItem(getProfileKey(user.id), JSON.stringify(newProfile));
      setProfile(newProfile);
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (profile && user?.id) {
      const updated = { ...profile, ...updates };
      await saveProfile(updated);
    }
  };

  const clearProfile = async () => {
    if (!user?.id) return;
    try {
      await AsyncStorage.removeItem(getProfileKey(user.id));
      setProfile(null);
    } catch (error) {
      console.error("Error clearing profile:", error);
    }
  };

  return { profile, isLoading, saveProfile, updateProfile, clearProfile };
}

export function useRides() {
  const { user } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadRides(user.id);
    } else {
      setRides([]);
      setIsLoading(false);
    }
  }, [user?.id]);

  const loadRides = async (userId: string) => {
    setIsLoading(true);
    try {
      const stored = await AsyncStorage.getItem(getRidesKey(userId));
      if (stored) {
        setRides(JSON.parse(stored));
      } else {
        setRides([]);
      }
    } catch (error) {
      console.error("Error loading rides:", error);
      setRides([]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveRides = async (newRides: Ride[]) => {
    if (!user?.id) return;
    try {
      await AsyncStorage.setItem(getRidesKey(user.id), JSON.stringify(newRides));
      setRides(newRides);
    } catch (error) {
      console.error("Error saving rides:", error);
    }
  };

  const createRide = useCallback(async (ride: Omit<Ride, "id" | "createdAt" | "status" | "riders" | "messages">, creator: UserProfile) => {
    const newRide: Ride = {
      ...ride,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      status: "waiting",
      riders: [{
        id: creator.id,
        name: creator.name,
        vehicleName: creator.vehicleName,
        vehicleNumber: creator.vehicleNumber,
        profilePicture: creator.profilePicture,
      }],
      messages: [],
    };
    const updatedRides = [newRide, ...rides];
    await saveRides(updatedRides);
    return newRide;
  }, [rides, user?.id]);

  const updateRide = useCallback(async (rideId: string, updates: Partial<Ride>) => {
    const updatedRides = rides.map((ride) =>
      ride.id === rideId ? { ...ride, ...updates } : ride
    );
    await saveRides(updatedRides);
  }, [rides, user?.id]);

  const joinRide = useCallback(async (rideId: string, rider: Rider) => {
    const updatedRides = rides.map((ride) => {
      if (ride.id === rideId) {
        const existingRider = ride.riders.find((r) => r.id === rider.id);
        if (!existingRider) {
          return { ...ride, riders: [...ride.riders, rider] };
        }
      }
      return ride;
    });
    await saveRides(updatedRides);
  }, [rides, user?.id]);

  const addMessage = useCallback(async (rideId: string, message: Omit<Message, "id" | "timestamp">) => {
    const newMessage: Message = {
      ...message,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };
    const updatedRides = rides.map((ride) =>
      ride.id === rideId
        ? { ...ride, messages: [...ride.messages, newMessage] }
        : ride
    );
    await saveRides(updatedRides);
    return newMessage;
  }, [rides, user?.id]);

  const getRide = useCallback((rideId: string) => {
    return rides.find((ride) => ride.id === rideId);
  }, [rides]);

  const clearRides = async () => {
    if (!user?.id) return;
    try {
      await AsyncStorage.removeItem(getRidesKey(user.id));
      setRides([]);
    } catch (error) {
      console.error("Error clearing rides:", error);
    }
  };

  return {
    rides,
    isLoading,
    createRide,
    updateRide,
    joinRide,
    addMessage,
    getRide,
    clearRides,
    refreshRides: () => user?.id && loadRides(user.id),
  };
}

export function generateQRData(rideId: string): string {
  return `ridesync://join/${rideId}`;
}

export function parseQRData(data: string): string | null {
  const match = data.match(/ridesync:\/\/join\/(.+)/);
  return match ? match[1] : null;
}
