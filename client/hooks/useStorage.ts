import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserProfile,
  updateUserProfile,
  createRide as firebaseCreateRide,
  getRide as firebaseGetRide,
  getRideByCode,
  getUserRides,
  updateRide as firebaseUpdateRide,
  joinRide as firebaseJoinRide,
  leaveRide as firebaseLeaveRide,
  sendMessage,
  getRideMessages,
  subscribeToRide,
  subscribeToMessages,
  UserProfile as FirebaseUserProfile,
  Ride as FirebaseRide,
  Rider as FirebaseRider,
  ChatMessage,
} from "@/lib/firebase";

export interface UserProfile {
  id: string;
  name: string;
  age: string;
  vehicleName: string;
  vehicleNumber: string;
  profilePicture?: string;
  email?: string;
  phone?: string;
  bloodGroup?: string;
}

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

export function validateAge(age: string): { valid: boolean; error?: string } {
  const ageNum = parseInt(age, 10);
  if (isNaN(ageNum)) return { valid: false, error: "Age must be a number" };
  if (ageNum < 18) return { valid: false, error: "Age must be at least 18" };
  if (ageNum > 90) return { valid: false, error: "Age must be 90 or less" };
  return { valid: true };
}

export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email.trim()) return { valid: true };
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return { valid: false, error: "Please enter a valid email" };
  return { valid: true };
}

export function validateVehicleNumber(vehicleNumber: string): { valid: boolean; error?: string } {
  const cleaned = vehicleNumber.replace(/\s/g, "").toUpperCase();
  if (cleaned.length !== 10) return { valid: false, error: "Vehicle number must be 10 characters" };
  return { valid: true };
}

export function validatePhone(phone: string): { valid: boolean; error?: string } {
  if (!phone.trim()) return { valid: true };
  const cleaned = phone.replace(/[\s\-\(\)]/g, "");
  if (cleaned.length < 10 || cleaned.length > 15) {
    return { valid: false, error: "Phone number must be 10-15 digits" };
  }
  if (!/^\+?\d+$/.test(cleaned)) {
    return { valid: false, error: "Phone number can only contain digits and +" };
  }
  return { valid: true };
}

