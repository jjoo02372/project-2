import { stepGuides } from '../src/data/stepGuides.js';
import '../src/index.css';

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw_PsbLZpDxaWZWA1zRcjLESqPV2ktxmYIvu4WdM7tHAFE8y-qIRmDgbdaQcvB9KYQexA/exec";

// Teacher Dashboard State
let allSubmissions = [];
let selectedStudent = null;
let searchQuery = '';

// Load submissions from Google Sheets
async function loadSubmissions() {
  try {
    console.log('Loading submissions from:', SCRIPT_URL);
    
    // Google Apps Script는 POST 요청으로 처리하는 것이 안정적
    // Apps Script의 doPost 함수에서 action 파라미터를 확인하도록 요청
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'getAll' })
    });
    
    console.log('Response status:', res.status);
    console.log('Response ok:', res.ok);
    
    // 응답 텍스트 먼저 확인
    const responseText = await res.text();
    console.log('Response text:', responseText);
    
    // JSON 파싱 시도
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Parsed JSON data:', data);
    } catch (e) {
      // JSON이 아닌 경우 처리
      console.log('Response is not JSON, treating as text');
      if (responseText.toLowerCase().includes('error') || responseText.toLowerCase().includes('fail')) {
        throw new Error('Apps Script returned error: ' + responseText);
      }
      // 빈 응답이거나 다른 형식인 경우
      data = { submissions: [] };
    }
    
    // 데이터가 배열인 경우와 객체인 경우 모두 처리
    let submissionsArray = [];
    if (Array.isArray(data)) {
      submissionsArray = data;
    } else if (data.submissions && Array.isArray(data.submissions)) {
      submissionsArray = data.submissions;
    } else if (data.submissions && !Array.isArray(data.submissions)) {
      // 단일 객체인 경우 배열로 변환
      submissionsArray = [data.submissions];
    } else {
      submissionsArray = [];
    }
    
    console.log('Submissions array:', submissionsArray);
    
    // 데이터를 학생별로 그룹화
    const studentMap = {};
    submissionsArray.forEach(submission => {
      if (!submission || !submission.studentId || !submission.studentName) {
        console.warn('Invalid submission data:', submission);
        return;
      }
      
      const key = `${submission.studentId}_${submission.studentName}`;
      if (!studentMap[key]) {
        studentMap[key] = {
          studentId: submission.studentId,
          studentName: submission.studentName,
          submissions: [],
          submittedAt: submission.submittedAt || new Date().toISOString()
        };
      }
      studentMap[key].submissions.push({
        step: submission.step,
        answer: submission.answer,
        submittedAt: submission.submittedAt
      });
    });
    
    allSubmissions = Object.values(studentMap);
    
    // 제출 시각 기준으로 정렬 (최신순)
    allSubmissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    
    console.log('Loaded submissions:', allSubmissions);
    renderDashboard();
  } catch (error) {
    console.error('Failed to load submissions:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // 에러 메시지 표시
    const app = document.getElementById('teacher-dashboard-app');
    if (app && !app.querySelector('.connection-error')) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'connection-error bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4';
      errorDiv.innerHTML = `
        <div class="text-red-800 font-semibold mb-2">⚠️ Apps Script 연결 오류</div>
        <div class="text-red-700 text-sm mb-2">${error.message}</div>
        <div class="text-red-600 text-xs mb-2">Apps Script URL: ${SCRIPT_URL}</div>
        <div class="text-red-600 text-xs mb-2">Apps Script에서 doPost 함수가 action='getAll'을 처리하도록 설정되어 있는지 확인해주세요.</div>
        <button onclick="location.reload()" class="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
          🔄 다시 시도
        </button>
      `;
      const container = app.querySelector('.container') || app;
      container.insertBefore(errorDiv, container.firstChild);
    }
    
    // 연결 실패 시 빈 배열로 초기화
    allSubmissions = [];
    renderDashboard();
  }
}

// Save evaluation to Google Sheets
async function saveEvaluation(studentId, studentName, evaluation) {
  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'saveEvaluation',
        studentId: studentId,
        studentName: studentName,
        evaluation: evaluation
      })
    });
    
    const responseText = await res.text();
    let json;
    try {
      json = JSON.parse(responseText);
    } catch (e) {
      json = { ok: responseText.toLowerCase().includes('success') || responseText.toLowerCase().includes('ok') };
    }
    
    return json.ok || json.success;
  } catch (error) {
    console.error('Failed to save evaluation:', error);
    return false;
  }
}

