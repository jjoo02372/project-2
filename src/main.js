import { stepGuides } from './data/stepGuides.js';
import './index.css';

const STORAGE_KEY = 'science-inquiry-report';
const API_KEY_STORAGE_KEY = 'openai-api-key';
const API_STATUS_STORAGE_KEY = 'openai-api-status';
const STUDENT_INFO_STORAGE_KEY = 'student-info';
const SCIENCE_REPORTS_KEY = 'scienceReports';
const TEACHER_DASHBOARD_DATA_KEY = 'teacherDashboardData';

// Google Apps Script URL
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw_PsbLZpDxaWZWA1zRcjLESqPV2ktxmYIvu4WdM7tHAFE8y-qIRmDgbdaQcvB9KYQexA/exec";

// App State
let currentStep = 1;
let reportData = {};
let showPreview = false;
let aiResponse = '';
let apiKey = '';
let apiStatus = 'unknown'; // 'unknown', 'testing', 'valid', 'invalid'
let chatHistory = {}; // 각 단계별 대화 기록 { stepId: [{role, content}, ...] }
let studentInfo = { studentId: '', studentName: '' }; // 학생 정보
let step6Data = { // 6번 단계 전용 데이터
  tableData: [], // 표 데이터
  headerLabels: [], // 헤더 라벨 (항목 1, 항목 2...)
  rowLabels: [], // 행 라벨 (1회, 2회...)
  canvasImage: null, // 그림판 이미지 (base64)
  graphData: null, // 그래프 데이터
  graphType: 'bar' // 그래프 타입: 'bar', 'line', 'pie'
};

// Load data from localStorage
function loadData() {
  const savedData = localStorage.getItem(STORAGE_KEY);
  if (savedData) {
    try {
      reportData = JSON.parse(savedData);
    } catch (error) {
      console.error('Failed to load saved data:', error);
    }
  }
  
  // Load API key (환경 변수 우선, 없으면 localStorage)
  const envApiKey = import.meta.env.VITE_OPENAI_API_KEY || '';
  const savedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
  
  if (envApiKey) {
    apiKey = envApiKey;
    // 환경 변수에서 가져온 API 키를 localStorage에 저장 (자동 인증을 위해)
    if (!savedApiKey) {
      localStorage.setItem(API_KEY_STORAGE_KEY, envApiKey);
    }
  } else if (savedApiKey) {
    apiKey = savedApiKey;
  } else {
    apiKey = '';
  }
  
  // Load API status
  const savedStatus = localStorage.getItem(API_STATUS_STORAGE_KEY);
  if (savedStatus) {
    apiStatus = savedStatus;
  }
  
  // API 키가 있으면 자동으로 테스트 (자동 인증)
  if (apiKey && apiKey.trim() !== '') {
    // 약간의 지연 후 자동 테스트 (페이지 로드 완료 후)
    setTimeout(() => {
      autoTestAPIKey();
    }, 500);
  } else {
    apiStatus = 'invalid';
  }
  
  // Load chat history
  const savedChatHistory = localStorage.getItem('chat-history');
  if (savedChatHistory) {
    try {
      chatHistory = JSON.parse(savedChatHistory);
    } catch (error) {
      console.error('Failed to load chat history:', error);
      chatHistory = {};
    }
  }
  
  // Load step 6 data
  const savedStep6Data = localStorage.getItem('step6-data');
  if (savedStep6Data) {
    try {
      step6Data = JSON.parse(savedStep6Data);
    } catch (error) {
      console.error('Failed to load step 6 data:', error);
      step6Data = { tableData: [], headerLabels: [], rowLabels: [], canvasImage: null, graphData: null, graphType: 'bar' };
    }
  }
  
  // Load student info
  const savedStudentInfo = localStorage.getItem(STUDENT_INFO_STORAGE_KEY);
  if (savedStudentInfo) {
    try {
      studentInfo = JSON.parse(savedStudentInfo);
    } catch (error) {
      console.error('Failed to load student info:', error);
      studentInfo = { studentId: '', studentName: '' };
    }
  }
}

// Save student info to localStorage
function saveStudentInfo() {
  localStorage.setItem(STUDENT_INFO_STORAGE_KEY, JSON.stringify(studentInfo));
}

// Submit all answers to teacher (모든 답변을 교사에게 제출) - localStorage 사용
function submitAllAnswersToTeacher() {
  if (!studentInfo.studentId || !studentInfo.studentName) {
    alert('학생 정보를 먼저 입력해주세요.');
    return;
  }
  
  // 모든 단계의 답변 수집
  const steps = {};
  let completedSteps = 0;
  
  stepGuides.forEach((step) => {
    const content = reportData[step.id] || '';
    const textarea = document.querySelector(`textarea[data-step-textarea="${step.id}"]`);
    const actualContent = textarea ? textarea.value.trim() : content.trim();
    
    if (actualContent) {
      steps[step.id] = actualContent;
      completedSteps++;
    } else {
      steps[step.id] = '';
    }
  });
  
  if (completedSteps === 0) {
    alert('제출할 답변이 없습니다. 먼저 보고서를 작성해주세요.');
    return;
  }
  
  // 제출 버튼 찾기 및 상태 변경
  const submitBtn = document.getElementById('submitToTeacherBtn');
  if (submitBtn) {
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '제출 중...';
    
    try {
      // 기존 데이터 로드
      const existingData = JSON.parse(localStorage.getItem(TEACHER_DASHBOARD_DATA_KEY) || '{}');
      
      // 학생 데이터 생성
      const studentData = {
        studentId: studentInfo.studentId,
        studentName: studentInfo.studentName,
        step1: steps[1] || '',
        step2: steps[2] || '',
        step3: steps[3] || '',
        step4: steps[4] || '',
        step5: steps[5] || '',
        step6: steps[6] || '',
        step7: steps[7] || '',
        step8: steps[8] || '',
        step9: steps[9] || '',
        completedSteps: completedSteps,
        updatedAt: new Date().toISOString()
      };
      
      // 같은 studentId면 덮어쓰기
      existingData[studentInfo.studentId] = studentData;
      
      // localStorage에 저장
      localStorage.setItem(TEACHER_DASHBOARD_DATA_KEY, JSON.stringify(existingData));
      
      console.log('Data saved to teacher dashboard:', studentData);
      
      // 성공 메시지 표시
      submitBtn.textContent = '✓ 제출 완료';
      submitBtn.style.backgroundColor = '#16a34a';
      showResponseMessage('success', 
        `교사에게 제출 완료!\n\n` +
        `학생: ${studentInfo.studentName} (${studentInfo.studentId})\n` +
        `완료된 단계: ${completedSteps}/9개\n\n` +
        `교사용 대시보드에서 확인할 수 있습니다.`
      );
      
      setTimeout(() => {
        submitBtn.textContent = originalText;
        submitBtn.style.backgroundColor = '';
        submitBtn.disabled = false;
      }, 3000);
    } catch (error) {
      console.error('Failed to submit to teacher:', error);
      submitBtn.textContent = '✗ 제출 실패';
      submitBtn.style.backgroundColor = '#dc2626';
      showResponseMessage('error', 
        `제출 실패: ${error.message}`
      );
      
      setTimeout(() => {
        submitBtn.textContent = originalText;
        submitBtn.style.backgroundColor = '';
        submitBtn.disabled = false;
      }, 3000);
    }
  }
}

// Save data to Google Sheets
async function saveToSheet({ studentId, studentName, step, answer }) {
  try {
    console.log('Sending data to Google Apps Script:', { studentId, studentName, step, answer });
    
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ studentId, studentName, step, answer }),
    });
    
    console.log('Response status:', res.status);
    console.log('Response headers:', res.headers);
    
    // 응답 텍스트 먼저 확인
    const responseText = await res.text();
    console.log('Response text:', responseText);
    
    // JSON 파싱 시도
    let json;
    try {
      json = JSON.parse(responseText);
      console.log('Parsed JSON response:', json);
    } catch (e) {
      // JSON이 아닌 경우 텍스트로 처리
      console.log('Response is not JSON, treating as text');
      if (responseText.toLowerCase().includes('success') || responseText.toLowerCase().includes('ok')) {
        return { success: true, message: responseText, response: responseText };
      }
      return { success: false, message: responseText, response: responseText };
    }
    
    // 응답 처리
    if (json.ok || json.success) {
      console.log('Data saved to Google Sheets successfully');
      return { success: true, message: json.message || '저장되었습니다.', response: json };
    } else {
      throw new Error(json.message || json.error || "save failed");
    }
  } catch (error) {
    console.error('Failed to save to Google Sheets:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return { 
      success: false, 
      message: error.message || '저장에 실패했습니다.', 
      error: error 
    };
  }
}

// Submit answer function - 저장 버튼 클릭 시 호출
async function submitAnswer() {
  const textarea = document.querySelector(`textarea[data-step-textarea="${currentStep}"]`);
  const actualContent = textarea ? textarea.value.trim() : (reportData[currentStep] || '').trim();
  
  if (!actualContent) {
    alert('저장할 내용이 없습니다. 먼저 답변을 작성해주세요.');
    return;
  }
  
  if (!studentInfo.studentId || !studentInfo.studentName) {
    alert('학생 정보를 먼저 입력해주세요.');
    return;
  }
  
  // reportData 업데이트 (중요!)
  reportData[currentStep] = actualContent;
  
  // 저장 버튼 비활성화 및 로딩 표시
  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    const originalText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중...';
    
    // saveData 호출하여 reportData 저장
    saveData();
    
    // localStorage에 학생별 데이터 저장 (교사용 대시보드를 위해)
    const studentKey = `student-${studentInfo.studentId}-${studentInfo.studentName}`;
    const studentData = {
      studentId: studentInfo.studentId,
      studentName: studentInfo.studentName,
      reportData: reportData,
      step6Data: step6Data,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(studentKey, JSON.stringify(studentData));
    
    // Update scienceReports for teacher dashboard
    updateScienceReports();
    
    // Apps Script로도 전송 (기존 기능 유지)
    const result = await saveToSheet({
      studentId: studentInfo.studentId,
      studentName: studentInfo.studentName,
      step: currentStep, // 숫자로 전송
      answer: actualContent
    });
    
    // 버튼 상태 복원
    saveBtn.disabled = false;
    
    // 응답 메시지 표시
    if (result.success) {
      saveBtn.textContent = '✓ 저장 완료';
      saveBtn.style.backgroundColor = '#16a34a';
      
      // Apps Script 응답 표시
      showResponseMessage('success', `저장 성공!\n${result.message}\n\n응답: ${JSON.stringify(result.response, null, 2)}`);
      
      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.backgroundColor = '';
      }, 3000);
    } else {
      saveBtn.textContent = '✗ 저장 실패';
      saveBtn.style.backgroundColor = '#dc2626';
      
      // 에러 메시지 표시
      const errorMsg = result.error ? 
        `저장 실패: ${result.message}\n\n에러: ${result.error.message || JSON.stringify(result.error)}` :
        `저장 실패: ${result.message}`;
      showResponseMessage('error', errorMsg);
      
      setTimeout(() => {
        saveBtn.textContent = originalText;
        saveBtn.style.backgroundColor = '';
      }, 3000);
    }
  }
}

