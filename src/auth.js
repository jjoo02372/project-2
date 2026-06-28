// Firebase Authentication을 사용한 인증 관리
import { auth, googleProvider } from './firebase.js';
import { 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

// localStorage key
const USER_STORAGE_KEY = 'scienceReportUser';

// Google Apps Script URL (환경변수 또는 기본값)
const SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || 
  "https://script.google.com/macros/s/AKfycbw_PsbLZpDxaWZWA1zRcjLESqPV2ktxmYIvu4WdM7tHAFE8y-qIRmDgbdaQcvB9KYQexA/exec";

/**
 * 현재 로그인된 사용자 정보 가져오기
 * @returns {Object|null} { id, name, email, picture, loggedInAt } 또는 null
 */
export function getCurrentUser() {
  try {
    const userStr = localStorage.getItem(USER_STORAGE_KEY);
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch (error) {
    console.error('[AUTH] Failed to get current user:', error);
    return null;
  }
}

/**
 * 사용자 정보 저장
 * @param {Object} user - { id, name, email, picture, loggedInAt }
 */
export function saveUser(user) {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    console.log('[AUTH] User saved:', user);
  } catch (error) {
    console.error('[AUTH] Failed to save user:', error);
  }
}

/**
 * 로그아웃 (사용자 정보 삭제)
 */
export async function logout() {
  try {
    await signOut(auth);
    localStorage.removeItem(USER_STORAGE_KEY);
    console.log('[AUTH] User logged out');
  } catch (error) {
    console.error('[AUTH] Failed to logout:', error);
    // localStorage는 삭제
    localStorage.removeItem(USER_STORAGE_KEY);
  }
}

/**
 * 로그인 상태 확인
 * @returns {boolean}
 */
export function isLoggedIn() {
  return getCurrentUser() !== null;
}

/**
 * Firebase Auth 상태 변경 감지
 * @param {Function} callback - 상태 변경 시 호출될 콜백
 */
export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      const user = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || '',
        email: firebaseUser.email || '',
        picture: firebaseUser.photoURL || '',
        loggedInAt: new Date().toISOString()
      };
      saveUser(user);
      if (callback) callback(user);
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
      if (callback) callback(null);
    }
  });
}

/**
 * Google 로그인 초기화 및 버튼 렌더링
 * @param {HTMLElement} buttonContainer - 로그인 버튼을 넣을 컨테이너
 * @param {Function} onSuccess - 로그인 성공 시 콜백
 */
