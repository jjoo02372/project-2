// Firebase 초기화 및 설정
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Firebase 설정 (환경 변수에서 가져오기)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBjdijc5P7l0VbIs_wf3cBX8-1KrOTlZEY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "sciencechatbot-76708.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "sciencechatbot-76708",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "sciencechatbot-76708.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "289760016010",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:289760016010:web:8646a868a356be10375f73",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-B0XN009C81"
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// Firebase Authentication 초기화
export const auth = getAuth(app);

// Google 인증 제공자 설정
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export default app;