// Show response message from Apps Script
function showResponseMessage(type, message) {
  // 기존 메시지 제거
  const existingMsg = document.getElementById('apps-script-response');
  if (existingMsg) {
    existingMsg.remove();
  }
  
  // 새 메시지 생성
  const msgDiv = document.createElement('div');
  msgDiv.id = 'apps-script-response';
  msgDiv.className = `fixed top-20 right-4 z-50 p-4 rounded-lg shadow-xl max-w-md ${
    type === 'success' ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'
  }`;
  
  const title = document.createElement('div');
  title.className = `font-bold mb-2 ${type === 'success' ? 'text-green-800' : 'text-red-800'}`;
  title.textContent = type === 'success' ? '✅ Apps Script 응답' : '❌ Apps Script 오류';
  
  const content = document.createElement('div');
  content.className = `text-sm ${type === 'success' ? 'text-green-700' : 'text-red-700'} whitespace-pre-wrap`;
  content.textContent = message;
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'absolute top-2 right-2 text-gray-500 hover:text-gray-700';
  closeBtn.innerHTML = '✕';
  closeBtn.onclick = () => msgDiv.remove();
  
  msgDiv.appendChild(closeBtn);
  msgDiv.appendChild(title);
  msgDiv.appendChild(content);
  
  document.body.appendChild(msgDiv);
  
  // 10초 후 자동 제거
  setTimeout(() => {
    if (msgDiv.parentNode) {
      msgDiv.remove();
    }
  }, 10000);
}

// Save data to localStorage
// Update scienceReports for teacher dashboard
function updateScienceReports() {
  if (!studentInfo.studentId || !studentInfo.studentName) {
    return;
  }
  
  // Load existing scienceReports
  const existingReports = JSON.parse(localStorage.getItem(SCIENCE_REPORTS_KEY) || '{}');
  
  // Create student key
  const studentKey = `${studentInfo.studentId}|${studentInfo.studentName}`;
  
  // Build steps object (only non-empty steps)
  const steps = {};
  for (let i = 1; i <= 9; i++) {
    const stepContent = reportData[i] || '';
    if (stepContent.trim()) {
      steps[i] = stepContent.trim();
    }
  }
  
  // Update or create student entry
  existingReports[studentKey] = {
    studentId: studentInfo.studentId,
    studentName: studentInfo.studentName,
    updatedAt: new Date().toISOString(),
    steps: steps
  };
  
  // Save back to localStorage
  localStorage.setItem(SCIENCE_REPORTS_KEY, JSON.stringify(existingReports));
}

function saveData() {
  if (Object.keys(reportData).length > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reportData));
    
    // 교사용 대시보드를 위해 학생별 데이터도 저장
    if (studentInfo.studentId && studentInfo.studentName) {
      const studentKey = `student-${studentInfo.studentId}-${studentInfo.studentName}`;
      const studentData = {
        studentId: studentInfo.studentId,
        studentName: studentInfo.studentName,
        reportData: reportData,
        step6Data: step6Data,
        lastUpdated: new Date().toISOString()
      };
      localStorage.setItem(studentKey, JSON.stringify(studentData));
      
      // Update scienceReports
      updateScienceReports();
    }
  }
}

// Save chat history to localStorage
function saveChatHistory() {
  if (Object.keys(chatHistory).length > 0) {
    localStorage.setItem('chat-history', JSON.stringify(chatHistory));
  }
}

// Save step 6 data to localStorage
function saveStep6Data() {
  localStorage.setItem('step6-data', JSON.stringify(step6Data));
}

// Student Info Input Banner
function createStudentInfoBanner() {
  const banner = document.createElement('div');
  banner.id = 'student-info-banner';
  banner.className = 'w-full py-2 px-4 bg-blue-50 border-b border-blue-200';
  
  const container = document.createElement('div');
  container.className = 'container mx-auto flex items-center justify-between flex-wrap gap-2';
  
  const leftDiv = document.createElement('div');
  leftDiv.className = 'flex items-center gap-3 flex-wrap';
  
  const label = document.createElement('span');
  label.className = 'text-sm font-medium text-gray-700';
  label.textContent = '👤 학생 정보:';
  
  const studentIdInput = document.createElement('input');
  studentIdInput.type = 'text';
  studentIdInput.placeholder = '학생 ID';
  studentIdInput.value = studentInfo.studentId || '';
  studentIdInput.className = 'px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  studentIdInput.style.minWidth = '120px';
  
  const studentNameInput = document.createElement('input');
  studentNameInput.type = 'text';
  studentNameInput.placeholder = '학생 이름';
  studentNameInput.value = studentInfo.studentName || '';
  studentNameInput.className = 'px-3 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  studentNameInput.style.minWidth = '120px';
  
  const saveButton = document.createElement('button');
  saveButton.className = 'px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors';
  saveButton.textContent = '💾 저장';
  
  saveButton.addEventListener('click', () => {
    studentInfo.studentId = studentIdInput.value.trim();
    studentInfo.studentName = studentNameInput.value.trim();
    saveStudentInfo();
    
    // 저장 성공 메시지
    const originalText = saveButton.textContent;
    saveButton.textContent = '✓ 저장됨';
    saveButton.style.backgroundColor = '#16a34a';
    setTimeout(() => {
      saveButton.textContent = originalText;
      saveButton.style.backgroundColor = '';
    }, 2000);
  });
  
  leftDiv.appendChild(label);
  leftDiv.appendChild(studentIdInput);
  leftDiv.appendChild(studentNameInput);
  leftDiv.appendChild(saveButton);
  
  container.appendChild(leftDiv);
  banner.appendChild(container);
  
  return banner;
}

// API Key Status Banner (신호등 아이콘 + 텍스트 표시)
function createAPIStatusBanner() {
  const banner = document.createElement('div');
  banner.id = 'api-status-banner';
  banner.className = 'w-full py-2 px-4';
  
  const container = document.createElement('div');
  container.className = 'container mx-auto flex items-center justify-end gap-2';
  
  const statusIcon = document.createElement('span');
  statusIcon.className = 'text-2xl';
  statusIcon.id = 'api-status-icon';
  
  const statusText = document.createElement('span');
  statusText.className = 'font-medium text-sm';
  statusText.id = 'api-status-text';
  
  container.appendChild(statusIcon);
  container.appendChild(statusText);
  banner.appendChild(container);
  
  updateAPIStatusBanner(banner, statusIcon, statusText);
  
  return banner;
}

function updateAPIStatusBanner(banner, statusIcon, statusText) {
  if (!banner) {
    banner = document.getElementById('api-status-banner');
    if (!banner) return;
    statusIcon = document.getElementById('api-status-icon');
    statusText = document.getElementById('api-status-text');
  }
  
  if (!statusIcon || !statusText) return;
  
  let icon, text;
  
  switch (apiStatus) {
    case 'testing':
      icon = '🟡'; // 노란불 (테스트 중)
      text = 'API Key Testing...';
      break;
    case 'valid':
      icon = '🟢'; // 초록불 (정상 작동)
      text = 'API Key Activated';
      break;
    case 'invalid':
      icon = '🔴'; // 빨간불 (오류)
      text = 'API Key Inactive';
      break;
    default:
      icon = '🔴'; // 빨간불 (미설정)
      text = 'API Key Inactive';
  }
  
  statusIcon.textContent = icon;
  statusText.textContent = text;
  statusIcon.title = apiStatus === 'valid' ? 'API Key Active' : 'API Key Inactive';
}