export function validateBloodGroup(bloodGroup: string): { valid: boolean; error?: string } {
  if (!bloodGroup.trim()) return { valid: true };
  if (!BLOOD_GROUPS.includes(bloodGroup as any)) {
    return { valid: false, error: "Please select a valid blood group" };
  }
  return { valid: true };
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

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Ride {
  id: string;
  source: string;
  destination: string;
  sourceCoords?: Coordinate;
  destinationCoords?: Coordinate;
  waypoints: string[];
  waypointCoords?: Coordinate[];
  departureTime: string;
  createdAt: string;
  createdBy: string;
  creatorId: string;
  status: "waiting" | "active" | "completed";
  riders: Rider[];
  messages: Message[];
  joinCode?: string;
  distanceKm?: number;
  distanceText?: string;
}

function mapFirebaseProfileToLocal(fbProfile: FirebaseUserProfile): UserProfile {
  return {
    id: fbProfile.id,
    name: fbProfile.name,
    age: fbProfile.age?.toString() || "",
    vehicleName: fbProfile.vehicleName || "",
    vehicleNumber: fbProfile.vehicleNumber || "",
    profilePicture: fbProfile.photoUri,
    email: fbProfile.email,
    phone: fbProfile.phone,
    bloodGroup: fbProfile.bloodGroup,
  };
}

function mapFirebaseRideToLocal(fbRide: FirebaseRide): Ride {
  const statusMap: Record<string, "waiting" | "active" | "completed"> = {
    upcoming: "waiting",
    active: "active",
    completed: "completed",
  };
  
  return {
    id: fbRide.id,
    source: fbRide.source,
    destination: fbRide.destination,
    sourceCoords: fbRide.sourceCoords,
    destinationCoords: fbRide.destinationCoords,
    waypoints: fbRide.waypoints || [],
    waypointCoords: fbRide.waypointCoords,
    departureTime: fbRide.time,
    createdAt: fbRide.createdAt.toISOString(),
    createdBy: fbRide.creatorId,
    creatorId: fbRide.creatorId,
    status: statusMap[fbRide.status] || "waiting",
    riders: (fbRide.riders || []).map((r) => ({
      id: r.id,
      name: r.name || "",
      vehicleName: r.vehicleName || "",
      vehicleNumber: r.vehicleNumber || "",
      profilePicture: r.photoUri,
    })),
    messages: [],
    joinCode: fbRide.joinCode,
    distanceKm: fbRide.distanceKm,
    distanceText: fbRide.distanceText,
  };
}

export function useProfile() {
  const { user, profile: authProfile, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authProfile) {
      setProfile(mapFirebaseProfileToLocal(authProfile));
      setIsLoading(false);
    } else if (user?.id) {
      loadProfile(user.id);
    } else {
      setProfile(null);
      setIsLoading(false);
    }
  }, [user?.id, authProfile]);

  const loadProfile = async (userId: string) => {
    setIsLoading(true);
    try {
      const fbProfile = await getUserProfile(userId);
      if (fbProfile) {
        setProfile(mapFirebaseProfileToLocal(fbProfile));
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
      await updateUserProfile(user.id, {
        name: newProfile.name,
        age: parseInt(newProfile.age) || undefined,
        vehicleName: newProfile.vehicleName,
        vehicleNumber: newProfile.vehicleNumber,
        photoUri: newProfile.profilePicture,
        phone: newProfile.phone,
        bloodGroup: newProfile.bloodGroup,
      });
      setProfile(newProfile);
      await refreshProfile();
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
    setProfile(null);
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
      const fbRides = await getUserRides(userId);
      setRides(fbRides.map(mapFirebaseRideToLocal));
    } catch (error) {
      console.error("Error loading rides:", error);
      setRides([]);
    } finally {
      setIsLoading(false);
    }
  };

  const createRide = useCallback(async (
    ride: Omit<Ride, "id" | "createdAt" | "status" | "riders" | "messages">,
    creator: UserProfile
  ) => {
    if (!user?.id) throw new Error("Must be logged in to create ride");
    
    const rideData: any = {
      title: `${ride.source} to ${ride.destination}`,
      source: ride.source,
      destination: ride.destination,
      waypoints: ride.waypoints,
      date: new Date(),
      time: ride.departureTime,
      riders: [{
        id: creator.id,
        name: creator.name,
        vehicleName: creator.vehicleName,
        vehicleNumber: creator.vehicleNumber,
        photoUri: creator.profilePicture,
      }],
      status: "upcoming" as const,
    };
    
    if (ride.sourceCoords) {
      rideData.sourceCoords = ride.sourceCoords;
    }
    if (ride.destinationCoords) {
      rideData.destinationCoords = ride.destinationCoords;
    }
    if (ride.waypointCoords) {
      rideData.waypointCoords = ride.waypointCoords;
    }
    
    const rideId = await firebaseCreateRide(user.id, rideData);
    const newRide = await firebaseGetRide(rideId);
    
    if (newRide) {
      const localRide = mapFirebaseRideToLocal(newRide);
      setRides((prev) => [localRide, ...prev]);
      return localRide;
    }
    
    throw new Error("Failed to create ride");
  }, [user?.id]);

  const updateRide = useCallback(async (rideId: string, updates: Partial<Ride>) => {
    const fbUpdates: any = {};
    
    if (updates.status) {
      const statusMap: Record<string, string> = {
        waiting: "upcoming",
        active: "active",
        completed: "completed",
      };
      fbUpdates.status = statusMap[updates.status];
    }
    
    if (updates.source) fbUpdates.source = updates.source;
    if (updates.destination) fbUpdates.destination = updates.destination;
    if (updates.waypoints) fbUpdates.waypoints = updates.waypoints;
    if (updates.riders) fbUpdates.riders = updates.riders;
    
    await firebaseUpdateRide(rideId, fbUpdates);
    
    setRides((prev) => 
      prev.map((ride) => ride.id === rideId ? { ...ride, ...updates } : ride)
    );
  }, []);

  const joinRide = useCallback(async (rideId: string, rider: Rider) => {
    const fbRider: FirebaseRider = {
      id: rider.id,
      name: rider.name || "",
      vehicleName: rider.vehicleName || "",
      vehicleNumber: rider.vehicleNumber || "",
    };
    
    if (rider.profilePicture) {
      fbRider.photoUri = rider.profilePicture;
    }
    
    await firebaseJoinRide(rideId, fbRider);
    
    const freshRide = await firebaseGetRide(rideId);
    if (freshRide) {
      const localRide = mapFirebaseRideToLocal(freshRide);
      setRides((prev) => {
        const exists = prev.some((r) => r.id === rideId);
        if (!exists) {
          return [...prev, localRide];
        }
        return prev.map((r) => (r.id === rideId ? localRide : r));
      });
    }
  }, []);

  const addMessage = useCallback(async (rideId: string, message: Omit<Message, "id" | "timestamp">) => {
    const messageId = await sendMessage(rideId, message.senderId, message.senderName, message.text);
    
    const newMessage: Message = {
      ...message,
      id: messageId,
      timestamp: new Date().toISOString(),
    };
    
    setRides((prev) =>
      prev.map((ride) =>
        ride.id === rideId
          ? { ...ride, messages: [...ride.messages, newMessage] }
          : ride
      )
    );
    
    return newMessage;
  }, []);

  const getRide = useCallback((rideId: string) => {
    return rides.find((ride) => ride.id === rideId);
  }, [rides]);

  const fetchRideById = useCallback(async (rideId: string): Promise<Ride | null> => {
    try {
      const fbRide = await firebaseGetRide(rideId);
      if (fbRide) {
        const localRide = mapFirebaseRideToLocal(fbRide);
        setRides((prev) => {
          const exists = prev.some((r) => r.id === rideId);
          if (!exists) {
            return [...prev, localRide];
          }
          return prev.map((r) => (r.id === rideId ? localRide : r));
        });
        return localRide;
      }
      return null;
    } catch (error) {
      console.error("Error fetching ride by ID:", error);
      return null;
    }
  }, []);

  const findRideByCode = useCallback(async (joinCode: string): Promise<Ride | null> => {
    try {
      const fbRide = await getRideByCode(joinCode);
      if (fbRide) {
        return mapFirebaseRideToLocal(fbRide);
      }
      return null;
    } catch (error) {
      console.error("Error finding ride by code:", error);
      return null;
    }
  }, []);

  const clearRides = async () => {
    setRides([]);
  };

  return {
    rides,
    isLoading,
    createRide,
    updateRide,
    joinRide,
    addMessage,
    getRide,
    fetchRideById,
    findRideByCode,
    clearRides,
    refreshRides: () => user?.id && loadRides(user.id),
  };
}

export function generateQRData(rideId: string, joinCode?: string): string {
  if (joinCode) {
    return `ridesync://join/${joinCode}`;
  }
  return `ridesync://join/${rideId}`;
}

export function parseQRData(data: string): string | null {
  const trimmed = data.trim();
  
  const match = trimmed.match(/ridesync:\/\/join\/(.+)/);
  if (match) {
    return match[1];
  }
  
  if (trimmed.length >= 6 && /^[A-Za-z0-9]+$/.test(trimmed)) {
    return trimmed.toUpperCase();
  }
  
  return trimmed.length > 0 ? trimmed : null;
}