// Render teacher dashboard
function renderDashboard() {
  const app = document.getElementById('teacher-dashboard-app');
  app.innerHTML = '';
  
  const mainDiv = document.createElement('div');
  mainDiv.className = 'min-h-screen bg-gray-100';
  
  // Header
  const header = document.createElement('header');
  header.className = 'bg-gradient-to-r from-purple-600 to-pink-600 text-white py-6 shadow-lg';
  
  const headerContainer = document.createElement('div');
  headerContainer.className = 'container mx-auto px-4';
  
  const headerContent = document.createElement('div');
  headerContent.className = 'flex items-center justify-between';
  
  const h1 = document.createElement('h1');
  h1.className = 'text-3xl font-bold flex items-center gap-2';
  h1.innerHTML = '<span>👨‍🏫</span> 교사 대시보드';
  
  const buttonGroup = document.createElement('div');
  buttonGroup.className = 'flex items-center gap-2';
  
  const refreshBtn = document.createElement('button');
  refreshBtn.className = 'px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-colors';
  refreshBtn.textContent = '🔄 새로고침';
  refreshBtn.addEventListener('click', () => {
    loadSubmissions();
  });
  
  const backBtn = document.createElement('button');
  backBtn.className = 'px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg transition-colors';
  backBtn.textContent = '← 학생 페이지로';
  backBtn.addEventListener('click', () => {
    window.location.href = '/';
  });
  
  buttonGroup.appendChild(refreshBtn);
  buttonGroup.appendChild(backBtn);
  
  headerContent.appendChild(h1);
  headerContent.appendChild(buttonGroup);
  headerContainer.appendChild(headerContent);
  
  const p = document.createElement('p');
  p.className = 'text-center mt-2 text-purple-100';
  p.textContent = '학생 제출 현황 및 답변 평가';
  headerContainer.appendChild(p);
  
  header.appendChild(headerContainer);
  mainDiv.appendChild(header);
  
  const container = document.createElement('div');
  container.className = 'container mx-auto px-4 py-8';
  
  if (selectedStudent) {
    // Show student detail view
    const detailView = createStudentDetailView(selectedStudent);
    container.appendChild(detailView);
  } else {
    // Show student list
    const searchSection = document.createElement('div');
    searchSection.className = 'bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg shadow-md p-4 mb-6 border-2 border-purple-200';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = '학생 ID 또는 이름으로 검색...';
    searchInput.className = 'w-full px-4 py-2 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-700 placeholder-purple-400';
    searchInput.value = searchQuery;
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase();
      renderDashboard();
    });
    
    searchSection.appendChild(searchInput);
    container.appendChild(searchSection);
    
    // Statistics
    const statsSection = document.createElement('div');
    statsSection.className = 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-6';
    
    const filteredStudents = searchQuery 
      ? allSubmissions.filter(s => 
          s.studentId.toLowerCase().includes(searchQuery) || 
          s.studentName.toLowerCase().includes(searchQuery)
        )
      : allSubmissions;
    
    const totalStudents = document.createElement('div');
    totalStudents.className = 'bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg shadow-md p-6 border-2 border-purple-200';
    totalStudents.innerHTML = `
      <div class="text-purple-700 text-sm mb-2 font-semibold">전체 학생</div>
      <div class="text-3xl font-bold text-purple-600">${filteredStudents.length}</div>
    `;
    
    const totalSubmissions = document.createElement('div');
    totalSubmissions.className = 'bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg shadow-md p-6 border-2 border-blue-200';
    const totalSteps = filteredStudents.reduce((sum, s) => sum + s.submissions.length, 0);
    totalSubmissions.innerHTML = `
      <div class="text-blue-700 text-sm mb-2 font-semibold">전체 제출</div>
      <div class="text-3xl font-bold text-blue-600">${totalSteps}</div>
    `;
    
    const avgCompletion = document.createElement('div');
    avgCompletion.className = 'bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg shadow-md p-6 border-2 border-green-200';
    const avgSteps = filteredStudents.length > 0 ? (totalSteps / filteredStudents.length).toFixed(1) : 0;
    avgCompletion.innerHTML = `
      <div class="text-green-700 text-sm mb-2 font-semibold">평균 완성 단계</div>
      <div class="text-3xl font-bold text-green-600">${avgSteps}</div>
    `;
    
    statsSection.appendChild(totalStudents);
    statsSection.appendChild(totalSubmissions);
    statsSection.appendChild(avgCompletion);
    container.appendChild(statsSection);
    
    const studentList = createStudentList(filteredStudents);
    container.appendChild(studentList);
    
    // Looker Studio iframe 추가
    const lookerSection = document.createElement('div');
    lookerSection.className = 'mt-6 bg-white rounded-lg shadow-md p-4 border-2 border-purple-200';
    
    const lookerTitle = document.createElement('h2');
    lookerTitle.className = 'text-2xl font-bold mb-4 text-purple-800';
    lookerTitle.textContent = '📊 데이터 분석 대시보드';
    lookerSection.appendChild(lookerTitle);
    
    const lookerIframe = document.createElement('iframe');
    lookerIframe.src = '(Looker Studio 임베드 URL)'; // 여기에 실제 Looker Studio URL을 입력하세요
    lookerIframe.style.width = '100%';
    lookerIframe.style.height = '100vh';
    lookerIframe.style.border = '0';
    lookerIframe.style.minHeight = '600px';
    lookerIframe.setAttribute('allowfullscreen', '');
    
    lookerSection.appendChild(lookerIframe);
    container.appendChild(lookerSection);
  }
  
  mainDiv.appendChild(container);
  app.appendChild(mainDiv);
}