// Auto Test API Key (자동 테스트)
async function autoTestAPIKey() {
  const apiKeyToUse = apiKey || import.meta.env.VITE_OPENAI_API_KEY || '';
  
  if (!apiKeyToUse || apiKeyToUse.trim() === '') {
    apiStatus = 'invalid';
    updateAPIStatusBanner();
    return;
  }
  
  apiStatus = 'testing';
  updateAPIStatusBanner();
  
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKeyToUse}`
      }
    });
    
    if (response.ok) {
      apiStatus = 'valid';
      localStorage.setItem(API_STATUS_STORAGE_KEY, 'valid');
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error('API Test Error:', errorData);
      apiStatus = 'invalid';
      localStorage.setItem(API_STATUS_STORAGE_KEY, 'invalid');
    }
  } catch (err) {
    console.error('API Test Error:', err);
    apiStatus = 'invalid';
    localStorage.setItem(API_STATUS_STORAGE_KEY, 'invalid');
  }
  
  updateAPIStatusBanner();
}

// Show API Key Settings Modal
function showAPIKeySettings() {
  const modal = document.createElement('div');
  modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
  modal.id = 'api-key-modal';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'bg-white rounded-lg shadow-xl max-w-md w-full p-6';
  
  const title = document.createElement('h2');
  title.className = 'text-2xl font-bold text-gray-800 mb-4';
  title.textContent = 'OpenAI API 키 설정';
  
  const description = document.createElement('p');
  description.className = 'text-sm text-gray-600 mb-4';
  description.textContent = 'OpenAI API 키를 입력하세요. API 키는 브라우저에 저장되며 서버로 전송되지 않습니다.';
  
  const inputGroup = document.createElement('div');
  inputGroup.className = 'mb-4';
  
  const label = document.createElement('label');
  label.className = 'block text-sm font-medium text-gray-700 mb-2';
  label.textContent = 'API 키';
  
  const input = document.createElement('input');
  input.type = 'password';
  input.className = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  input.placeholder = 'sk-...';
  input.value = apiKey;
  
  const toggleButton = document.createElement('button');
  toggleButton.type = 'button';
  toggleButton.className = 'mt-2 text-sm text-blue-600 hover:text-blue-700';
  toggleButton.textContent = '👁️ 표시/숨기기';
  toggleButton.addEventListener('click', () => {
    input.type = input.type === 'password' ? 'text' : 'password';
  });
  
  inputGroup.appendChild(label);
  inputGroup.appendChild(input);
  inputGroup.appendChild(toggleButton);
  
  const buttonGroup = document.createElement('div');
  buttonGroup.className = 'flex gap-2 justify-end';
  
  const cancelButton = document.createElement('button');
  cancelButton.className = 'px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors';
  cancelButton.textContent = '취소';
  cancelButton.addEventListener('click', () => {
    modal.remove();
  });
  
  const saveButton = document.createElement('button');
  saveButton.className = 'px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors';
  saveButton.textContent = '저장';
  saveButton.addEventListener('click', () => {
    const newApiKey = input.value.trim();
    if (newApiKey) {
      apiKey = newApiKey;
      localStorage.setItem(API_KEY_STORAGE_KEY, newApiKey);
      apiStatus = 'unknown';
      localStorage.removeItem(API_STATUS_STORAGE_KEY);
      updateAPIStatusBanner();
      modal.remove();
      alert('API 키가 저장되었습니다. 테스트 버튼을 클릭하여 확인해주세요.');
    } else {
      alert('API 키를 입력해주세요.');
    }
  });
  
  buttonGroup.appendChild(cancelButton);
  buttonGroup.appendChild(saveButton);
  
  modalContent.appendChild(title);
  modalContent.appendChild(description);
  modalContent.appendChild(inputGroup);
  modalContent.appendChild(buttonGroup);
  
  modal.appendChild(modalContent);
  
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
  
  document.body.appendChild(modal);
  
  // Focus on input
  setTimeout(() => input.focus(), 100);
}

// Header Component
function createHeader() {
  const header = document.createElement('header');
  header.className = 'bg-gradient-to-r from-blue-600 to-purple-600 text-white py-6 shadow-lg relative';
  
  const container = document.createElement('div');
  container.className = 'container mx-auto px-4';
  
  const h1 = document.createElement('h1');
  h1.className = 'text-3xl font-bold text-center flex items-center justify-center gap-2';
  h1.innerHTML = '<span>🔬</span> 과학 탐구 보고서 도우미';
  
  const p = document.createElement('p');
  p.className = 'text-center mt-2 text-blue-100';
  p.textContent = '나만의 과학자 포트폴리오 만들기';
  
  container.appendChild(h1);
  container.appendChild(p);
  header.appendChild(container);
  
  return header;
}

// StepProgress Component
function createStepProgress() {
  const div = document.createElement('div');
  div.className = 'bg-white rounded-lg shadow-md p-4 mb-6';
  
  const h2 = document.createElement('h2');
  h2.className = 'text-xl font-semibold mb-4 text-gray-800';
  h2.textContent = '진행 상황';
  
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'progress-container flex flex-wrap gap-2';
  
  stepGuides.forEach((step) => {
    const button = document.createElement('button');
    button.className = `px-4 py-2 rounded-lg text-sm font-medium transition-all ${getStepColor(step.id)}`;
    button.innerHTML = `${step.icon || '📝'} ${step.id}. ${step.title}`;
    button.addEventListener('click', () => handleStepChange(step.id));
    buttonContainer.appendChild(button);
  });
  
  div.appendChild(h2);
  div.appendChild(buttonContainer);
  
  return div;
}

function getStepColor(stepId) {
  if (stepId === currentStep) {
    return 'bg-blue-600 text-white shadow-md scale-105';
  }
  
  const content = reportData[stepId] || '';
  const contentLength = content.trim().length;
  
  if (contentLength >= 10) {
    return 'bg-green-500 text-white hover:bg-green-600';
  } else {
    return 'bg-gray-200 text-gray-700 hover:bg-gray-300';
  }
}

// StepCard Component
function createStepCard() {
  const currentStepData = stepGuides.find((step) => step.id === currentStep);
  const currentContent = reportData[currentStep] || '';
  
  const div = document.createElement('div');
  div.className = 'bg-white rounded-lg shadow-md p-6 mb-6';
  
  const headerDiv = document.createElement('div');
  headerDiv.className = 'mb-4';
  
  const h2 = document.createElement('h2');
  h2.className = 'text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2';
  h2.innerHTML = `<span>${currentStepData.icon || '📝'}</span> ${currentStepData.id}. ${currentStepData.title}`;
  
  const p1 = document.createElement('p');
  p1.className = 'text-gray-600 mb-2';
  p1.textContent = currentStepData.description;
  
  const guideDiv = document.createElement('div');
  guideDiv.className = 'bg-blue-50 border-l-4 border-blue-500 p-3 rounded mb-3';
  const guideP = document.createElement('p');
  guideP.className = 'text-sm text-gray-700';
  guideP.innerHTML = `<span class="font-semibold">💡 가이드:</span> ${currentStepData.guide}`;
  guideDiv.appendChild(guideP);
  
  headerDiv.appendChild(h2);
  headerDiv.appendChild(p1);
  headerDiv.appendChild(guideDiv);
  
  if (currentStepData.prompts && currentStepData.prompts.length > 0) {
    const promptsDiv = document.createElement('div');
    promptsDiv.className = 'bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded';
    const promptsP = document.createElement('p');
    promptsP.className = 'text-sm font-semibold text-gray-800 mb-2';
    promptsP.textContent = '💭 작성 시 고려할 질문:';
    const ul = document.createElement('ul');
    ul.className = 'text-sm text-gray-700 space-y-1 list-disc list-inside';
    currentStepData.prompts.forEach((prompt) => {
      const li = document.createElement('li');
      li.textContent = prompt;
      ul.appendChild(li);
    });
    promptsDiv.appendChild(promptsP);
    promptsDiv.appendChild(ul);
    headerDiv.appendChild(promptsDiv);
  }
  
  div.appendChild(headerDiv);
  
  // 6번 단계(결과 정리)일 때 특별한 UI 표시
  if (currentStep === 6) {
    div.appendChild(createStep6SpecialUI());
  } else {
    // 일반 단계는 textarea 사용
    const textarea = document.createElement('textarea');
    textarea.value = currentContent;
    textarea.placeholder = currentStepData.placeholder;
    textarea.className = 'w-full h-48 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none';
    textarea.setAttribute('data-step-textarea', currentStep);
    
    // textarea 아래 컨테이너 (글자수 왼쪽, 저장 버튼 오른쪽)
    const bottomContainer = document.createElement('div');
    bottomContainer.className = 'flex items-center justify-between mt-2';
    
    // 글자수 (왼쪽)
    const charCount = document.createElement('p');
    charCount.className = 'text-sm text-gray-500 char-count-display';
    charCount.textContent = `글자 수: ${currentContent.length}`;
    
    // 저장 버튼 (오른쪽)
    const saveBtn = document.createElement('button');
    saveBtn.id = 'saveBtn';
    saveBtn.className = 'px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors';
    saveBtn.textContent = '💾 저장';
    saveBtn.addEventListener('click', submitAnswer);
    
    textarea.addEventListener('input', (e) => {
      const value = e.target.value;
      handleContentChange(value);
      charCount.textContent = `글자 수: ${value.length}`;
      updateAIAssistantButton();
    });
    
    bottomContainer.appendChild(charCount);
    bottomContainer.appendChild(saveBtn);
    
    div.appendChild(textarea);
    div.appendChild(bottomContainer);
  }
  
  return div;
}

// Step 6 Special UI (표 편집기, 그림판, 그래프)
function createStep6SpecialUI() {
  const container = document.createElement('div');
  container.className = 'space-y-6';
  
  // 탭 메뉴
  const tabContainer = document.createElement('div');
  tabContainer.className = 'border-b border-gray-200 mb-4';
  const tabList = document.createElement('div');
  tabList.className = 'flex gap-2';
  
  const tabs = [
    { id: 'text', label: '📝 텍스트', icon: '📝' },
    { id: 'drawing', label: '✏️ 그림판', icon: '✏️' },
    { id: 'table', label: '📊 표 편집', icon: '📊' },
    { id: 'graph', label: '📈 그래프', icon: '📈' }
  ];
  
  let activeTab = 'text';
  
  tabs.forEach(tab => {
    const tabButton = document.createElement('button');
    tabButton.className = `px-4 py-2 rounded-t-lg transition-colors ${activeTab === tab.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`;
    tabButton.textContent = tab.label;
    tabButton.addEventListener('click', () => {
      activeTab = tab.id;
      renderStep6Tabs();
    });
    tabList.appendChild(tabButton);
  });
  
  tabContainer.appendChild(tabList);
  container.appendChild(tabContainer);
  
  // 콘텐츠 영역
  const contentArea = document.createElement('div');
  contentArea.id = 'step6-content-area';
  container.appendChild(contentArea);
  
  function renderStep6Tabs() {
    contentArea.innerHTML = '';
    
    // 탭 버튼 상태 업데이트
    tabList.querySelectorAll('button').forEach((btn, idx) => {
      if (tabs[idx].id === activeTab) {
        btn.className = 'px-4 py-2 rounded-t-lg transition-colors bg-blue-600 text-white';
      } else {
        btn.className = 'px-4 py-2 rounded-t-lg transition-colors bg-gray-100 text-gray-700 hover:bg-gray-200';
      }
    });
    
    switch(activeTab) {
      case 'text':
        contentArea.appendChild(createStep6TextEditor());
        break;
      case 'table':
        contentArea.appendChild(createStep6TableEditor());
        break;
      case 'drawing':
        contentArea.appendChild(createStep6DrawingBoard());
        break;
      case 'graph':
        contentArea.appendChild(createStep6GraphViewer());
        break;
    }
  }
  
  // 초기 렌더링
  renderStep6Tabs();
  
  return container;
}

// Step 6 텍스트 에디터
function createStep6TextEditor() {
  const div = document.createElement('div');
  const textarea = document.createElement('textarea');
  textarea.value = reportData[6] || '';
  textarea.placeholder = '텍스트로 결과를 정리하세요...';
  textarea.className = 'w-full h-48 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none';
  textarea.setAttribute('data-step-textarea', '6');
  
  // textarea 아래 컨테이너 (글자수 왼쪽, 저장 버튼 오른쪽)
  const bottomContainer = document.createElement('div');
  bottomContainer.className = 'flex items-center justify-between mt-2';
  
  // 글자수 (왼쪽)
  const charCount = document.createElement('p');
  charCount.className = 'text-sm text-gray-500';
  charCount.textContent = `글자 수: ${textarea.value.length}`;
  
  // 저장 버튼 (오른쪽)
  const saveBtn = document.createElement('button');
  saveBtn.id = 'saveBtn';
  saveBtn.className = 'px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors';
  saveBtn.textContent = '💾 저장';
  saveBtn.addEventListener('click', submitAnswer);
  
  textarea.addEventListener('input', (e) => {
    const value = e.target.value;
    handleContentChange(value);
    charCount.textContent = `글자 수: ${value.length}`;
    updateAIAssistantButton();
  });
  
  bottomContainer.appendChild(charCount);
  bottomContainer.appendChild(saveBtn);
  
  div.appendChild(textarea);
  div.appendChild(bottomContainer);
  return div;
}

// Step 6 표 편집기 (초등학생용 쉬운 표)
function createStep6TableEditor() {
  const div = document.createElement('div');
  div.className = 'space-y-4';
  
  // 도구 모음
  const toolbar = document.createElement('div');
  toolbar.className = 'flex gap-2 mb-4 flex-wrap';
  
  const addRowBtn = document.createElement('button');
  addRowBtn.className = 'step6-btn step6-btn-add-row';
  addRowBtn.textContent = '➕ 행 추가';
  addRowBtn.addEventListener('click', () => {
    if (step6Data.tableData.length === 0) {
      step6Data.tableData = [['', '']];
      step6Data.rowLabels = ['1회'];
    } else {
      const colCount = step6Data.tableData[0].length;
      step6Data.tableData.push(new Array(colCount).fill(''));
      step6Data.rowLabels.push(`${step6Data.tableData.length}회`);
    }
    saveStep6Data();
    renderTable();
  });
  
  const addColBtn = document.createElement('button');
  addColBtn.className = 'step6-btn step6-btn-add-col';
  addColBtn.textContent = '➕ 열 추가';
  addColBtn.addEventListener('click', () => {
    if (step6Data.tableData.length === 0) {
      step6Data.tableData = [['', '']];
      step6Data.headerLabels = ['항목 1', '항목 2'];
    } else {
      step6Data.tableData.forEach(row => row.push(''));
      step6Data.headerLabels.push(`항목 ${step6Data.headerLabels.length + 1}`);
    }
    saveStep6Data();
    renderTable();
  });
  
  const delRowBtn = document.createElement('button');
  delRowBtn.className = 'step6-btn step6-btn-del-row';
  delRowBtn.textContent = '➖ 행 삭제';
  delRowBtn.addEventListener('click', () => {
    if (step6Data.tableData.length > 1) {
      step6Data.tableData.pop();
      step6Data.rowLabels.pop();
      saveStep6Data();
      renderTable();
    }
  });
  
  const delColBtn = document.createElement('button');
  delColBtn.className = 'step6-btn step6-btn-del-col';
  delColBtn.textContent = '➖ 열 삭제';
  delColBtn.addEventListener('click', () => {
    if (step6Data.tableData.length > 0 && step6Data.tableData[0].length > 1) {
      step6Data.tableData.forEach(row => row.pop());
      step6Data.headerLabels.pop();
      saveStep6Data();
      renderTable();
    }
  });
  
  const clearBtn = document.createElement('button');
  clearBtn.className = 'step6-btn step6-btn-clear';
  clearBtn.textContent = '🗑️ 비우기';
  clearBtn.addEventListener('click', () => {
    if (confirm('표의 모든 내용을 지우시겠습니까?')) {
      step6Data.tableData.forEach((row, rowIdx) => {
        row.forEach((cell, colIdx) => {
          step6Data.tableData[rowIdx][colIdx] = '';
        });
      });
      saveStep6Data();
      renderTable();
    }
  });
  
  toolbar.appendChild(addRowBtn);
  toolbar.appendChild(addColBtn);
  toolbar.appendChild(delRowBtn);
  toolbar.appendChild(delColBtn);
  toolbar.appendChild(clearBtn);
  
  // 표 영역 (스크롤 가능)
  const tableContainer = document.createElement('div');
  tableContainer.className = 'step6-table-wrapper';
  tableContainer.id = 'step6-table-container';
  
  function renderTable() {
    tableContainer.innerHTML = '';
    
    if (step6Data.tableData.length === 0) {
      step6Data.tableData = [['', ''], ['', '']];
      step6Data.headerLabels = ['항목 1', '항목 2'];
      step6Data.rowLabels = ['1회', '2회'];
      saveStep6Data();
    }
    
    const table = document.createElement('table');
    table.className = 'step6-easy-table';
    
    // 헤더 행 생성
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // 왼쪽 첫 열 (빈 헤더)
    const emptyHeader = document.createElement('th');
    emptyHeader.className = 'step6-row-label sticky-left';
    emptyHeader.textContent = '';
    headerRow.appendChild(emptyHeader);
    
    // 항목 헤더들 (편집 가능)
    const colCount = step6Data.tableData[0] ? step6Data.tableData[0].length : 2;
    
    // headerLabels 초기화 (없으면 기본값 생성)
    if (!step6Data.headerLabels || step6Data.headerLabels.length !== colCount) {
      step6Data.headerLabels = [];
      for (let i = 0; i < colCount; i++) {
        step6Data.headerLabels.push(`항목 ${i + 1}`);
      }
      saveStep6Data();
    }
    
    for (let colIdx = 0; colIdx < colCount; colIdx++) {
      const th = document.createElement('th');
      th.className = 'step6-header sticky-top';
      
      const headerInput = document.createElement('input');
      headerInput.type = 'text';
      headerInput.value = step6Data.headerLabels[colIdx] || `항목 ${colIdx + 1}`;
      headerInput.className = 'step6-header-input';
      headerInput.setAttribute('data-col', colIdx);
      
      headerInput.addEventListener('input', (e) => {
        const col = parseInt(e.target.getAttribute('data-col'));
        step6Data.headerLabels[col] = e.target.value;
        saveStep6Data();
      });
      
      // Enter 키로 다음 헤더로 이동
      headerInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const headerInputs = Array.from(tableContainer.querySelectorAll('.step6-header-input'));
          const currentIndex = headerInputs.indexOf(headerInput);
          if (currentIndex < headerInputs.length - 1) {
            headerInputs[currentIndex + 1].focus();
          } else {
            // 마지막 헤더면 첫 번째 데이터 셀로
            const firstDataInput = tableContainer.querySelector('.step6-input[data-row="0"][data-col="0"]');
            if (firstDataInput) {
              firstDataInput.focus();
            }
          }
        }
      });
      
      th.appendChild(headerInput);
      headerRow.appendChild(th);
    }
    
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // 본문 행들
    const tbody = document.createElement('tbody');
    
    // rowLabels 초기화 (없으면 기본값 생성)
    if (!step6Data.rowLabels || step6Data.rowLabels.length !== step6Data.tableData.length) {
      step6Data.rowLabels = [];
      for (let i = 0; i < step6Data.tableData.length; i++) {
        step6Data.rowLabels.push(`${i + 1}회`);
      }
      saveStep6Data();
    }
    
    step6Data.tableData.forEach((row, rowIdx) => {
      const tr = document.createElement('tr');
      
      // 왼쪽 첫 열 (회차 라벨 - 편집 가능)
      const rowLabel = document.createElement('td');
      rowLabel.className = 'step6-row-label sticky-left';
      
      const rowLabelInput = document.createElement('input');
      rowLabelInput.type = 'text';
      rowLabelInput.value = step6Data.rowLabels[rowIdx] || `${rowIdx + 1}회`;
      rowLabelInput.className = 'step6-row-label-input';
      rowLabelInput.setAttribute('data-row', rowIdx);
      
      rowLabelInput.addEventListener('input', (e) => {
        const row = parseInt(e.target.getAttribute('data-row'));
        step6Data.rowLabels[row] = e.target.value;
        saveStep6Data();
      });
      
      // Enter 키로 다음 행 라벨로 이동
      rowLabelInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const rowLabelInputs = Array.from(tableContainer.querySelectorAll('.step6-row-label-input'));
          const currentIndex = rowLabelInputs.indexOf(rowLabelInput);
          if (currentIndex < rowLabelInputs.length - 1) {
            rowLabelInputs[currentIndex + 1].focus();
          } else {
            // 마지막 행 라벨이면 첫 번째 데이터 셀으로
            const firstDataInput = tableContainer.querySelector('.step6-input[data-row="0"][data-col="0"]');
            if (firstDataInput) {
              firstDataInput.focus();
            }
          }
        }
      });
      
      rowLabel.appendChild(rowLabelInput);
      tr.appendChild(rowLabel);
      
      // 데이터 셀들 (첫 번째 열부터 표시)
      row.forEach((cell, colIdx) => {
        const td = document.createElement('td');
        td.className = 'step6-cell';
        const input = document.createElement('input');
        input.type = 'text';
        input.value = cell;
        input.placeholder = '입력';
        input.className = 'step6-input';
        input.setAttribute('data-row', rowIdx);
        input.setAttribute('data-col', colIdx);
        
        // 입력 이벤트
        input.addEventListener('input', (e) => {
          const row = parseInt(e.target.getAttribute('data-row'));
          const col = parseInt(e.target.getAttribute('data-col'));
          step6Data.tableData[row][col] = e.target.value;
          saveStep6Data();
        });
        
        // Enter 키로 다음 칸 이동
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const inputs = Array.from(tableContainer.querySelectorAll('.step6-input'));
            const currentIndex = inputs.indexOf(input);
            if (currentIndex < inputs.length - 1) {
              inputs[currentIndex + 1].focus();
            } else {
              // 마지막 칸이면 다음 행 첫 칸으로
              const nextRowInput = tableContainer.querySelector(`.step6-input[data-row="${rowIdx + 1}"][data-col="0"]`);
              if (nextRowInput) {
                nextRowInput.focus();
              }
            }
          }
        });
        
        td.appendChild(input);
        tr.appendChild(td);
      });
      
      tbody.appendChild(tr);
    });
    
    table.appendChild(tbody);
    tableContainer.appendChild(table);
  }
  
  renderTable();
  
  div.appendChild(toolbar);
  div.appendChild(tableContainer);
  
  return div;
}

// Step 6 그림판
function createStep6DrawingBoard() {
  const div = document.createElement('div');
  div.className = 'space-y-4';
  
  // 도구 모음
  const toolbar = document.createElement('div');
  toolbar.className = 'flex gap-2 mb-4 flex-wrap items-center';
  
  let currentTool = 'pen';
  let currentColor = '#000000';
  let currentSize = 3;
  
  const tools = [
    { id: 'pen', label: '✏️ 연필' },
    { id: 'highlighter', label: '🖍️ 형광펜' },
    { id: 'eraser', label: '🧹 지우개' }
  ];
  
  tools.forEach(tool => {
    const toolBtn = document.createElement('button');
    toolBtn.className = `px-4 py-2 rounded-lg transition-colors ${currentTool === tool.id ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;
    toolBtn.textContent = tool.label;
    toolBtn.setAttribute('data-tool', tool.id);
    toolBtn.addEventListener('click', () => {
      currentTool = tool.id;
      tools.forEach(t => {
        const btn = toolbar.querySelector(`[data-tool="${t.id}"]`);
        if (btn) {
          if (t.id === currentTool) {
            btn.className = 'px-4 py-2 rounded-lg transition-colors bg-blue-600 text-white';
          } else {
            btn.className = 'px-4 py-2 rounded-lg transition-colors bg-gray-200 text-gray-700 hover:bg-gray-300';
          }
        }
      });
    });
    toolbar.appendChild(toolBtn);
  });
  
  const colorLabel = document.createElement('span');
  colorLabel.className = 'ml-4 font-semibold text-gray-700';
  colorLabel.textContent = '색상:';
  
  const colorInput = document.createElement('input');
  colorInput.type = 'color';
  colorInput.value = currentColor;
  colorInput.className = 'ml-2 w-12 h-8 border border-gray-300 rounded';
  colorInput.addEventListener('change', (e) => {
    currentColor = e.target.value;
  });
  
  const sizeLabel = document.createElement('span');
  sizeLabel.className = 'ml-4 font-semibold text-gray-700';
  sizeLabel.textContent = '크기:';
  
  const sizeInput = document.createElement('input');
  sizeInput.type = 'range';
  sizeInput.min = '1';
  sizeInput.max = '20';
  sizeInput.value = currentSize;
  sizeInput.className = 'ml-2';
  const sizeValue = document.createElement('span');
  sizeValue.className = 'ml-2 text-gray-700';
  sizeValue.textContent = currentSize;
  sizeInput.addEventListener('input', (e) => {
    currentSize = parseInt(e.target.value);
    sizeValue.textContent = currentSize;
  });
  
  const clearBtn = document.createElement('button');
  clearBtn.className = 'ml-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors';
  clearBtn.textContent = '🗑️ 전체 지우기';
  
  toolbar.appendChild(colorLabel);
  toolbar.appendChild(colorInput);
  toolbar.appendChild(sizeLabel);
  toolbar.appendChild(sizeInput);
  toolbar.appendChild(sizeValue);
  toolbar.appendChild(clearBtn);
  
  // 캔버스
  const canvasContainer = document.createElement('div');
  canvasContainer.className = 'border border-gray-300 rounded-lg p-4 bg-white';
  
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 500;
  canvas.className = 'border border-gray-200 rounded cursor-crosshair';
  canvas.style.display = 'block';
  canvas.style.maxWidth = '100%';
  canvas.style.height = 'auto';
  
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // 저장된 이미지가 있으면 로드
  if (step6Data.canvasImage) {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
    };
    img.src = step6Data.canvasImage;
  }
  
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  
  function startDrawing(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;
  }
  
  function draw(e) {
    if (!isDrawing) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    
    if (currentTool === 'pen') {
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = currentSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else if (currentTool === 'highlighter') {
      ctx.strokeStyle = currentColor + '80';
      ctx.lineWidth = currentSize * 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } else if (currentTool === 'eraser') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = currentSize * 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
    
    ctx.stroke();
    
    lastX = x;
    lastY = y;
    
    step6Data.canvasImage = canvas.toDataURL();
    saveStep6Data();
  }
  
  function stopDrawing() {
    isDrawing = false;
  }
  
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);
  
  clearBtn.addEventListener('click', () => {
    if (confirm('전체 그림을 지우시겠습니까?')) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      step6Data.canvasImage = canvas.toDataURL();
      saveStep6Data();
    }
  });
  
  canvasContainer.appendChild(canvas);
  
  div.appendChild(toolbar);
  div.appendChild(canvasContainer);
  
  return div;
}

