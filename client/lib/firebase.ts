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
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  onSnapshot,
  Timestamp,
  orderBy,
  limit,
  startAfter,
  QueryDocumentSnapshot,
  increment
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
  phone?: string;
  bloodGroup?: string;
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
  distanceKm?: number;
  distanceText?: string;
  estimatedDuration?: string;
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
      phone: data.phone,
      bloodGroup: data.bloodGroup,
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
  if (rideData.distanceKm !== undefined) {
    ride.distanceKm = rideData.distanceKm;
  }
  if (rideData.distanceText) {
    ride.distanceText = rideData.distanceText;
  }
  if (rideData.estimatedDuration) {
    ride.estimatedDuration = rideData.estimatedDuration;
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
      distanceKm: data.distanceKm,
      distanceText: data.distanceText,
      estimatedDuration: data.estimatedDuration,
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
      distanceKm: data.distanceKm,
      distanceText: data.distanceText,
      estimatedDuration: data.estimatedDuration,
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
  
  const cleanRider: Record<string, any> = {
    id: rider.id,
    name: rider.name || "",
    vehicleName: rider.vehicleName || "",
    vehicleNumber: rider.vehicleNumber || "",
  };
  if (rider.photoUri) {
    cleanRider.photoUri = rider.photoUri;
  }
  
  const updatedRiders = [...ride.riders, cleanRider as Rider];
  const updatedRiderIds = [...(ride.riderIds || []), rider.id];
  
  const docRef = doc(getDb_(), "rides", rideId);
  await updateDoc(docRef, {
    riders: updatedRiders,
    riderIds: updatedRiderIds,
    updatedAt: Timestamp.now(),
  });
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

export interface RiderLocation {
  riderId: string;
  riderName: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  updatedAt: Date;
}

export interface PostAuthor {
  id: string;
  name: string;
  photoUri?: string;
  vehicleName?: string;
}

export interface PostMedia {
  type: "image" | "video";
  uri: string;
  aspectRatio?: number;
  thumbnailUri?: string;
}

export interface Post {
  id: string;
  authorId: string;
  author: PostAuthor;
  caption: string;
  media: PostMedia[];
  postType: "general" | "ride_announcement";
  rideId?: string;
  rideTitle?: string;
  likeCount: number;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhotoUri?: string;
  text: string;
  createdAt: Date;
}

export async function updateRiderLocation(
  rideId: string,
  riderId: string,
  riderName: string,
  location: {
    latitude: number;
    longitude: number;
    heading?: number;
    speed?: number;
    accuracy?: number;
  }
): Promise<void> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured.");
  }

  const locationDoc = doc(getDb_(), "rides", rideId, "locations", riderId);
  
  const locationData: Record<string, any> = {
    riderId,
    riderName,
    latitude: location.latitude,
    longitude: location.longitude,
    updatedAt: Timestamp.now(),
  };
  
  if (location.heading !== undefined) {
    locationData.heading = location.heading;
  }
  if (location.speed !== undefined) {
    locationData.speed = location.speed;
  }
  if (location.accuracy !== undefined) {
    locationData.accuracy = location.accuracy;
  }

  await setDoc(locationDoc, locationData);
}

export function subscribeToRiderLocations(
  rideId: string,
  callback: (locations: RiderLocation[]) => void
) {
  if (!isFirebaseConfigured) {
    callback([]);
    return () => {};
  }

  const locationsRef = collection(getDb_(), "rides", rideId, "locations");

  return onSnapshot(locationsRef, (snapshot) => {
    const locations: RiderLocation[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      locations.push({
        riderId: data.riderId,
        riderName: data.riderName || "Rider",
        latitude: data.latitude,
        longitude: data.longitude,
        heading: data.heading,
        speed: data.speed,
        accuracy: data.accuracy,
        updatedAt: data.updatedAt?.toDate() || new Date(),
      });
    });
    callback(locations);
  });
}

function parsePost(docSnap: QueryDocumentSnapshot): Post {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    authorId: data.authorId,
    author: data.author || { id: data.authorId, name: "Unknown" },
    caption: data.caption || "",
    media: data.media || [],
    postType: data.postType || "general",
    rideId: data.rideId,
    rideTitle: data.rideTitle,
    likeCount: data.likeCount || 0,
    commentCount: data.commentCount || 0,
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

export async function createPost(
  author: PostAuthor,
  caption: string,
  media: PostMedia[],
  postType: "general" | "ride_announcement" = "general",
  rideId?: string,
  rideTitle?: string
): Promise<string> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured.");
  }

  const postData: Record<string, any> = {
    authorId: author.id,
    author: cleanObject(author),
    caption,
    media,
    postType,
    likeCount: 0,
    commentCount: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  if (rideId) postData.rideId = rideId;
  if (rideTitle) postData.rideTitle = rideTitle;

  const docRef = await addDoc(collection(getDb_(), "posts"), postData);
  return docRef.id;
}