// Create student list view
function createStudentList(students) {
  const listDiv = document.createElement('div');
  listDiv.className = 'bg-gradient-to-br from-white to-purple-50 rounded-lg shadow-md p-6 border-2 border-purple-200';
  
  const h2 = document.createElement('h2');
  h2.className = 'text-2xl font-bold mb-4 text-purple-800';
  h2.textContent = `학생 목록 (${students.length}명)`;
  listDiv.appendChild(h2);
  
  if (students.length === 0) {
    const emptyMsg = document.createElement('p');
    emptyMsg.className = 'text-gray-500 text-center py-8';
    emptyMsg.textContent = '제출된 학생이 없습니다.';
    listDiv.appendChild(emptyMsg);
    return listDiv;
  }
  
  const table = document.createElement('table');
  table.className = 'w-full';
  
  // Table header
  const thead = document.createElement('thead');
  thead.className = 'bg-gradient-to-r from-purple-100 to-pink-100';
  const headerRow = document.createElement('tr');
  ['학생 이름', '제출 개수', '완성도', '제출 시각', '작업'].forEach(header => {
    const th = document.createElement('th');
    th.className = 'px-4 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider';
    th.textContent = header;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  // Table body
  const tbody = document.createElement('tbody');
  tbody.className = 'bg-white divide-y divide-gray-200';
  
  students.forEach(student => {
    const row = document.createElement('tr');
    row.className = 'hover:bg-gray-50';
    
    // Student Name
    const nameCell = document.createElement('td');
    nameCell.className = 'px-4 py-4 whitespace-nowrap text-sm font-semibold text-purple-800';
    nameCell.textContent = `${student.studentName} (${student.studentId})`;
    row.appendChild(nameCell);
    
    // Submission Count
    const countCell = document.createElement('td');
    countCell.className = 'px-4 py-4 whitespace-nowrap text-sm font-medium text-blue-700';
    const stepCount = student.submissions.length;
    const percentage = Math.round((stepCount / stepGuides.length) * 100);
    countCell.textContent = `${stepCount} / ${stepGuides.length} (${percentage}%)`;
    row.appendChild(countCell);
    
    // Progress bar
    const progressCell = document.createElement('td');
    progressCell.className = 'px-4 py-4 whitespace-nowrap';
    const progressBar = document.createElement('div');
    progressBar.className = 'w-full bg-purple-100 rounded-full h-3';
    const progressFill = document.createElement('div');
    progressFill.className = 'bg-gradient-to-r from-purple-400 to-pink-400 h-3 rounded-full transition-all';
    progressFill.style.width = `${percentage}%`;
    progressBar.appendChild(progressFill);
    progressCell.appendChild(progressBar);
    row.appendChild(progressCell);
    
    // Last Submission
    const dateCell = document.createElement('td');
    dateCell.className = 'px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-700';
    if (student.submittedAt) {
      const date = new Date(student.submittedAt);
      dateCell.textContent = date.toLocaleString('ko-KR');
    } else {
      dateCell.textContent = '-';
    }
    row.appendChild(dateCell);
    
    // Actions
    const actionCell = document.createElement('td');
    actionCell.className = 'px-4 py-4 whitespace-nowrap text-sm font-medium';
    const viewBtn = document.createElement('button');
    viewBtn.className = 'px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all shadow-md';
    viewBtn.textContent = '상세보기';
    viewBtn.addEventListener('click', () => {
      selectedStudent = student;
      renderDashboard();
    });
    actionCell.appendChild(viewBtn);
    row.appendChild(actionCell);
    
    tbody.appendChild(row);
  });
  
  table.appendChild(tbody);
  listDiv.appendChild(table);
  
  return listDiv;
}

// Create student detail view
function createStudentDetailView(student) {
  const detailDiv = document.createElement('div');
  detailDiv.className = 'bg-gradient-to-br from-white to-purple-50 rounded-lg shadow-md p-6 border-2 border-purple-200';
  
  // Header with back button
  const headerDiv = document.createElement('div');
  headerDiv.className = 'flex items-center justify-between mb-6';
  
  const titleDiv = document.createElement('div');
  const h2 = document.createElement('h2');
  h2.className = 'text-2xl font-bold text-purple-800';
  h2.textContent = `${student.studentName} (${student.studentId})`;
  titleDiv.appendChild(h2);
  
  const backBtn = document.createElement('button');
  backBtn.className = 'px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors shadow-md';
  backBtn.textContent = '← 목록으로';
  backBtn.addEventListener('click', () => {
    selectedStudent = null;
    renderDashboard();
  });
  
  headerDiv.appendChild(titleDiv);
  headerDiv.appendChild(backBtn);
  detailDiv.appendChild(headerDiv);
  
  // Student submissions by step
  const submissionsContainer = document.createElement('div');
  submissionsContainer.className = 'mb-6';
  
  stepGuides.forEach(step => {
    const stepDiv = document.createElement('div');
    stepDiv.className = 'mb-6 p-4 border-2 border-purple-200 rounded-lg bg-gradient-to-r from-white to-purple-50';
    
    const stepHeader = document.createElement('div');
    stepHeader.className = 'flex items-center justify-between mb-2';
    
    const stepTitle = document.createElement('h3');
    stepTitle.className = 'text-lg font-semibold text-purple-800';
    stepTitle.innerHTML = `<span>${step.icon || '📝'}</span> ${step.id}. ${step.title}`;
    stepHeader.appendChild(stepTitle);
    
    const submission = student.submissions.find(s => s.step === step.id);
    if (submission) {
      const statusBadge = document.createElement('span');
      statusBadge.className = 'px-3 py-1 bg-gradient-to-r from-green-200 to-emerald-200 text-green-800 text-xs font-semibold rounded-full border border-green-300';
      statusBadge.textContent = '제출됨';
      stepHeader.appendChild(statusBadge);
    } else {
      const statusBadge = document.createElement('span');
      statusBadge.className = 'px-3 py-1 bg-gradient-to-r from-gray-200 to-gray-300 text-gray-700 text-xs font-semibold rounded-full border border-gray-400';
      statusBadge.textContent = '미제출';
      stepHeader.appendChild(statusBadge);
    }
    
    stepDiv.appendChild(stepHeader);
    
    if (submission && submission.answer) {
      const answerDiv = document.createElement('div');
      answerDiv.className = 'mt-2 p-3 bg-white rounded-lg text-gray-700 whitespace-pre-wrap border border-purple-200 shadow-sm';
      answerDiv.textContent = submission.answer;
      stepDiv.appendChild(answerDiv);
    } else {
      const noAnswer = document.createElement('p');
      noAnswer.className = 'text-purple-400 italic mt-2 font-medium';
      noAnswer.textContent = '답변이 제출되지 않았습니다.';
      stepDiv.appendChild(noAnswer);
    }
    
    submissionsContainer.appendChild(stepDiv);
  });
  
  detailDiv.appendChild(submissionsContainer);
  
  // Evaluation Section
  const evaluationDiv = document.createElement('div');
  evaluationDiv.className = 'border-t pt-6 mt-6';
  
  const evalTitle = document.createElement('h3');
  evalTitle.className = 'text-xl font-bold text-purple-800 mb-4';
  evalTitle.textContent = '📊 평가';
  evaluationDiv.appendChild(evalTitle);
  
  // Evaluation form
  const evalForm = document.createElement('div');
  evalForm.className = 'space-y-4';
  
  // 과학성 (50점)
  const scienceDiv = document.createElement('div');
  scienceDiv.className = 'mb-4';
  const scienceLabel = document.createElement('label');
  scienceLabel.className = 'block text-sm font-semibold text-purple-700 mb-2';
  scienceLabel.textContent = '과학성 (50점)';
  const scienceInput = document.createElement('input');
  scienceInput.type = 'number';
  scienceInput.min = '0';
  scienceInput.max = '50';
  scienceInput.value = '0';
  scienceInput.className = 'w-full px-3 py-2 border-2 border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-gray-700';
  scienceInput.id = 'eval-science';
  scienceDiv.appendChild(scienceLabel);
  scienceDiv.appendChild(scienceInput);
  evalForm.appendChild(scienceDiv);
  
  // 논리성 (30점)
  const logicDiv = document.createElement('div');
  logicDiv.className = 'mb-4';
  const logicLabel = document.createElement('label');
  logicLabel.className = 'block text-sm font-semibold text-blue-700 mb-2';
  logicLabel.textContent = '논리성 (30점)';
  const logicInput = document.createElement('input');
  logicInput.type = 'number';
  logicInput.min = '0';
  logicInput.max = '30';
  logicInput.value = '0';
  logicInput.className = 'w-full px-3 py-2 border-2 border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-700';
  logicInput.id = 'eval-logic';
  logicDiv.appendChild(logicLabel);
  logicDiv.appendChild(logicInput);
  evalForm.appendChild(logicDiv);
  
  // 창의적 아이디어 (20점)
  const creativityDiv = document.createElement('div');
  creativityDiv.className = 'mb-4';
  const creativityLabel = document.createElement('label');
  creativityLabel.className = 'block text-sm font-semibold text-pink-700 mb-2';
  creativityLabel.textContent = '창의적 아이디어 (20점)';
  const creativityInput = document.createElement('input');
  creativityInput.type = 'number';
  creativityInput.min = '0';
  creativityInput.max = '20';
  creativityInput.value = '0';
  creativityInput.className = 'w-full px-3 py-2 border-2 border-pink-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 bg-white text-gray-700';
  creativityInput.id = 'eval-creativity';
  creativityDiv.appendChild(creativityLabel);
  creativityDiv.appendChild(creativityInput);
  evalForm.appendChild(creativityDiv);
  
  // Total score display
  const totalDiv = document.createElement('div');
  totalDiv.className = 'mb-4 p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border-2 border-purple-300';
  const totalLabel = document.createElement('div');
  totalLabel.className = 'text-sm font-semibold text-purple-700 mb-1';
  totalLabel.textContent = '총점';
  const totalScore = document.createElement('div');
  totalScore.className = 'text-3xl font-bold text-purple-600';
  totalScore.id = 'eval-total';
  totalScore.textContent = '0 / 100';
  
  const updateTotal = () => {
    const science = parseInt(scienceInput.value) || 0;
    const logic = parseInt(logicInput.value) || 0;
    const creativity = parseInt(creativityInput.value) || 0;
    const total = science + logic + creativity;
    totalScore.textContent = `${total} / 100`;
  };
  
  scienceInput.addEventListener('input', updateTotal);
  logicInput.addEventListener('input', updateTotal);
  creativityInput.addEventListener('input', updateTotal);
  
  totalDiv.appendChild(totalLabel);
  totalDiv.appendChild(totalScore);
  evalForm.appendChild(totalDiv);
  
  // Save button
  const saveBtn = document.createElement('button');
  saveBtn.className = 'w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all font-semibold shadow-md';
  saveBtn.textContent = '💾 평가 저장';
  saveBtn.addEventListener('click', async () => {
    const evaluation = {
      science: parseInt(scienceInput.value) || 0,
      logic: parseInt(logicInput.value) || 0,
      creativity: parseInt(creativityInput.value) || 0,
      total: parseInt(scienceInput.value || 0) + parseInt(logicInput.value || 0) + parseInt(creativityInput.value || 0),
      evaluatedAt: new Date().toISOString()
    };
    
    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중...';
    
    const success = await saveEvaluation(student.studentId, student.studentName, evaluation);
    
    if (success) {
      saveBtn.textContent = '✓ 저장 완료';
      saveBtn.style.backgroundColor = '#16a34a';
      setTimeout(() => {
        saveBtn.textContent = '💾 평가 저장';
        saveBtn.style.backgroundColor = '';
        saveBtn.disabled = false;
      }, 2000);
    } else {
      saveBtn.textContent = '저장 실패';
      saveBtn.style.backgroundColor = '#dc2626';
      setTimeout(() => {
        saveBtn.textContent = '💾 평가 저장';
        saveBtn.style.backgroundColor = '';
        saveBtn.disabled = false;
      }, 2000);
    }
  });
  evalForm.appendChild(saveBtn);
  
  evaluationDiv.appendChild(evalForm);
  detailDiv.appendChild(evaluationDiv);
  
  return detailDiv;
}

// Initialize dashboard
loadSubmissions();