// Step 6 그래프 뷰어
function createStep6GraphViewer() {
  const div = document.createElement('div');
  div.className = 'space-y-4';
  
  // 그래프 타입 선택
  const controlPanel = document.createElement('div');
  controlPanel.className = 'bg-gray-50 p-4 rounded-lg mb-4';
  
  const typeLabel = document.createElement('label');
  typeLabel.className = 'block font-semibold text-gray-700 mb-2';
  typeLabel.textContent = '그래프 타입:';
  
  const typeSelect = document.createElement('select');
  typeSelect.className = 'w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500';
  typeSelect.innerHTML = `
    <option value="bar">막대 그래프</option>
    <option value="line">꺾은선 그래프</option>
    <option value="pie">원 그래프</option>
  `;
  typeSelect.value = step6Data.graphType || 'bar';
  
  typeSelect.addEventListener('change', (e) => {
    step6Data.graphType = e.target.value;
    saveStep6Data();
    renderGraph();
  });
  
  const generateBtn = document.createElement('button');
  generateBtn.className = 'mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors';
  generateBtn.textContent = '📊 표 데이터로 그래프 생성';
  generateBtn.addEventListener('click', () => {
    if (step6Data.tableData.length < 2) {
      alert('표에 데이터를 입력한 후 그래프를 생성해주세요.');
      return;
    }
    generateGraphFromTable();
    renderGraph();
  });
  
  controlPanel.appendChild(typeLabel);
  controlPanel.appendChild(typeSelect);
  controlPanel.appendChild(generateBtn);
  
  // 그래프 캔버스
  const graphContainer = document.createElement('div');
  graphContainer.className = 'border border-gray-300 rounded-lg p-4 bg-white';
  graphContainer.id = 'step6-graph-container';
  
  function generateGraphFromTable() {
    const table = step6Data.tableData;
    if (table.length < 2) return;
    
    // headerLabels 사용 (없으면 기본값)
    const headers = step6Data.headerLabels && step6Data.headerLabels.length > 0 
      ? step6Data.headerLabels 
      : table[0].map((_, idx) => `항목 ${idx + 1}`);
    const dataRows = table;
    
    step6Data.graphData = {
      labels: headers,
      datasets: []
    };
    
    dataRows.forEach((row, idx) => {
      const values = row.map(cell => {
        const num = parseFloat(cell);
        return isNaN(num) ? 0 : num;
      });
      
      // rowLabels 사용 (없으면 기본값)
      const rowLabel = step6Data.rowLabels && step6Data.rowLabels[idx] 
        ? step6Data.rowLabels[idx] 
        : `데이터 ${idx + 1}`;
      
      step6Data.graphData.datasets.push({
        label: rowLabel,
        data: values
      });
    });
    
    saveStep6Data();
  }
  
  function renderGraph() {
    graphContainer.innerHTML = '';
    
    if (!step6Data.graphData) {
      const message = document.createElement('p');
      message.className = 'text-gray-500 text-center py-8';
      message.textContent = '표 데이터로 그래프를 생성해주세요.';
      graphContainer.appendChild(message);
      return;
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 500;
    canvas.className = 'w-full';
    canvas.style.maxWidth = '100%';
    canvas.style.height = 'auto';
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    const padding = 60;
    const graphWidth = width - padding * 2;
    const graphHeight = height - padding * 2;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    const { labels, datasets } = step6Data.graphData;
    const maxValue = Math.max(...datasets.flatMap(d => d.data), 1);
    
    if (step6Data.graphType === 'bar') {
      const barWidth = graphWidth / (labels.length * datasets.length + datasets.length);
      let xPos = padding;
      
      datasets.forEach((dataset, datasetIdx) => {
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
        const color = colors[datasetIdx % colors.length];
        
        dataset.data.forEach((value, idx) => {
          const barHeight = (value / maxValue) * graphHeight;
          const x = xPos + idx * (barWidth * datasets.length + barWidth);
          const y = height - padding - barHeight;
          
          ctx.fillStyle = color;
          ctx.fillRect(x, y, barWidth, barHeight);
          
          ctx.fillStyle = '#000000';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(value.toString(), x + barWidth / 2, y - 5);
        });
        
        xPos += barWidth;
      });
      
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      labels.forEach((label, idx) => {
        const x = padding + idx * (barWidth * datasets.length + barWidth) + (barWidth * datasets.length) / 2;
        ctx.fillText(label, x, height - padding + 20);
      });
      
    } else if (step6Data.graphType === 'line') {
      const stepX = graphWidth / (labels.length - 1 || 1);
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
      
      datasets.forEach((dataset, datasetIdx) => {
        const color = colors[datasetIdx % colors.length];
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        
        // 먼저 선을 그림
        ctx.beginPath();
        dataset.data.forEach((value, idx) => {
          const x = padding + idx * stepX;
          const y = height - padding - (value / maxValue) * graphHeight;
          
          if (idx === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
        
        // 그 다음 점들을 그림
        ctx.fillStyle = color;
        dataset.data.forEach((value, idx) => {
          const x = padding + idx * stepX;
          const y = height - padding - (value / maxValue) * graphHeight;
          
          ctx.beginPath();
          ctx.arc(x, y, 4, 0, Math.PI * 2);
          ctx.fill();
        });
      });
      
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      labels.forEach((label, idx) => {
        const x = padding + idx * stepX;
        ctx.fillText(label, x, height - padding + 20);
      });
      
    } else if (step6Data.graphType === 'pie') {
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(graphWidth, graphHeight) / 2 - 20;
      
      const total = datasets[0].data.reduce((sum, val) => sum + val, 0);
      let currentAngle = -Math.PI / 2;
      
      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
      
      datasets[0].data.forEach((value, idx) => {
        const sliceAngle = (value / total) * Math.PI * 2;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = colors[idx % colors.length];
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        const labelAngle = currentAngle + sliceAngle / 2;
        const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
        const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
        
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(labels[idx] || `항목 ${idx + 1}`, labelX, labelY);
        
        const percent = ((value / total) * 100).toFixed(1);
        ctx.font = '10px Arial';
        ctx.fillText(`${percent}%`, labelX, labelY + 15);
        
        currentAngle += sliceAngle;
      });
    }
    
    if (step6Data.graphType !== 'pie') {
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding, padding);
      ctx.lineTo(padding, height - padding);
      ctx.lineTo(width - padding, height - padding);
      ctx.stroke();
      
      ctx.fillStyle = '#666666';
      ctx.font = '10px Arial';
      ctx.textAlign = 'right';
      for (let i = 0; i <= 5; i++) {
        const y = height - padding - (i / 5) * graphHeight;
        const value = (maxValue * (i / 5)).toFixed(1);
        ctx.fillText(value, padding - 10, y + 4);
        ctx.strokeStyle = '#e5e7eb';
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
      }
    }
    
    graphContainer.appendChild(canvas);
  }
  
  renderGraph();
  
  div.appendChild(controlPanel);
  div.appendChild(graphContainer);
  
  return div;
}

// AIAssistant Component
function createAIAssistant() {
  const currentStepData = stepGuides.find((step) => step.id === currentStep);
  const currentContent = reportData[currentStep] || '';
  
  const div = document.createElement('div');
  div.className = 'bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg shadow-md p-6 mb-6';
  
  const headerDiv = document.createElement('div');
  headerDiv.className = 'flex items-center justify-between mb-4';
  
  const h3 = document.createElement('h3');
  h3.className = 'text-xl font-semibold text-gray-800 flex items-center gap-2';
  h3.innerHTML = '<span class="text-2xl">🤖</span> AI 도움 받기';
  
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'flex items-center gap-2';
  
  const button = document.createElement('button');
  button.className = 'px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors';
  button.textContent = 'AI 검토 요청';
  const apiKeyToUse = apiKey || import.meta.env.VITE_OPENAI_API_KEY || '';
  button.disabled = !currentContent.trim() || !apiKeyToUse;
  
  // 대화 기록 초기화 버튼
  const clearButton = document.createElement('button');
  clearButton.className = 'px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm';
  clearButton.textContent = '🗑️ 대화 초기화';
  clearButton.title = '현재 단계의 대화 기록을 초기화합니다';
  clearButton.addEventListener('click', () => {
    if (confirm('현재 단계의 대화 기록을 초기화하시겠습니까?')) {
      if (chatHistory[currentStep]) {
        delete chatHistory[currentStep];
        saveChatHistory();
        aiResponse = '';
        render();
      }
    }
  });
  
  // 대화 기록이 있을 때만 초기화 버튼 표시
  const hasHistory = chatHistory[currentStep] && chatHistory[currentStep].length > 0;
  if (hasHistory) {
    const historyCount = chatHistory[currentStep].length;
    const historyInfo = document.createElement('span');
    historyInfo.className = 'text-sm text-gray-600';
    historyInfo.textContent = `(${Math.floor(historyCount / 2)}회 대화)`;
    buttonContainer.appendChild(historyInfo);
    buttonContainer.appendChild(clearButton);
  }
  
  buttonContainer.appendChild(button);
  
  let isLoading = false;
  let error = null;
  
  button.addEventListener('click', async () => {
    // 실제 textarea에서 최신 값을 가져오기
    const textarea = document.querySelector(`textarea[data-step-textarea="${currentStep}"]`);
    const actualContent = textarea ? textarea.value : (reportData[currentStep] || '');
    
    if (!actualContent.trim()) {
      alert('먼저 내용을 입력해주세요.');
      return;
    }
    
    isLoading = true;
    error = null;
    button.disabled = true;
    button.textContent = '처리 중...';
    
    // Remove error message if exists
    const existingError = div.querySelector('.error-message');
    if (existingError) {
      existingError.remove();
    }
    
    try {
      const apiKeyToUse = apiKey || import.meta.env.VITE_OPENAI_API_KEY || '';
      if (!apiKeyToUse) {
        throw new Error('API 키가 설정되지 않았습니다.');
      }
      
      // API 상태가 unknown이면 자동 테스트
      if (apiStatus === 'unknown' || apiStatus === '') {
        await autoTestAPIKey();
      }
      
      // 현재 단계의 대화 기록 가져오기
      if (!chatHistory[currentStep]) {
        chatHistory[currentStep] = [];
      }
      
      // 시스템 메시지 (처음에만 추가)
      const messages = [];
      if (chatHistory[currentStep].length === 0) {
        messages.push({
          role: 'system',
          content: `너는 초등/중학생을 돕는 친절한 과학탐구 도우미야.

말투는 자연스럽고 짧게. 어려운 용어는 쓰지 말고, 쓰면 바로 뜻을 풀어줘.

답은 항상 6~10문장 이내로.

첫 문장: 공감/칭찬 1문장.
그 다음: 핵심 설명 4~8문장.
마지막: 학생에게 되묻는 질문 1개.

중요:
- 모르면 솔직히 "확실하진 않지만"이라고 말하고, 확인 방법을 제안해.
- 정답만 주지 말고 학생이 스스로 생각하도록 힌트를 줘.
- 주제는 '학교 과학탐구 보고서(탐구주제/가설/변인/실험방법/결과정리/결론)'에 관련된 것만 다뤄.
- 그 외(일상잡담/정치/선정/폭력)는 정중히 거절하고 과학탐구로 다시 유도해.

현재 "${currentStepData.title}" 단계의 내용을 검토하고 개선 제안을 해주세요. 이전 대화 내용을 참고하여 맥락을 유지하며 대화를 이어가세요.`
        });
      }
      
      // 이전 대화 기록 추가 (최근 10개 메시지만 유지하여 토큰 제한 방지)
      const recentHistory = chatHistory[currentStep].slice(-10);
      messages.push(...recentHistory);
      
      // 실제 textarea에서 최신 값을 가져오기
      const textarea = document.querySelector(`textarea[data-step-textarea="${currentStep}"]`);
      const actualContent = textarea ? textarea.value : (reportData[currentStep] || '');
      
      // 현재 사용자 메시지 추가
      const userMessage = currentStepData.aiPrompt 
        ? `${currentStepData.aiPrompt}\n\n작성한 내용:\n${actualContent}`
        : `다음은 "${currentStepData.title}" 단계에 작성한 내용입니다:\n\n${actualContent}\n\n이 내용을 검토하고 개선 제안을 해주세요.`;
      
      messages.push({
        role: 'user',
        content: userMessage
      });
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKeyToUse}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: messages,
          max_tokens: 500
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        let errorMessage = 'API 호출에 실패했습니다.';
        if (errorData.error) {
          errorMessage = `API 오류: ${errorData.error.message || errorData.error.code || '알 수 없는 오류'}`;
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      const aiMessage = data.choices[0].message.content;
      
      // 사용자 메시지를 chatHistory에 추가 (성공한 경우에만)
      chatHistory[currentStep].push({
        role: 'user',
        content: userMessage
      });
      
      // AI 응답을 chatHistory에 추가
      chatHistory[currentStep].push({
        role: 'assistant',
        content: aiMessage
      });
      
      // chatHistory 저장
      saveChatHistory();
      
      handleAIResponse(aiMessage);
      
      // API가 정상 작동하면 상태 업데이트
      if (apiStatus !== 'valid') {
        apiStatus = 'valid';
        localStorage.setItem(API_STATUS_STORAGE_KEY, 'valid');
        updateAPIStatusBanner();
      }
    } catch (err) {
      error = err.message || 'AI 도움을 받을 수 없습니다. API 키를 확인하거나 나중에 다시 시도해주세요.';
      console.error('AI API Error:', err);
      
      // API 오류 시 상태 업데이트
      if (err.message.includes('API 키') || err.message.includes('401') || err.message.includes('403')) {
        apiStatus = 'invalid';
        localStorage.setItem(API_STATUS_STORAGE_KEY, 'invalid');
        updateAPIStatusBanner();
      }
      
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4';
      errorDiv.textContent = error;
      div.insertBefore(errorDiv, headerDiv.nextSibling);
    } finally {
      isLoading = false;
      // 실제 textarea에서 최신 값을 가져와서 버튼 상태 업데이트
      const textarea = document.querySelector(`textarea[data-step-textarea="${currentStep}"]`);
      const actualContent = textarea ? textarea.value : (reportData[currentStep] || '');
      const apiKeyToUse = apiKey || import.meta.env.VITE_OPENAI_API_KEY || '';
      button.disabled = !actualContent.trim() || !apiKeyToUse;
      button.textContent = 'AI 검토 요청';
    }
  });
  
  headerDiv.appendChild(h3);
  headerDiv.appendChild(buttonContainer);
  
  const infoDiv = document.createElement('div');
  infoDiv.className = 'bg-white rounded p-4 border border-purple-200';
  const infoP = document.createElement('p');
  infoP.className = 'text-sm text-gray-600';
  infoP.textContent = '💡 AI가 작성한 내용을 검토하고 개선 제안을 해드립니다. API 키가 설정되어 있어야 합니다.';
  infoDiv.appendChild(infoP);
  
  div.appendChild(headerDiv);
  div.appendChild(infoDiv);
  
  return div;
}

// ReportPreview Component
function createReportPreview() {
  if (!showPreview) return null;
  
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 preview-modal-overlay';
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      handleClosePreview();
    }
  });
  
  const modal = document.createElement('div');
  modal.className = 'bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto';
  
  const header = document.createElement('div');
  header.className = 'sticky top-0 bg-white border-b p-4 flex justify-between items-center';
  
  const h2 = document.createElement('h2');
  h2.className = 'text-2xl font-bold text-gray-800';
  h2.textContent = '보고서 미리보기';
  
  const closeBtn = document.createElement('button');
  closeBtn.className = 'text-gray-500 hover:text-gray-700 text-2xl font-bold';
  closeBtn.textContent = '×';
  closeBtn.addEventListener('click', handleClosePreview);
  
  header.appendChild(h2);
  header.appendChild(closeBtn);
  
  const content = document.createElement('div');
  content.className = 'p-6';
  
  const prose = document.createElement('div');
  prose.className = 'prose max-w-none';
  
  const title = document.createElement('h1');
  title.className = 'text-3xl font-bold mb-6 text-center';
  title.textContent = '과학 탐구 보고서';
  prose.appendChild(title);
  
  stepGuides.forEach((step) => {
    const stepContent = reportData[step.id] || '';
    if (!stepContent.trim()) return;
    
    const stepDiv = document.createElement('div');
    stepDiv.className = 'mb-8';
    
    const stepTitle = document.createElement('h2');
    stepTitle.className = 'text-2xl font-bold mb-3 text-gray-800 flex items-center gap-2';
    stepTitle.innerHTML = `<span>${step.icon || '📝'}</span> ${step.id}. ${step.title}`;
    
    const stepContentDiv = document.createElement('div');
    stepContentDiv.className = 'text-gray-700 whitespace-pre-wrap leading-relaxed';
    stepContentDiv.textContent = stepContent;
    
    stepDiv.appendChild(stepTitle);
    stepDiv.appendChild(stepContentDiv);
    prose.appendChild(stepDiv);
  });
  
  content.appendChild(prose);
  modal.appendChild(header);
  modal.appendChild(content);
  overlay.appendChild(modal);
  
  return overlay;
}

