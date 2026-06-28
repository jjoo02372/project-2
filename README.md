# 과학 탐구 보고서 작성 도우미

초등학생을 위한 과학 탐구 보고서 작성 웹 애플리케이션입니다.

## 주요 기능

- 🔐 Google 로그인을 통한 사용자 인증
- 📝 9단계 과학 탐구 보고서 작성
- 🤖 AI 도움 기능 (OpenAI API)
- 📊 표 편집, 그림판, 그래프 생성 기능
- 👨‍🏫 교사용 대시보드 (학생 제출 현황 확인 및 평가)

## 환경 설정

### 1. 환경 변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# Firebase 설정 (필수)
# Firebase Console에서 발급받은 설정 값
# https://console.firebase.google.com/
VITE_FIREBASE_API_KEY=AIzaSyBjdijc5P7l0VbIs_wf3cBX8-1KrOTlZEY
VITE_FIREBASE_AUTH_DOMAIN=sciencechatbot-76708.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sciencechatbot-76708
VITE_FIREBASE_STORAGE_BUCKET=sciencechatbot-76708.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=289760016010
VITE_FIREBASE_APP_ID=1:289760016010:web:8646a868a356be10375f73
VITE_FIREBASE_MEASUREMENT_ID=G-B0XN009C81

# Google Apps Script URL (선택사항)
# 기본값은 src/main.js에 하드코딩된 URL을 사용합니다.
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec

# OpenAI API Key (선택사항)
# AI 도움 기능을 사용하려면 OpenAI API 키를 입력하세요.
VITE_OPENAI_API_KEY=sk-your-openai-api-key-here
```

**참고:** Firebase 설정 값은 `src/firebase.js`에 기본값으로 하드코딩되어 있어, 환경 변수를 설정하지 않아도 동작합니다. 하지만 보안을 위해 환경 변수 사용을 권장합니다.

### 2. Firebase 설정

이 프로젝트는 Firebase Authentication을 사용하여 Google 로그인을 구현합니다.

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. 프로젝트 선택 또는 생성
3. "Authentication" > "Sign-in method"에서 Google 로그인 활성화
4. Firebase 설정 값은 이미 `src/firebase.js`에 포함되어 있습니다

### 3. Google Apps Script 설정

Apps Script는 다음 형식의 데이터를 처리해야 합니다:

#### Login 이벤트
```json
{
  "type": "login",
  "user": {
    "id": "sub",
    "name": "사용자 이름",
    "email": "user@example.com",
    "picture": "https://..."
  },
  "app": "science-report",
  "ts": "2025-01-01T00:00:00.000Z"
}
```

#### Submission 이벤트
```json
{
  "type": "submission",
  "user": {
    "id": "sub",
    "name": "사용자 이름",
    "email": "user@example.com",
    "picture": "https://..."
  },
  "step": 1,
  "answer": "답변 내용",
  "ts": "2025-01-01T00:00:00.000Z"
}
```

Apps Script의 `doPost(e)` 함수에서 `type` 필드를 확인하여:
- `type === "login"`: users 시트에 사용자 정보 저장/업데이트
- `type === "submission"`: responses 시트에 제출 데이터 저장

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build
```

## 프로젝트 구조

```
project-2/
├── public/
│   ├── cover.html              # 표지 화면 (로그인)
│   ├── teacher-dashboard.html  # 교사용 대시보드
│   └── teacher-dashboard.js    # 교사용 대시보드 로직
├── src/
│   ├── firebase.js             # Firebase 초기화 및 설정
│   ├── auth.js                 # Firebase Authentication 로그인 관리
│   ├── main.js                 # 메인 앱 로직
│   ├── data/
│   │   └── stepGuides.js       # 단계별 가이드 데이터
│   └── index.css               # 스타일
├── index.html                  # 메인 앱 진입점
└── .env                        # 환경 변수 (git에 커밋하지 않음)
```

## 주요 변경 사항

### v2.0 (로그인 기능 추가)

- ✅ Firebase Authentication을 사용한 Google 로그인 기능 추가
- ✅ 표지 화면(cover.html) 추가
- ✅ 학생ID/이름 입력 UI 제거 → 로그인 정보로 대체
- ✅ Apps Script 연동 개선 (login 이벤트, user 정보 포함)
- ✅ 교사용 대시보드 개선 (user 정보 표시, 로그인 기록 조회)
- ✅ 파스텔 톤 디자인 적용

### v2.1 (Firebase 통합)

- ✅ Google Identity Services → Firebase Authentication으로 전환
- ✅ 더 안정적이고 간편한 로그인 구현
- ✅ Firebase Auth 상태 관리 자동화

## 라이선스

MIT

