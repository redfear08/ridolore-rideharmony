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

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let auth: Auth;

function initializeFirebase() {
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
}

initializeFirebase();

const db = getFirestore(app);

export { auth, db };

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

export interface Ride {
  id: string;
  creatorId: string;
  title: string;
  source: string;
  destination: string;
  waypoints: string[];
  date: Date;
  time: string;
  riders: Rider[];
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
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  
  const profile: Omit<UserProfile, "id"> = {
    email,
    name,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  await setDoc(doc(db, "users", user.uid), {
    ...profile,
    createdAt: Timestamp.fromDate(profile.createdAt),
    updatedAt: Timestamp.fromDate(profile.updatedAt),
  });
  
  return user;
}

export async function signIn(email: string, password: string): Promise<User> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const docRef = doc(db, "users", userId);
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
  const docRef = doc(db, "users", userId);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

export async function createRide(userId: string, rideData: Omit<Ride, "id" | "creatorId" | "createdAt" | "updatedAt" | "joinCode">): Promise<string> {
  const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  
  const ride = {
    ...rideData,
    creatorId: userId,
    joinCode,
    date: Timestamp.fromDate(rideData.date),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };
  
  const docRef = await addDoc(collection(db, "rides"), ride);
  return docRef.id;
}

export async function getRide(rideId: string): Promise<Ride | null> {
  const docRef = doc(db, "rides", rideId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: rideId,
      creatorId: data.creatorId,
      title: data.title,
      source: data.source,
      destination: data.destination,
      waypoints: data.waypoints || [],
      date: data.date?.toDate() || new Date(),
      time: data.time,
      riders: data.riders || [],
      status: data.status,
      joinCode: data.joinCode,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  }
  return null;
}

export async function getRideByCode(joinCode: string): Promise<Ride | null> {
  const q = query(collection(db, "rides"), where("joinCode", "==", joinCode));
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    const docSnap = querySnapshot.docs[0];
    const data = docSnap.data();
    return {
      id: docSnap.id,
      creatorId: data.creatorId,
      title: data.title,
      source: data.source,
      destination: data.destination,
      waypoints: data.waypoints || [],
      date: data.date?.toDate() || new Date(),
      time: data.time,
      riders: data.riders || [],
      status: data.status,
      joinCode: data.joinCode,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  }
  return null;
}

export async function getUserRides(userId: string): Promise<Ride[]> {
  const createdQuery = query(collection(db, "rides"), where("creatorId", "==", userId));
  const createdSnapshot = await getDocs(createdQuery);
  
  const rides: Ride[] = [];
  createdSnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    rides.push({
      id: docSnap.id,
      creatorId: data.creatorId,
      title: data.title,
      source: data.source,
      destination: data.destination,
      waypoints: data.waypoints || [],
      date: data.date?.toDate() || new Date(),
      time: data.time,
      riders: data.riders || [],
      status: data.status,
      joinCode: data.joinCode,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    });
  });
  
  return rides.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function updateRide(rideId: string, updates: Partial<Ride>): Promise<void> {
  const docRef = doc(db, "rides", rideId);
  const updateData: any = { ...updates, updatedAt: Timestamp.now() };
  
  if (updates.date) {
    updateData.date = Timestamp.fromDate(updates.date);
  }
  
  await updateDoc(docRef, updateData);
}

export async function joinRide(rideId: string, rider: Rider): Promise<void> {
  const ride = await getRide(rideId);
  if (!ride) throw new Error("Ride not found");
  
  const existingRider = ride.riders.find((r) => r.id === rider.id);
  if (existingRider) return;
  
  const updatedRiders = [...ride.riders, rider];
  await updateRide(rideId, { riders: updatedRiders });
}

export async function leaveRide(rideId: string, riderId: string): Promise<void> {
  const ride = await getRide(rideId);
  if (!ride) throw new Error("Ride not found");
  
  const updatedRiders = ride.riders.filter((r) => r.id !== riderId);
  await updateRide(rideId, { riders: updatedRiders });
}

export async function sendMessage(rideId: string, senderId: string, senderName: string, text: string): Promise<string> {
  const message = {
    rideId,
    senderId,
    senderName,
    text,
    timestamp: Timestamp.now(),
  };
  
  const docRef = await addDoc(collection(db, "messages"), message);
  return docRef.id;
}

export async function getRideMessages(rideId: string): Promise<ChatMessage[]> {
  const q = query(collection(db, "messages"), where("rideId", "==", rideId));
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
  const q = query(collection(db, "messages"), where("rideId", "==", rideId));
  
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
  const docRef = doc(db, "rides", rideId);
  
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      callback({
        id: rideId,
        creatorId: data.creatorId,
        title: data.title,
        source: data.source,
        destination: data.destination,
        waypoints: data.waypoints || [],
        date: data.date?.toDate() || new Date(),
        time: data.time,
        riders: data.riders || [],
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