// ExportButton Component
function createExportButton() {
  const div = document.createElement('div');
  div.className = 'bg-white rounded-lg shadow-md p-6 sticky top-4';
  
  const h3 = document.createElement('h3');
  h3.className = 'text-xl font-semibold mb-4 text-gray-800';
  h3.textContent = '보고서 내보내기';
  
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'flex flex-row gap-3 flex-wrap';
  
  // 교사에게 제출 버튼
  const submitToTeacherBtn = document.createElement('button');
  submitToTeacherBtn.id = 'submitToTeacherBtn';
  submitToTeacherBtn.className = 'flex-1 min-w-[200px] px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-semibold';
  submitToTeacherBtn.innerHTML = '<span>📤</span> 교사에게 제출';
  submitToTeacherBtn.addEventListener('click', submitAllAnswersToTeacher);
  
  const txtButton = document.createElement('button');
  txtButton.className = 'flex-1 min-w-[150px] px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2';
  txtButton.innerHTML = '<span>📄</span> TXT 파일로 저장';
  
  const htmlButton = document.createElement('button');
  htmlButton.className = 'flex-1 min-w-[150px] px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2';
  htmlButton.innerHTML = '<span>🌐</span> HTML 파일로 저장';
  
  const hasContent = Object.values(reportData).some(content => content.trim());
  txtButton.disabled = !hasContent;
  htmlButton.disabled = !hasContent;
  submitToTeacherBtn.disabled = !hasContent || !studentInfo.studentId || !studentInfo.studentName;
  
  txtButton.addEventListener('click', exportTXT);
  htmlButton.addEventListener('click', exportHTML);
  
  buttonContainer.appendChild(submitToTeacherBtn);
  buttonContainer.appendChild(txtButton);
  buttonContainer.appendChild(htmlButton);
  
  const message = document.createElement('p');
  message.className = 'text-sm text-gray-500 mt-2';
  if (!hasContent) {
    message.textContent = '내보낼 내용이 없습니다. 먼저 보고서를 작성해주세요.';
  }
  
  div.appendChild(h3);
  div.appendChild(buttonContainer);
  if (!hasContent) {
    div.appendChild(message);
  }
  
  return div;
}

