export default ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      firebaseApiKey: process.env.FIREBASE_API_KEY || config.extra?.firebaseApiKey,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN || config.extra?.firebaseAuthDomain,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID || config.extra?.firebaseProjectId,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET || config.extra?.firebaseStorageBucket,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || config.extra?.firebaseMessagingSenderId,
      firebaseAppId: process.env.FIREBASE_APP_ID || config.extra?.firebaseAppId,
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || config.extra?.googleMapsApiKey,
      eas: {
        projectId: "c655d7c5-d1f8-4b6f-89f5-05e5955025d4",
      },
    },
  };
};
