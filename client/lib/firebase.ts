import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { 
  getAuth, 
  initializeAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  Auth,
  // @ts-ignore - getReactNativePersistence exists in RN bundle
  getReactNativePersistence
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  onSnapshot,
  Timestamp
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra || {};

const firebaseConfig = {
  apiKey: extra.firebaseApiKey,
  authDomain: extra.firebaseAuthDomain,
  projectId: extra.firebaseProjectId,
  storageBucket: extra.firebaseStorageBucket,
  messagingSenderId: extra.firebaseMessagingSenderId,
  appId: extra.firebaseAppId,
};

const isFirebaseConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

if (!isFirebaseConfigured) {
  console.warn("Firebase configuration incomplete. Please add Firebase credentials to Secrets.");
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: ReturnType<typeof getFirestore> | null = null;

function initializeFirebase() {
  if (!isFirebaseConfigured) {
    return;
  }
  
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
    if (Platform.OS !== "web") {
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    } else {
      auth = getAuth(app);
    }
  } else {
    app = getApp();
    auth = getAuth(app);
  }
  db = getFirestore(app);
}

initializeFirebase();

function getAuth_(): Auth {
  if (!auth) {
    throw new Error("Firebase Auth not initialized. Please configure Firebase credentials.");
  }
  return auth;
}

function getDb_(): ReturnType<typeof getFirestore> {
  if (!db) {
    throw new Error("Firestore not initialized. Please configure Firebase credentials.");
  }
  return db;
}

export function getFirebaseAuth(): Auth | null {
  return auth;
}

export function getFirebaseDb() {
  return db;
}

export { isFirebaseConfigured };

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  age?: number;
  vehicleName?: string;
  vehicleNumber?: string;
  photoUri?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Rider {
  id: string;
  name: string;
  vehicleName: string;
  vehicleNumber: string;
  photoUri?: string;
}

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Ride {
  id: string;
  creatorId: string;
  title: string;
  source: string;
  destination: string;
  sourceCoords?: Coordinate;
  destinationCoords?: Coordinate;
  waypoints: string[];
  waypointCoords?: Coordinate[];
  date: Date;
  time: string;
  riders: Rider[];
  riderIds: string[];
  status: "upcoming" | "active" | "completed";
  joinCode: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  id: string;
  rideId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: Date;
}

export async function signUp(email: string, password: string, name: string): Promise<User> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured. Please add Firebase credentials.");
  }
  
  const userCredential = await createUserWithEmailAndPassword(getAuth_(), email, password);
  const user = userCredential.user;
  
  const profile: Omit<UserProfile, "id"> = {
    email,
    name,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  await setDoc(doc(getDb_(), "users", user.uid), {
    ...profile,
    createdAt: Timestamp.fromDate(profile.createdAt),
    updatedAt: Timestamp.fromDate(profile.updatedAt),
  });
  
  return user;
}

export async function signIn(email: string, password: string): Promise<User> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured. Please add Firebase credentials.");
  }
  
  const userCredential = await signInWithEmailAndPassword(getAuth_(), email, password);
  return userCredential.user;
}

export async function signOut(): Promise<void> {
  if (!isFirebaseConfigured) {
    return;
  }
  
  await firebaseSignOut(getAuth_());
}

export function onAuthChange(callback: (user: User | null) => void) {
  if (!isFirebaseConfigured) {
    callback(null);
    return () => {};
  }
  
  return onAuthStateChanged(getAuth_(), callback);
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  if (!isFirebaseConfigured) {
    return null;
  }
  
  const docRef = doc(getDb_(), "users", userId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: userId,
      email: data.email,
      name: data.name,
      age: data.age,
      vehicleName: data.vehicleName,
      vehicleNumber: data.vehicleNumber,
      photoUri: data.photoUri,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  }
  return null;
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured. Please add Firebase credentials.");
  }
  
  const docRef = doc(getDb_(), "users", userId);
  const cleanUpdates: Record<string, any> = { updatedAt: Timestamp.now() };
  
  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      cleanUpdates[key] = value;
    }
  });
  
  await setDoc(docRef, cleanUpdates, { merge: true });
}