export function initGoogleSignIn(buttonContainer, onSuccess) {
  console.log('[AUTH] initGoogleSignIn called');
  
  if (!buttonContainer) {
    console.error('[AUTH] Button container not found');
    return;
  }

  try {
    // Firebase가 제대로 import되었는지 확인
    if (!auth) {
      throw new Error('Firebase auth is not initialized');
    }
    
    if (!googleProvider) {
      throw new Error('Google provider is not initialized');
    }
    
    console.log('[AUTH] Firebase auth and provider are ready');

    // 로딩 메시지 제거
    const loadingMsg = buttonContainer.querySelector('.loading-message');
    if (loadingMsg) {
      console.log('[AUTH] Removing loading message');
      loadingMsg.remove();
    }

    // 기존 내용 제거 (오류 메시지 등)
    const existingError = buttonContainer.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }

    // Google 로그인 버튼 생성
    const loginButton = document.createElement('button');
    loginButton.className = 'google-login-button';
    loginButton.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 18 18" style="margin-right: 8px;">
        <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
        <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.96-2.184l-2.908-2.258c-.806.54-1.837.86-3.052.86-2.347 0-4.33-1.584-5.04-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
        <path fill="#FBBC05" d="M3.96 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.003-2.332z"/>
        <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.96 7.293C4.67 5.163 6.653 3.58 9 3.58z"/>
      </svg>
      Google로 로그인
    `;
    
    console.log('[AUTH] Login button created, adding to container');
    
    // 버튼을 컨테이너에 추가
    buttonContainer.appendChild(loginButton);
    
    console.log('[AUTH] Login button added to container');
  
  loginButton.addEventListener('click', async () => {
    try {
      loginButton.disabled = true;
      loginButton.textContent = '로그인 중...';
      
      console.log('[AUTH] Starting Google sign-in...');
      
      // Firebase를 통한 Google 로그인
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      
      const user = {
        id: firebaseUser.uid,
        name: firebaseUser.displayName || '',
        email: firebaseUser.email || '',
        picture: firebaseUser.photoURL || '',
        loggedInAt: new Date().toISOString()
      };
      
      console.log('[AUTH] user', user);
      
      // 사용자 정보 저장
      saveUser(user);
      
      // Apps Script로 login 이벤트 전송
      try {
        await sendLoginEvent(user);
      } catch (error) {
        console.error('[AUTH] Failed to send login event:', error);
        // 로그인은 성공했으므로 계속 진행
      }
      
      if (onSuccess) {
        onSuccess(user);
      }
    } catch (error) {
      console.error('[AUTH] Google sign-in error:', error);
      
      let errorMessage = '로그인에 실패했습니다.';
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = '로그인 창이 닫혔습니다. 다시 시도해주세요.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = '팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.';
      }
      
      alert(errorMessage);
      
      loginButton.disabled = false;
      loginButton.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 18 18" style="margin-right: 8px;">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.96-2.184l-2.908-2.258c-.806.54-1.837.86-3.052.86-2.347 0-4.33-1.584-5.04-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
          <path fill="#FBBC05" d="M3.96 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.348 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.003-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.96 7.293C4.67 5.163 6.653 3.58 9 3.58z"/>
        </svg>
        Google로 로그인
      `;
    }
  });
  
    // Firebase Auth 상태 감지 (이미 로그인되어 있는 경우)
    onAuthStateChange((user) => {
      if (user && onSuccess) {
        console.log('[AUTH] User already logged in');
        onSuccess(user);
      }
    });
    
    console.log('[AUTH] initGoogleSignIn completed successfully');
  } catch (error) {
    console.error('[AUTH] Error in initGoogleSignIn:', error);
    
    // 오류 메시지 표시
    buttonContainer.innerHTML = '';
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.innerHTML = `
      <p style="font-weight: bold; margin-bottom: 8px;">⚠️ 로그인 초기화 오류</p>
      <p style="font-size: 14px; margin-bottom: 8px;">${error.message}</p>
      <p style="font-size: 12px; color: #666;">브라우저 콘솔(F12)에서 자세한 오류를 확인하세요.</p>
      <button onclick="window.location.reload()" style="margin-top: 12px; padding: 8px 16px; background: #9333ea; color: white; border: none; border-radius: 8px; cursor: pointer;">
        🔄 새로고침
      </button>
    `;
    buttonContainer.appendChild(errorDiv);
  }
}

/**
 * Apps Script로 login 이벤트 전송
 */
async function sendLoginEvent(user) {
  try {
    const loginData = {
      type: 'login',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        picture: user.picture || ''
      },
      app: 'science-report',
      ts: new Date().toISOString()
    };
    
    console.log('[AUTH] Sending login event to Apps Script:', loginData);
    
    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(loginData),
    });
    
    const responseText = await response.text();
    console.log('[AUTH] Login event response status:', response.status);
    console.log('[AUTH] Login event response:', responseText);
    
    if (response.ok) {
      console.log('[AUTH] Login event sent successfully');
    } else {
      console.warn('[AUTH] Login event response not OK:', response.status);
    }
    
    return { success: response.ok, response: responseText };
  } catch (error) {
    console.error('[AUTH] Failed to send login event:', error);
    throw error;
  }
}

/**
 * 로그인 페이지로 리다이렉트
 */
export function redirectToCover() {
  window.location.href = '/cover.html';
}

/**
 * 로그인 체크 및 리다이렉트
 * @returns {boolean} 로그인되어 있으면 true, 아니면 false (리다이렉트됨)
 */
export function requireAuth() {
  if (!isLoggedIn()) {
    redirectToCover();
    return false;
  }
  return true;
}