// Status Sidebar
function createStatusSidebar() {
  const div = document.createElement('div');
  div.className = 'bg-white rounded-lg shadow-md p-6 mb-6 sticky top-4';
  
  const h3 = document.createElement('h3');
  h3.className = 'text-xl font-semibold mb-4 text-gray-800';
  h3.textContent = '작성 현황';
  
  const statusList = document.createElement('div');
  statusList.className = 'space-y-2';
  
  stepGuides.forEach((step) => {
    const content = reportData[step.id] || '';
    const contentLength = content.trim().length;
    
    let bgColor = 'bg-gray-50';
    if (step.id === currentStep) {
      bgColor = 'bg-blue-100';
    } else if (contentLength >= 10) {
      bgColor = 'bg-green-50';
    }
    
    const statusItem = document.createElement('div');
    statusItem.className = `flex items-center justify-between p-2 rounded ${bgColor}`;
    
    const span = document.createElement('span');
    span.className = 'text-sm text-gray-700';
    span.innerHTML = `${step.icon || '📝'} ${step.id}. ${step.title}`;
    
    statusItem.appendChild(span);
    
    if (contentLength >= 10) {
      const check = document.createElement('span');
      check.className = 'text-green-600 text-sm';
      check.textContent = '✓';
      statusItem.appendChild(check);
    }
    
    statusList.appendChild(statusItem);
  });
  
  const previewButton = document.createElement('button');
  previewButton.className = 'w-full mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors';
  previewButton.textContent = '📄 미리보기';
  previewButton.addEventListener('click', () => {
    showPreview = true;
    render();
  });
  
  div.appendChild(h3);
  div.appendChild(statusList);
  div.appendChild(previewButton);
  
  return div;
}