export async function getPosts(
  pageSize: number = 10,
  lastDoc?: QueryDocumentSnapshot
): Promise<{ posts: Post[]; lastDoc: QueryDocumentSnapshot | null }> {
  if (!isFirebaseConfigured) {
    return { posts: [], lastDoc: null };
  }

  let q = query(
    collection(getDb_(), "posts"),
    orderBy("createdAt", "desc"),
    limit(pageSize)
  );

  if (lastDoc) {
    q = query(
      collection(getDb_(), "posts"),
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      limit(pageSize)
    );
  }

  const snapshot = await getDocs(q);
  const posts: Post[] = [];
  let newLastDoc: QueryDocumentSnapshot | null = null;

  snapshot.forEach((docSnap) => {
    posts.push(parsePost(docSnap));
    newLastDoc = docSnap;
  });

  return { posts, lastDoc: newLastDoc };
}

export async function getPost(postId: string): Promise<Post | null> {
  if (!isFirebaseConfigured) {
    return null;
  }

  const docRef = doc(getDb_(), "posts", postId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      authorId: data.authorId,
      author: data.author || { id: data.authorId, name: "Unknown" },
      caption: data.caption || "",
      media: data.media || [],
      postType: data.postType || "general",
      rideId: data.rideId,
      rideTitle: data.rideTitle,
      likeCount: data.likeCount || 0,
      commentCount: data.commentCount || 0,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  }
  return null;
}

export async function deletePost(postId: string): Promise<void> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured.");
  }

  await deleteDoc(doc(getDb_(), "posts", postId));
}

export async function toggleLike(postId: string, userId: string): Promise<boolean> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured.");
  }

  const likeRef = doc(getDb_(), "posts", postId, "likes", userId);
  const likeSnap = await getDoc(likeRef);
  const postRef = doc(getDb_(), "posts", postId);

  if (likeSnap.exists()) {
    await deleteDoc(likeRef);
    await updateDoc(postRef, { likeCount: increment(-1) });
    return false;
  } else {
    await setDoc(likeRef, { createdAt: Timestamp.now() });
    await updateDoc(postRef, { likeCount: increment(1) });
    return true;
  }
}

export async function isPostLiked(postId: string, userId: string): Promise<boolean> {
  if (!isFirebaseConfigured) {
    return false;
  }

  const likeRef = doc(getDb_(), "posts", postId, "likes", userId);
  const likeSnap = await getDoc(likeRef);
  return likeSnap.exists();
}

export async function addComment(
  postId: string,
  authorId: string,
  authorName: string,
  text: string,
  authorPhotoUri?: string
): Promise<string> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase is not configured.");
  }

  const commentData: Record<string, any> = {
    postId,
    authorId,
    authorName,
    text,
    createdAt: Timestamp.now(),
  };

  if (authorPhotoUri) {
    commentData.authorPhotoUri = authorPhotoUri;
  }

  const docRef = await addDoc(collection(getDb_(), "posts", postId, "comments"), commentData);
  
  const postRef = doc(getDb_(), "posts", postId);
  await updateDoc(postRef, { commentCount: increment(1) });

  return docRef.id;
}

export async function getComments(postId: string): Promise<PostComment[]> {
  if (!isFirebaseConfigured) {
    return [];
  }

  const q = query(
    collection(getDb_(), "posts", postId, "comments"),
    orderBy("createdAt", "asc")
  );
  const snapshot = await getDocs(q);

  const comments: PostComment[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    comments.push({
      id: docSnap.id,
      postId,
      authorId: data.authorId,
      authorName: data.authorName,
      authorPhotoUri: data.authorPhotoUri,
      text: data.text,
      createdAt: data.createdAt?.toDate() || new Date(),
    });
  });

  return comments;
}

export function subscribeToPosts(callback: (posts: Post[]) => void) {
  if (!isFirebaseConfigured) {
    callback([]);
    return () => {};
  }

  const q = query(
    collection(getDb_(), "posts"),
    orderBy("createdAt", "desc"),
    limit(50)
  );

  return onSnapshot(q, (snapshot) => {
    const posts: Post[] = [];
    snapshot.forEach((docSnap) => {
      posts.push(parsePost(docSnap));
    });
    callback(posts);
  });
}
