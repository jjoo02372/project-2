import { stepGuides } from './data/stepGuides.js';
import './index.css';

// Teacher Dashboard State
let allSubmissions = [];
let selectedStudent = null;
let searchQuery = '';

// Load submissions from localStorage
function loadSubmissions() {
  try {
    console.log('Loading submissions from localStorage...');
    
    // localStorage의 모든 키를 스캔하여 학생 데이터 찾기
    const studentMap = {};
    
    // localStorage의 모든 키 순회
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      // 학생 데이터 키 패턴: student-{studentId}-{studentName}
      if (key && key.startsWith('student-')) {
        try {
          const studentData = JSON.parse(localStorage.getItem(key));
          
          if (studentData && studentData.studentId && studentData.studentName) {
            const studentKey = `${studentData.studentId}_${studentData.studentName}`;
            
            if (!studentMap[studentKey]) {
              studentMap[studentKey] = {
                studentId: studentData.studentId,
                studentName: studentData.studentName,
                submissions: [],
                submittedAt: studentData.lastUpdated || new Date().toISOString()
              };
            }
            
            // reportData에서 각 단계별 답변 추출
            if (studentData.reportData) {
              Object.keys(studentData.reportData).forEach(step => {
                const stepNum = parseInt(step);
                if (!isNaN(stepNum) && studentData.reportData[step]) {
                  // 이미 같은 단계의 제출이 있는지 확인
                  const existingSubmission = studentMap[studentKey].submissions.find(
                    s => s.step === stepNum
                  );
                  
                  if (!existingSubmission) {
                    studentMap[studentKey].submissions.push({
                      step: stepNum,
                      answer: studentData.reportData[step],
                      submittedAt: studentData.lastUpdated
                    });
                  }
                }
              });
            }
          }
        } catch (e) {
          console.warn('Failed to parse student data from key:', key, e);
        }
      }
    }
    
    allSubmissions = Object.values(studentMap);
    
    // 제출 시각 기준으로 정렬 (최신순)
    allSubmissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    
    console.log('Loaded submissions from localStorage:', allSubmissions);
    renderDashboard();
  } catch (error) {
    console.error('Failed to load submissions from localStorage:', error);
    
    // 에러 메시지 표시
    const app = document.getElementById('teacher-dashboard-app');
    if (app && !app.querySelector('.connection-error')) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'connection-error bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-4';
      errorDiv.innerHTML = `
        <div class="text-red-800 font-semibold mb-2">⚠️ 데이터 로드 오류</div>
        <div class="text-red-700 text-sm mb-2">${error.message}</div>
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

// Save evaluation to localStorage
function saveEvaluation(studentId, studentName, evaluation) {
  try {
    const evalKey = `evaluation-${studentId}-${studentName}`;
    localStorage.setItem(evalKey, JSON.stringify({
      studentId,
      studentName,
      evaluation,
      evaluatedAt: new Date().toISOString()
    }));
    return true;
  } catch (error) {
    console.error('Failed to save evaluation:', error);
    return false;
  }
}

// Load evaluation from localStorage
function loadEvaluation(studentId, studentName) {
  try {
    const evalKey = `evaluation-${studentId}-${studentName}`;
    const evalData = localStorage.getItem(evalKey);
    if (evalData) {
      return JSON.parse(evalData).evaluation;
    }
    return null;
  } catch (error) {
    console.error('Failed to load evaluation:', error);
    return null;
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
  p.textContent = '학생 제출 현황 및 답변 평가 (localStorage 기반)';
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
    // 대시보드 메인 화면
    createDashboardMain(container);
  }
  
  mainDiv.appendChild(container);
  app.appendChild(mainDiv);
}

// Create dashboard main view
function createDashboardMain(container) {
  // 통계 섹션
  const statsSection = document.createElement('div');
  statsSection.className = 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 stats-grid';
  
  const totalStudents = document.createElement('div');
  totalStudents.className = 'stats-card';
  const totalSteps = allSubmissions.reduce((sum, s) => sum + s.submissions.length, 0);
  totalStudents.innerHTML = `
    <h3>전체 학생 수</h3>
    <div class="stat-number">${allSubmissions.length}</div>
  `;
  
  const totalSubmissions = document.createElement('div');
  totalSubmissions.className = 'stats-card';
  totalSubmissions.innerHTML = `
    <h3>전체 제출 수</h3>
    <div class="stat-number">${totalSteps}</div>
  `;
  
  const avgCompletion = document.createElement('div');
  avgCompletion.className = 'progress-card';
  const avgSteps = allSubmissions.length > 0 ? (totalSteps / allSubmissions.length).toFixed(1) : 0;
  avgCompletion.innerHTML = `
    <h3>평균 완성도</h3>
    <div class="progress-text">${avgSteps} / 9</div>
  `;
  
  statsSection.appendChild(totalStudents);
  statsSection.appendChild(totalSubmissions);
  statsSection.appendChild(avgCompletion);
  container.appendChild(statsSection);
  
  // 학생 목록 섹션
  const studentListSection = document.createElement('div');
  studentListSection.className = 'students-card card';
  
  const sectionTitle = document.createElement('h3');
  sectionTitle.textContent = '학생 목록';
  studentListSection.appendChild(sectionTitle);
  
  if (allSubmissions.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'empty-state';
    emptyMsg.textContent = '저장된 학생 데이터가 없습니다. 학생이 저장 버튼을 눌러야 데이터가 표시됩니다.';
    studentListSection.appendChild(emptyMsg);
    container.appendChild(studentListSection);
    return;
  }
  
  // 학생 리스트
  allSubmissions.forEach(student => {
    const stepCount = student.submissions.length;
    const percentage = Math.round((stepCount / stepGuides.length) * 100);
    
    // 색상 결정 (초록: 70% 이상, 노랑: 40-69%, 빨강: 40% 미만)
    let progressColor, borderColor;
    if (percentage >= 70) {
      progressColor = 'linear-gradient(90deg, #b5e7a0 0%, #8dd46a 100%)';
      borderColor = '#8dd46a';
    } else if (percentage >= 40) {
      progressColor = 'linear-gradient(90deg, #ffd4a3 0%, #ffb366 100%)';
      borderColor = '#ffb366';
    } else {
      progressColor = 'linear-gradient(90deg, #f8b4d9 0%, #f58fc4 100%)';
      borderColor = '#f58fc4';
    }
    
    const studentItem = document.createElement('div');
    studentItem.className = 'student-item';
    studentItem.style.borderColor = borderColor;
    studentItem.addEventListener('click', () => {
      selectedStudent = student;
      renderDashboard();
    });
    
    // 왼쪽: 학생 정보
    const leftDiv = document.createElement('div');
    leftDiv.style.flex = '1';
    
    const nameDiv = document.createElement('div');
    nameDiv.className = 'font-bold text-lg mb-1';
    nameDiv.style.color = 'var(--text-primary)';
    nameDiv.textContent = student.studentName;
    leftDiv.appendChild(nameDiv);
    
    const idDiv = document.createElement('div');
    idDiv.className = 'text-sm mb-2';
    idDiv.style.color = 'var(--text-secondary)';
    idDiv.textContent = `ID: ${student.studentId}`;
    leftDiv.appendChild(idDiv);
    
    // 진행도
    const progressDiv = document.createElement('div');
    const progressLabel = document.createElement('div');
    progressLabel.className = 'text-sm font-semibold mb-1';
    progressLabel.style.color = 'var(--text-primary)';
    progressLabel.textContent = `진행도: ${stepCount} / ${stepGuides.length} (${percentage}%)`;
    progressDiv.appendChild(progressLabel);
    
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    const progressFill = document.createElement('div');
    progressFill.className = 'progress-fill';
    progressFill.style.background = progressColor;
    progressFill.style.width = `${percentage}%`;
    progressBar.appendChild(progressFill);
    progressDiv.appendChild(progressBar);
    leftDiv.appendChild(progressDiv);
    
    studentItem.appendChild(leftDiv);
    
    // 오른쪽: 화살표 아이콘
    const arrowDiv = document.createElement('div');
    arrowDiv.className = 'text-2xl';
    arrowDiv.style.color = 'var(--text-secondary)';
    arrowDiv.textContent = '→';
    studentItem.appendChild(arrowDiv);
    
    studentListSection.appendChild(studentItem);
  });
  
  container.appendChild(studentListSection);
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
  
  // Load full student data from localStorage
  const studentKey = `student-${student.studentId}-${student.studentName}`;
  const fullStudentData = JSON.parse(localStorage.getItem(studentKey) || '{}');
  
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
    
    // fullStudentData에서 답변 찾기
    const answer = fullStudentData.reportData && fullStudentData.reportData[step.id] 
      ? fullStudentData.reportData[step.id] 
      : null;
    
    if (answer) {
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
    
    if (answer) {
      const answerDiv = document.createElement('div');
      answerDiv.className = 'mt-2 p-3 bg-white rounded-lg text-gray-700 whitespace-pre-wrap border border-purple-200 shadow-sm';
      answerDiv.textContent = answer;
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
  
  // 텍스트 파일 다운로드 버튼
  const downloadSection = document.createElement('div');
  downloadSection.className = 'border-t-2 border-purple-300 pt-6 mt-6 mb-6';
  
  const downloadTitle = document.createElement('h3');
  downloadTitle.className = 'text-xl font-bold text-purple-800 mb-4';
  downloadTitle.textContent = '📄 보고서 다운로드';
  downloadSection.appendChild(downloadTitle);
  
  const downloadBtn = document.createElement('button');
  downloadBtn.className = 'w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all font-semibold shadow-md mb-4';
  downloadBtn.textContent = '📥 텍스트 파일로 다운로드';
  downloadBtn.addEventListener('click', () => {
    downloadStudentReport(fullStudentData);
  });
  downloadSection.appendChild(downloadBtn);
  
  detailDiv.appendChild(downloadSection);
  
  // Evaluation Section
  const evaluationDiv = document.createElement('div');
  evaluationDiv.className = 'border-t-2 border-purple-300 pt-6 mt-6';
  
  const evalTitle = document.createElement('h3');
  evalTitle.className = 'text-xl font-bold text-purple-800 mb-4';
  evalTitle.textContent = '📊 평가';
  evaluationDiv.appendChild(evalTitle);
  
  // Load existing evaluation
  const existingEval = loadEvaluation(student.studentId, student.studentName);
  
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
  scienceInput.value = existingEval ? existingEval.science : '0';
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
  logicInput.value = existingEval ? existingEval.logic : '0';
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
  creativityInput.value = existingEval ? existingEval.creativity : '0';
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
  
  const updateTotal = () => {
    const science = parseInt(scienceInput.value) || 0;
    const logic = parseInt(logicInput.value) || 0;
    const creativity = parseInt(creativityInput.value) || 0;
    const total = science + logic + creativity;
    totalScore.textContent = `${total} / 100`;
  };
  
  updateTotal();
  
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
  saveBtn.addEventListener('click', () => {
    const evaluation = {
      science: parseInt(scienceInput.value) || 0,
      logic: parseInt(logicInput.value) || 0,
      creativity: parseInt(creativityInput.value) || 0,
      total: parseInt(scienceInput.value || 0) + parseInt(logicInput.value || 0) + parseInt(creativityInput.value || 0),
      evaluatedAt: new Date().toISOString()
    };
    
    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중...';
    
    const success = saveEvaluation(student.studentId, student.studentName, evaluation);
    
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

// Download student report as text file
function downloadStudentReport(studentData) {
  let reportText = `과학 탐구 보고서\n`;
  reportText += `학생: ${studentData.studentName} (${studentData.studentId})\n`;
  reportText += `최종 수정일: ${studentData.lastUpdated ? new Date(studentData.lastUpdated).toLocaleString('ko-KR') : '알 수 없음'}\n`;
  reportText += `\n${'='.repeat(50)}\n\n`;
  
  stepGuides.forEach(step => {
    const answer = studentData.reportData && studentData.reportData[step.id] 
      ? studentData.reportData[step.id] 
      : null;
    
    reportText += `${step.id}. ${step.title}\n`;
    reportText += `${'-'.repeat(50)}\n`;
    
    if (answer) {
      reportText += `${answer}\n`;
    } else {
      reportText += `[미제출]\n`;
    }
    reportText += `\n`;
  });
  
  // Step 6 데이터 추가 (표 데이터가 있는 경우)
  if (studentData.step6Data && studentData.step6Data.tableData && studentData.step6Data.tableData.length > 0) {
    reportText += `\n${'='.repeat(50)}\n`;
    reportText += `6. 결과 정리 - 표 데이터\n`;
    reportText += `${'-'.repeat(50)}\n`;
    
    // 헤더
    if (studentData.step6Data.headerLabels && studentData.step6Data.headerLabels.length > 0) {
      reportText += `\t${studentData.step6Data.headerLabels.join('\t')}\n`;
    }
    
    // 데이터 행
    studentData.step6Data.tableData.forEach((row, idx) => {
      const rowLabel = studentData.step6Data.rowLabels && studentData.step6Data.rowLabels[idx] 
        ? studentData.step6Data.rowLabels[idx] 
        : `${idx + 1}회`;
      reportText += `${rowLabel}\t${row.join('\t')}\n`;
    });
  }
  
  // Create blob and download
  const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${studentData.studentName}_${studentData.studentId}_보고서.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Initialize dashboard
loadSubmissions();