// Export functions
function generateReportText() {
  let text = '과학 탐구 보고서\n\n';
  text += '='.repeat(50) + '\n\n';
  
  stepGuides.forEach((step) => {
    const content = reportData[step.id] || '';
    if (content.trim()) {
      text += `${step.id}. ${step.title}\n`;
      text += '-'.repeat(30) + '\n';
      text += content + '\n\n';
    }
  });
  
  return text;
}

function generateReportHTML() {
  let html = `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>과학 탐구 보고서</title>
    <style>
        body {
            font-family: 'Malgun Gothic', sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }
        h1 {
            text-align: center;
            color: #1e40af;
            border-bottom: 3px solid #1e40af;
            padding-bottom: 10px;
        }
        h2 {
            color: #1e40af;
            margin-top: 30px;
            border-left: 4px solid #1e40af;
            padding-left: 10px;
        }
        .content {
            white-space: pre-wrap;
            margin: 15px 0;
            padding: 15px;
            background-color: #f9fafb;
            border-radius: 5px;
        }
    </style>
</head>
<body>
    <h1>과학 탐구 보고서</h1>
`;

  stepGuides.forEach((step) => {
    const content = reportData[step.id] || '';
    if (content.trim()) {
      html += `    <h2>${step.id}. ${step.title}</h2>\n`;
      html += `    <div class="content">${content.replace(/\n/g, '<br>')}</div>\n`;
    }
  });

  html += `</body>
</html>`;
  
  return html;
}