function cleanObject(obj: Record<string, any>): Record<string, any> {
  const cleaned: Record<string, any> = {};
  Object.entries(obj).forEach(([key, value]) => {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  });
  return cleaned;
}

export async function createRide(userId: string, rideData: Omit<Ride, "id" | "creatorId" | "createdAt" | "updatedAt" | "joinCode" | "riderIds">): Promise<string> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured. Please add Firebase credentials.");
  }
  
  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  const riderIds = rideData.riders.map(r => r.id);
  const cleanedRiders = rideData.riders.map(r => cleanObject(r));
  
  const ride: Record<string, any> = {
    title: rideData.title,
    source: rideData.source,
    destination: rideData.destination,
    waypoints: rideData.waypoints,
    time: rideData.time,
    status: rideData.status,
    creatorId: userId,
    joinCode,
    riderIds,
    riders: cleanedRiders,
    date: Timestamp.fromDate(rideData.date),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  if (rideData.sourceCoords) {
    ride.sourceCoords = rideData.sourceCoords;
  }
  if (rideData.destinationCoords) {
    ride.destinationCoords = rideData.destinationCoords;
  }
  if (rideData.waypointCoords) {
    ride.waypointCoords = rideData.waypointCoords;
  }
  
  const docRef = await addDoc(collection(getDb_(), "rides"), ride);
  return docRef.id;
}

export async function getRide(rideId: string): Promise<Ride | null> {
  if (!isFirebaseConfigured) {
    return null;
  }
  
  const docRef = doc(getDb_(), "rides", rideId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    const riders = data.riders || [];
    return {
      id: rideId,
      creatorId: data.creatorId,
      title: data.title,
      source: data.source,
      destination: data.destination,
      sourceCoords: data.sourceCoords,
      destinationCoords: data.destinationCoords,
      waypoints: data.waypoints || [],
      waypointCoords: data.waypointCoords,
      date: data.date?.toDate() || new Date(),
      time: data.time,
      riders,
      riderIds: data.riderIds || riders.map((r: Rider) => r.id),
      status: data.status,
      joinCode: data.joinCode,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  }
  return null;
}

export async function getRideByCode(joinCode: string): Promise<Ride | null> {
  if (!isFirebaseConfigured) {
    return null;
  }
  
  const q = query(collection(getDb_(), "rides"), where("joinCode", "==", joinCode));
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    const docSnap = querySnapshot.docs[0];
    const data = docSnap.data();
    const riders = data.riders || [];
    return {
      id: docSnap.id,
      creatorId: data.creatorId,
      title: data.title,
      source: data.source,
      destination: data.destination,
      sourceCoords: data.sourceCoords,
      destinationCoords: data.destinationCoords,
      waypoints: data.waypoints || [],
      waypointCoords: data.waypointCoords,
      date: data.date?.toDate() || new Date(),
      time: data.time,
      riders,
      riderIds: data.riderIds || riders.map((r: Rider) => r.id),
      status: data.status,
      joinCode: data.joinCode,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  }
  
  const rideById = await getRide(joinCode);
  if (rideById) {
    return rideById;
  }
  
  return null;
}

export async function getUserRides(userId: string): Promise<Ride[]> {
  if (!isFirebaseConfigured) {
    return [];
  }
  
  const createdQuery = query(collection(getDb_(), "rides"), where("creatorId", "==", userId));
  const createdSnapshot = await getDocs(createdQuery);
  
  const rides: Ride[] = [];
  createdSnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const riders = data.riders || [];
    rides.push({
      id: docSnap.id,
      creatorId: data.creatorId,
      title: data.title,
      source: data.source,
      destination: data.destination,
      sourceCoords: data.sourceCoords,
      destinationCoords: data.destinationCoords,
      waypoints: data.waypoints || [],
      waypointCoords: data.waypointCoords,
      date: data.date?.toDate() || new Date(),
      time: data.time,
      riders,
      riderIds: data.riderIds || riders.map((r: Rider) => r.id),
      status: data.status,
      joinCode: data.joinCode,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    });
  });
  
  return rides.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function updateRide(rideId: string, updates: Partial<Ride>): Promise<void> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured. Please add Firebase credentials.");
  }
  
  const docRef = doc(getDb_(), "rides", rideId);
  const updateData: any = { ...updates, updatedAt: Timestamp.now() };
  
  if (updates.date) {
    updateData.date = Timestamp.fromDate(updates.date);
  }
  
  await updateDoc(docRef, updateData);
}

