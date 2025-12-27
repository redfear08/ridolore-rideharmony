import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

const PROFILE_KEY = "@ridesync_profile";
const RIDES_KEY = "@ridesync_rides";

export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const stored = await AsyncStorage.getItem(PROFILE_KEY);
      if (stored) {
        setProfile(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveProfile = async (newProfile: UserProfile) => {
    try {
      await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
      setProfile(newProfile);
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (profile) {
      const updated = { ...profile, ...updates };
      await saveProfile(updated);
    }
  };

  const clearProfile = async () => {
    try {
      await AsyncStorage.removeItem(PROFILE_KEY);
      setProfile(null);
    } catch (error) {
      console.error("Error clearing profile:", error);
    }
  };

  return { profile, isLoading, saveProfile, updateProfile, clearProfile };
}

export function useRides() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRides();
  }, []);

  const loadRides = async () => {
    try {
      const stored = await AsyncStorage.getItem(RIDES_KEY);
      if (stored) {
        setRides(JSON.parse(stored));
      }
    } catch (error) {
      console.error("Error loading rides:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveRides = async (newRides: Ride[]) => {
    try {
      await AsyncStorage.setItem(RIDES_KEY, JSON.stringify(newRides));
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
  }, [rides]);

  const updateRide = useCallback(async (rideId: string, updates: Partial<Ride>) => {
    const updatedRides = rides.map((ride) =>
      ride.id === rideId ? { ...ride, ...updates } : ride
    );
    await saveRides(updatedRides);
  }, [rides]);

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
  }, [rides]);

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
  }, [rides]);

  const getRide = useCallback((rideId: string) => {
    return rides.find((ride) => ride.id === rideId);
  }, [rides]);

  const clearRides = async () => {
    try {
      await AsyncStorage.removeItem(RIDES_KEY);
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
    refreshRides: loadRides,
  };
}

export function generateQRData(rideId: string): string {
  return `ridesync://join/${rideId}`;
}

export function parseQRData(data: string): string | null {
  const match = data.match(/ridesync:\/\/join\/(.+)/);
  return match ? match[1] : null;
}