function exportTXT() {
  const text = generateReportText();
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '과학탐구보고서.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportHTML() {
  const html = generateReportHTML();
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '과학탐구보고서.html';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Event handlers
function handleStepChange(stepId) {
  currentStep = stepId;
  aiResponse = '';
  // 단계 변경 시 해당 단계의 마지막 AI 응답 표시
  if (chatHistory[stepId] && chatHistory[stepId].length > 0) {
    const lastMessage = chatHistory[stepId][chatHistory[stepId].length - 1];
    if (lastMessage.role === 'assistant') {
      aiResponse = lastMessage.content;
    }
  }
  render();
}

function handleContentChange(content) {
  reportData[currentStep] = content;
  saveData();
  
  // Google Sheets에 저장 (학생 정보가 있는 경우에만)
  if (studentInfo.studentId && studentInfo.studentName && content.trim()) {
    saveToSheet({
      studentId: studentInfo.studentId,
      studentName: studentInfo.studentName,
      step: currentStep, // 숫자로 전송
      answer: content
    });
  }
  
  // 전체 렌더링 대신 필요한 부분만 업데이트 (글자 수는 textarea 이벤트에서 직접 업데이트됨)
  updateProgressIndicators();
}

function handleAIResponse(response) {
  aiResponse = response;
  render();
}

function handleNextStep() {
  if (currentStep < stepGuides.length) {
    currentStep++;
    aiResponse = '';
    render();
  }
}

function handlePrevStep() {
  if (currentStep > 1) {
    currentStep--;
    aiResponse = '';
    render();
  }
}

function handleClosePreview() {
  showPreview = false;
  render();
}

// 부분 업데이트 함수들
function updateCharCount(length) {
  const charCountEl = document.querySelector('.char-count-display');
  if (charCountEl) {
    charCountEl.textContent = `글자 수: ${length}`;
  }
}

// AIAssistant 버튼 상태만 업데이트하는 함수
function updateAIAssistantButton() {
  const aiContainer = document.querySelector('.bg-gradient-to-r.from-purple-50.to-pink-50');
  if (aiContainer) {
    const aiButton = aiContainer.querySelector('button');
    if (aiButton && !aiButton.textContent.includes('처리 중')) {
      const textarea = document.querySelector(`textarea[data-step-textarea="${currentStep}"]`);
      const actualContent = textarea ? textarea.value : (reportData[currentStep] || '');
      const apiKeyToUse = apiKey || import.meta.env.VITE_OPENAI_API_KEY || '';
      aiButton.disabled = !actualContent.trim() || !apiKeyToUse;
    }
  }
}

function updateProgressIndicators() {
  // StepProgress 버튼들 업데이트
  const progressContainer = document.querySelector('.bg-white.rounded-lg.shadow-md.p-4.mb-6 .flex.flex-wrap');
  if (progressContainer) {
    const buttons = progressContainer.querySelectorAll('button');
    buttons.forEach((button) => {
      const stepMatch = button.textContent.match(/(\d+)\./);
      if (stepMatch) {
        const stepId = parseInt(stepMatch[1]);
        const content = reportData[stepId] || '';
        const contentLength = content.trim().length;
        
        // 클래스 재설정
        let newClasses = 'px-4 py-2 rounded-lg text-sm font-medium transition-all';
        if (stepId === currentStep) {
          newClasses += ' bg-blue-600 text-white shadow-md scale-105';
        } else if (contentLength >= 10) {
          newClasses += ' bg-green-500 text-white hover:bg-green-600';
        } else {
          newClasses += ' bg-gray-200 text-gray-700 hover:bg-gray-300';
        }
        button.className = newClasses;
      }
    });
  }
  
  // StatusSidebar 업데이트
  const statusList = document.querySelector('.space-y-2');
  if (statusList) {
    const statusItems = statusList.querySelectorAll('div');
    statusItems.forEach((item) => {
      const stepMatch = item.textContent.match(/(\d+)\./);
      if (stepMatch) {
        const stepId = parseInt(stepMatch[1]);
        const content = reportData[stepId] || '';
        const contentLength = content.trim().length;
        
        // 배경색 클래스 재설정
        let newClasses = 'flex items-center justify-between p-2 rounded';
        if (stepId === currentStep) {
          newClasses += ' bg-blue-100';
        } else if (contentLength >= 10) {
          newClasses += ' bg-green-50';
        } else {
          newClasses += ' bg-gray-50';
        }
        item.className = newClasses;
        
        // 체크마크 추가/제거
        const existingCheck = item.querySelector('.text-green-600.text-sm');
        if (contentLength >= 10 && !existingCheck) {
          const check = document.createElement('span');
          check.className = 'text-green-600 text-sm';
          check.textContent = '✓';
          item.appendChild(check);
        } else if (contentLength < 10 && existingCheck) {
          existingCheck.remove();
        }
      }
    });
  }
  
  // ExportButton 상태 업데이트
  const exportContainer = document.querySelectorAll('.bg-white.rounded-lg.shadow-md.p-6.mb-6');
  exportContainer.forEach((container) => {
    if (container.textContent.includes('보고서 내보내기')) {
      const hasContent = Object.values(reportData).some(content => content.trim());
      const buttons = container.querySelectorAll('button');
      buttons.forEach((btn) => {
        btn.disabled = !hasContent;
      });
      
      let exportMessage = container.querySelector('.text-sm.text-gray-500.mt-2');
      if (!hasContent) {
        if (!exportMessage) {
          exportMessage = document.createElement('p');
          exportMessage.className = 'text-sm text-gray-500 mt-2';
          container.appendChild(exportMessage);
        }
        exportMessage.textContent = '내보낼 내용이 없습니다. 먼저 보고서를 작성해주세요.';
        exportMessage.style.display = 'block';
      } else if (exportMessage) {
        exportMessage.style.display = 'none';
      }
    }
  });
  
  // AIAssistant 버튼 상태 업데이트
  const aiContainer = document.querySelector('.bg-gradient-to-r.from-purple-50.to-pink-50');
  if (aiContainer) {
    const aiButton = aiContainer.querySelector('button');
    if (aiButton && !aiButton.textContent.includes('처리 중')) {
      // 실제 textarea에서 최신 값을 가져오기
      const textarea = document.querySelector(`textarea[data-step-textarea="${currentStep}"]`);
      const actualContent = textarea ? textarea.value : (reportData[currentStep] || '');
      const apiKeyToUse = apiKey || import.meta.env.VITE_OPENAI_API_KEY || '';
      aiButton.disabled = !actualContent.trim() || !apiKeyToUse;
    }
  }
}

// Main render function
function render() {
  const app = document.getElementById('app');
  app.innerHTML = '';
  
  // Remove existing preview modal if any
  const existingPreview = document.querySelector('.preview-modal-overlay');
  if (existingPreview) {
    existingPreview.remove();
  }
  
  const mainDiv = document.createElement('div');
  mainDiv.className = 'min-h-screen bg-gray-100';
  
  // API Status Banner at the top
  mainDiv.appendChild(createAPIStatusBanner());
  
  // Student Info Banner
  mainDiv.appendChild(createStudentInfoBanner());
  
  mainDiv.appendChild(createHeader());
  
  const container = document.createElement('div');
  container.className = 'container mx-auto px-4 py-8';
  
  // 2열 레이아웃: 왼쪽(진행상황, 탐구주제, AI도움받기) / 오른쪽(작성현황, 보고서 내보내기)
  // Updated: 레이아웃 재구성 완료 - 2:1 비율
  const mainGrid = document.createElement('div');
  mainGrid.className = 'grid grid-cols-1 lg:grid-cols-3 gap-6';
  // 데스크톱에서 2:1 비율 강제 적용
  if (window.innerWidth >= 1024) {
    mainGrid.style.display = 'grid';
    mainGrid.style.gridTemplateColumns = '2fr 1fr';
    mainGrid.style.gap = '1.5rem';
  }
  
  // 왼쪽 열 (2/3 너비)
  const leftColumn = document.createElement('div');
  leftColumn.className = 'lg:col-span-2 space-y-6';
  if (window.innerWidth >= 1024) {
    leftColumn.style.gridColumn = '1';
  }
  
  // 진행상황
  leftColumn.appendChild(createStepProgress());
  
  // 탐구주제 (StepCard)
  leftColumn.appendChild(createStepCard());
  
  // AI도움받기
  leftColumn.appendChild(createAIAssistant());
  
  // AI 응답 표시
  if (aiResponse) {
    const aiResponseDiv = document.createElement('div');
    aiResponseDiv.className = 'bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg mb-6';
    const aiTitle = document.createElement('h4');
    aiTitle.className = 'font-semibold text-gray-800 mb-2';
    aiTitle.textContent = '🤖 AI 제안:';
    const aiContent = document.createElement('p');
    aiContent.className = 'text-gray-700 whitespace-pre-wrap';
    aiContent.textContent = aiResponse;
    aiResponseDiv.appendChild(aiTitle);
    aiResponseDiv.appendChild(aiContent);
    leftColumn.appendChild(aiResponseDiv);
  }
  
  // 네비게이션 버튼
  const navigationDiv = document.createElement('div');
  navigationDiv.className = 'flex justify-between items-center bg-white rounded-lg shadow-md p-4';
  
  const prevButton = document.createElement('button');
  prevButton.className = 'px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors';
  prevButton.textContent = '← 이전 단계';
  prevButton.disabled = currentStep === 1;
  prevButton.addEventListener('click', handlePrevStep);
  
  const stepCounter = document.createElement('span');
  stepCounter.className = 'text-gray-600 font-medium';
  stepCounter.textContent = `${currentStep} / ${stepGuides.length}`;
  
  const nextButton = document.createElement('button');
  nextButton.className = 'px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors';
  nextButton.textContent = '다음 단계 →';
  nextButton.disabled = currentStep === stepGuides.length;
  nextButton.addEventListener('click', handleNextStep);
  
  navigationDiv.appendChild(prevButton);
  navigationDiv.appendChild(stepCounter);
  navigationDiv.appendChild(nextButton);
  
  leftColumn.appendChild(navigationDiv);
  
  // 오른쪽 열 (1/3 너비)
  const rightColumn = document.createElement('div');
  rightColumn.className = 'lg:col-span-1 space-y-6';
  if (window.innerWidth >= 1024) {
    rightColumn.style.gridColumn = '2';
  }
  
  // 작성현황
  const statusSidebar = createStatusSidebar();
  rightColumn.appendChild(statusSidebar);
  
  // 보고서 내보내기
  const exportButton = createExportButton();
  // 작성현황의 높이를 고려하여 보고서 내보내기의 top 값을 동적으로 설정
  setTimeout(() => {
    if (statusSidebar && exportButton) {
      const statusHeight = statusSidebar.offsetHeight;
      const statusTop = 16; // top-4 = 1rem = 16px
      exportButton.style.top = `${statusTop + statusHeight + 24}px`; // 작성현황 높이 + space-y-6 (1.5rem = 24px)
    }
  }, 0);
  rightColumn.appendChild(exportButton);
  
  mainGrid.appendChild(leftColumn);
  mainGrid.appendChild(rightColumn);
  
  container.appendChild(mainGrid);
  mainDiv.appendChild(container);
  
  app.appendChild(mainDiv);
  
  // Render preview modal if needed
  if (showPreview) {
    const preview = createReportPreview();
    if (preview) {
      preview.classList.add('preview-modal-overlay');
      document.body.appendChild(preview);
    }
  }
  
  // 저장 버튼 이벤트 리스너 명시적으로 연결
  const saveBtnElement = document.querySelector("#saveBtn");
  if (saveBtnElement) {
    // 기존 이벤트 리스너 제거 후 새로 추가 (중복 방지)
    const newSaveBtn = saveBtnElement.cloneNode(true);
    saveBtnElement.parentNode.replaceChild(newSaveBtn, saveBtnElement);
    newSaveBtn.addEventListener("click", submitAnswer);
  }
}

// Initialize app
loadData();
render();