export async function joinRide(rideId: string, rider: Rider): Promise<void> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured. Please add Firebase credentials.");
  }
  
  const ride = await getRide(rideId);
  if (!ride) throw new Error("Ride not found");
  
  const existingRider = ride.riders.find((r) => r.id === rider.id);
  if (existingRider) return;
  
  const updatedRiders = [...ride.riders, rider];
  const updatedRiderIds = [...ride.riderIds, rider.id];
  await updateRide(rideId, { riders: updatedRiders, riderIds: updatedRiderIds });
}

export async function leaveRide(rideId: string, riderId: string): Promise<void> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured. Please add Firebase credentials.");
  }
  
  const ride = await getRide(rideId);
  if (!ride) throw new Error("Ride not found");
  
  const updatedRiders = ride.riders.filter((r) => r.id !== riderId);
  const updatedRiderIds = ride.riderIds.filter((id) => id !== riderId);
  await updateRide(rideId, { riders: updatedRiders, riderIds: updatedRiderIds });
}

export async function sendMessage(rideId: string, senderId: string, senderName: string, text: string): Promise<string> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured. Please add Firebase credentials.");
  }
  
  const message = {
    rideId,
    senderId,
    senderName,
    text,
    timestamp: Timestamp.now(),
  };
  
  const docRef = await addDoc(collection(getDb_(), "messages"), message);
  return docRef.id;
}

export async function getRideMessages(rideId: string): Promise<ChatMessage[]> {
  if (!isFirebaseConfigured) {
    return [];
  }
  
  const q = query(collection(getDb_(), "messages"), where("rideId", "==", rideId));
  const querySnapshot = await getDocs(q);
  
  const messages: ChatMessage[] = [];
  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    messages.push({
      id: docSnap.id,
      rideId: data.rideId,
      senderId: data.senderId,
      senderName: data.senderName,
      text: data.text,
      timestamp: data.timestamp?.toDate() || new Date(),
    });
  });
  
  return messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

export function subscribeToMessages(rideId: string, callback: (messages: ChatMessage[]) => void) {
  if (!isFirebaseConfigured) {
    callback([]);
    return () => {};
  }
  
  const q = query(collection(getDb_(), "messages"), where("rideId", "==", rideId));
  
  return onSnapshot(q, (querySnapshot) => {
    const messages: ChatMessage[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      messages.push({
        id: docSnap.id,
        rideId: data.rideId,
        senderId: data.senderId,
        senderName: data.senderName,
        text: data.text,
        timestamp: data.timestamp?.toDate() || new Date(),
      });
    });
    callback(messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));
  });
}

export function subscribeToRide(rideId: string, callback: (ride: Ride | null) => void) {
  if (!isFirebaseConfigured) {
    callback(null);
    return () => {};
  }
  
  const docRef = doc(getDb_(), "rides", rideId);
  
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      const riders = data.riders || [];
      callback({
        id: rideId,
        creatorId: data.creatorId,
        title: data.title,
        source: data.source,
        destination: data.destination,
        sourceCoords: data.sourceCoords,
        destinationCoords: data.destinationCoords,
        waypoints: data.waypoints || [],
        waypointCoords: data.waypointCoords,
        date: data.date?.toDate() || new Date(),
        time: data.time,
        riders,
        riderIds: data.riderIds || riders.map((r: Rider) => r.id),
        status: data.status,
        joinCode: data.joinCode,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      });
    } else {
      callback(null);
    }
  });
}
