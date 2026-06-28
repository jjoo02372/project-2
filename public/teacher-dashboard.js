// Step Guides Data (inline)
const stepGuides = [
  { id: 1, title: '탐구 주제', icon: '🔍' },
  { id: 2, title: '탐구 동기', icon: '💭' },
  { id: 3, title: '탐구 목적', icon: '🎯' },
  { id: 4, title: '이론적 배경', icon: '📚' },
  { id: 5, title: '탐구 방법', icon: '🧪' },
  { id: 6, title: '결과 정리', icon: '📊' },
  { id: 7, title: '결론 및 보완점', icon: '✅' },
  { id: 8, title: '느낀 점', icon: '💝' },
  { id: 9, title: '참고 문헌', icon: '📖' }
];

// Google Apps Script URL
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbw_PsbLZpDxaWZWA1zRcjLESqPV2ktxmYIvu4WdM7tHAFE8y-qIRmDgbdaQcvB9KYQexA/exec";

// Dashboard State
let currentView = 'list'; // 'list', 'detail', or 'login-history'
let selectedStudentKey = null;
let scienceReports = {};
let loginHistory = {}; // 로그인 기록 { userId: [{ timestamp, name, email }, ...] }
let isLoading = false;

// Load teacher dashboard data from Apps Script (GET request)
async function loadTeacherDashboardData() {
  if (isLoading) {
    console.log('Already loading data, skipping...');
    return;
  }
  
  isLoading = true;
  try {
    console.log('=== Loading data from Apps Script ===');
    console.log('Script URL:', SCRIPT_URL);
    
    // GET 요청으로 모든 학생 데이터 가져오기
    const response = await fetch(SCRIPT_URL, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache'
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // 응답 텍스트 먼저 확인
    const responseText = await response.text();
    console.log('Response text (first 1000 chars):', responseText.substring(0, 1000));
    
    // JSON 파싱 시도
    let rawData;
    try {
      rawData = JSON.parse(responseText);
      console.log('Parsed JSON data:', rawData);
    } catch (e) {
      console.error('Failed to parse JSON:', e);
      console.error('Response text:', responseText);
      throw new Error('Invalid JSON response from server');
    }
    
    // 데이터 구조 변환: Apps Script 응답 형식에 맞게 처리
    // 형식: { ok: true, students: [{ studentId, studentName, steps: [...], completedSteps, updatedAt }, ...], stepCount: 9 }
    scienceReports = {};
    
    // ok 필드 확인
    if (rawData.ok !== true) {
      console.warn('Response ok field is not true:', rawData);
    }
    
    // 로그인 기록 로드 (있는 경우)
    if (rawData.loginHistory && typeof rawData.loginHistory === 'object') {
      loginHistory = rawData.loginHistory;
      console.log('Loaded login history for', Object.keys(loginHistory).length, 'users');
    }
    
    // students 배열 확인
    if (rawData.students && Array.isArray(rawData.students)) {
      console.log('Found students array with', rawData.students.length, 'students');
      
      rawData.students.forEach((student, index) => {
        if (!student || !student.studentId || !student.studentName) {
          console.warn(`Skipping invalid student at index ${index}:`, student);
          return;
        }
        
        // user 정보 우선 사용 (새로운 형식), 없으면 studentId/studentName 사용 (기존 형식)
        const userId = student.user?.id || student.userId || student.studentId;
        const userName = student.user?.name || student.studentName;
        const userEmail = student.user?.email || student.email || '';
        const userPicture = student.user?.picture || student.picture || '';
        const studentKey = `${userId}|${userName}`;
        
        // steps 배열을 객체로 변환 (인덱스 0~8 -> step 1~9)
        const steps = {};
        let completedCount = 0;
        
        if (student.steps && Array.isArray(student.steps)) {
          // steps 배열의 인덱스 0이 step1, 인덱스 1이 step2, ... 인덱스 8이 step9
          for (let i = 0; i < 9; i++) {
            const stepNumber = i + 1; // 1~9
            const stepContent = student.steps[i];
            
            // 문자열이 아닌 경우 문자열로 변환
            let stepText = '';
            if (stepContent !== null && stepContent !== undefined) {
              stepText = String(stepContent).trim();
            }
            
            if (stepText) {
              steps[stepNumber] = stepText;
              completedCount++;
            }
          }
        }
        
        const updatedAt = student.updatedAt || new Date().toISOString();
        const completedSteps = student.completedSteps !== undefined ? student.completedSteps : completedCount;
        
        scienceReports[studentKey] = {
          studentId: userId, // 호환성을 위해 studentId 유지
          studentName: userName, // 호환성을 위해 studentName 유지
          userId: userId,
          userName: userName,
          email: userEmail,
          picture: userPicture,
          updatedAt: updatedAt,
          completedSteps: completedSteps,
          steps: steps
        };
        
        console.log(`Processed student: ${studentName} (${studentId}), completedSteps: ${completedSteps}`);
      });
    } else {
      console.warn('No students array found in response. Response structure:', rawData);
      
      // 대체 형식 지원: 직접 배열이거나 다른 형식
      if (Array.isArray(rawData)) {
        console.log('Data is direct array format');
        rawData.forEach((student, index) => {
          if (!student || !student.studentId || !student.studentName) {
            console.warn(`Skipping invalid student at index ${index}:`, student);
            return;
          }
          
          const studentId = student.studentId;
          const studentName = student.studentName;
          const studentKey = `${studentId}|${studentName}`;
          
          const steps = {};
          let completedCount = 0;
          
          if (student.steps && Array.isArray(student.steps)) {
            for (let i = 0; i < 9; i++) {
              const stepNumber = i + 1;
              const stepContent = student.steps[i];
              let stepText = '';
              if (stepContent !== null && stepContent !== undefined) {
                stepText = String(stepContent).trim();
              }
              if (stepText) {
                steps[stepNumber] = stepText;
                completedCount++;
              }
            }
          }
          
          const updatedAt = student.updatedAt || new Date().toISOString();
          const completedSteps = student.completedSteps !== undefined ? student.completedSteps : completedCount;
          
          scienceReports[studentKey] = {
            studentId: studentId,
            studentName: studentName,
            updatedAt: updatedAt,
            completedSteps: completedSteps,
            steps: steps
          };
        });
      }
    }
    
    console.log('Converted scienceReports:', scienceReports);
    console.log('Student count:', Object.keys(scienceReports).length);
    
    if (Object.keys(scienceReports).length === 0) {
      console.warn('No students found in the data. Raw data:', rawData);
    }
    
  } catch (error) {
    console.error('Failed to load teacher dashboard data from Apps Script:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // 에러 발생 시 빈 객체로 초기화
    scienceReports = {};
    
    // 에러 메시지를 화면에 표시 (renderList에서 처리)
  } finally {
    isLoading = false;
  }
}

// Get student count
function getStudentCount() {
  return Object.keys(scienceReports).length;
}

// Get completed steps count for a student
function getCompletedStepsCount(studentKey) {
  const student = scienceReports[studentKey];
  if (!student) return 0;
  return student.completedSteps || (student.steps ? Object.keys(student.steps).length : 0);
}

// Generate sample data for testing
function generateSampleData() {
  const sampleData = {
    '406': {
      studentId: '406',
      studentName: '김신목',
      step1: '식물의 광합성에 미치는 빛의 색깔의 영향에 대해 탐구하고자 합니다.',
      step2: '일상생활에서 식물을 키우다가 빛의 색깔이 성장에 영향을 미칠 수 있다는 생각이 들었습니다.',
      step3: '빛의 색깔에 따라 식물의 광합성 속도가 달라질 것이다.',
      step4: '독립변인: 빛의 색깔(빨강, 파랑, 초록), 종속변인: 식물의 성장 속도, 통제변인: 온도, 물의 양, 식물 종류',
      step5: '같은 종류의 식물 3개를 준비하고, 각각 다른 색깔의 필터를 씌워 2주간 관찰합니다.',
      step6: '빨강 필터: 5cm 성장, 파랑 필터: 7cm 성장, 초록 필터: 3cm 성장',
      step7: '파랑 빛에서 가장 빠르게 성장했고, 초록 빛에서 가장 느리게 성장했습니다.',
      step8: '파랑 빛이 식물의 광합성에 가장 효과적이며, 초록 빛은 식물이 흡수하기 어려운 빛입니다.',
      step9: '실험 결과를 바탕으로 식물 재배 시 적절한 빛의 색깔을 선택하는 것이 중요함을 알 수 있습니다.',
      completedSteps: 8,
      updatedAt: new Date('2025-12-18T01:28:34').toISOString()
    },
    '101': {
      studentId: '101',
      studentName: '김철수',
      step1: '물의 온도가 얼음이 얼 때까지 걸리는 시간에 미치는 영향',
      step2: '겨울에 물이 얼 때 온도에 따라 얼음이 얼 때까지 걸리는 시간이 다를 것 같아서 궁금했습니다.',
      step3: '물의 온도가 낮을수록 얼음이 얼 때까지 걸리는 시간이 짧아질 것이다.',
      step4: '독립변인: 물의 초기 온도, 종속변인: 얼음이 얼 때까지 걸리는 시간',
      step5: '다양한 온도의 물을 준비하여 냉동실에 넣고 시간을 측정합니다.',
      step6: '20도: 2시간, 10도: 1시간, 5도: 30분',
      step7: '온도가 낮을수록 더 빨리 얼었습니다.',
      step8: '물의 초기 온도가 낮을수록 얼음이 되는 데 걸리는 시간이 짧아집니다.',
      step9: '실험을 통해 온도와 상태 변화의 관계를 이해할 수 있었습니다.',
      completedSteps: 9,
      updatedAt: new Date('2025-12-18T01:28:31').toISOString()
    },
    'ttokttok': {
      studentId: '6학년2반',
      studentName: '왕똑똑',
      step1: '탄산음료의 종류에 따른 이산화탄소 발생량 비교',
      step2: '탄산음료를 마시다가 종류에 따라 탄산의 양이 다른 것 같아서 궁금했습니다.',
      step3: '탄산음료의 종류에 따라 이산화탄소 발생량이 다를 것이다.',
      step4: '독립변인: 탄산음료 종류, 종속변인: 이산화탄소 발생량',
      step5: '다양한 탄산음료를 준비하고 각각에서 발생하는 이산화탄소를 측정합니다.',
      step6: '콜라: 150ml, 사이다: 120ml, 환타: 100ml',
      step7: '콜라에서 가장 많은 이산화탄소가 발생했습니다.',
      step8: '탄산음료의 종류에 따라 이산화탄소 발생량이 다르며, 콜라가 가장 많았습니다.',
      step9: '실험을 통해 탄산음료의 특성을 이해할 수 있었습니다.',
      completedSteps: 9,
      updatedAt: new Date('2025-12-18T02:20:09').toISOString()
    },
    'yeongjae': {
      studentId: '6학년4반',
      studentName: '나영재',
      step1: '종이의 두께가 종이비행기의 날아가는 거리에 미치는 영향',
      step2: '종이비행기를 만들다가 종이의 두께가 거리에 영향을 줄 것 같아서 궁금했습니다.',
      step3: '종이가 두꺼울수록 종이비행기가 더 멀리 날아갈 것이다.',
      step4: '독립변인: 종이의 두께, 종속변인: 종이비행기의 날아가는 거리',
      step5: '다양한 두께의 종이로 같은 크기의 종이비행기를 만들어 날려봅니다.',
      step6: '얇은 종이: 3m, 보통 종이: 5m, 두꺼운 종이: 4m',
      step7: '보통 두께의 종이에서 가장 멀리 날아갔습니다.',
      step8: '종이의 두께가 너무 두꺼우면 무거워져서 오히려 거리가 줄어듭니다.',
      step9: '',
      completedSteps: 6,
      updatedAt: new Date('2025-12-18T02:11:23').toISOString()
    }
  };
  
  // Convert to scienceReports format
  scienceReports = {};
  Object.keys(sampleData).forEach(studentId => {
    const student = sampleData[studentId];
    const studentKey = `${student.studentId}|${student.studentName}`;
    
    const steps = {};
    for (let i = 1; i <= 9; i++) {
      const stepKey = `step${i}`;
      if (student[stepKey] && student[stepKey].trim()) {
        steps[i] = student[stepKey].trim();
      }
    }
    
    scienceReports[studentKey] = {
      studentId: student.studentId,
      studentName: student.studentName,
      updatedAt: student.updatedAt,
      completedSteps: student.completedSteps || Object.keys(steps).length,
      steps: steps
    };
  });
  
  console.log('Sample data generated:', scienceReports);
  renderList();
}

// Refresh button handler
async function refreshData() {
  console.log('Manual refresh triggered');
  await loadTeacherDashboardData();
  renderList();
}

// Render list view
function renderList() {
  currentView = 'list';
  selectedStudentKey = null;
  
  const app = document.getElementById('app');
  const studentCount = getStudentCount();
  
  let html = `
    <div class="dashboard-container">
      <header class="dashboard-header">
        <div>
          <h1>📊 교사 대시보드</h1>
          <div class="student-count">학생 수: <strong>${studentCount}</strong>명</div>
        </div>
        <div style="display: flex; gap: 12px;">
          <button class="btn-refresh" onclick="refreshData()">🔄 새로고침</button>
          <button class="btn-sample" onclick="generateSampleData()">✨ 샘플 데이터 생성</button>
          <button class="btn-login-history" onclick="showLoginHistory()" style="background: #10b981; color: white; padding: 8px 16px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">🔐 로그인 기록</button>
        </div>
      </header>
      
      <div class="dashboard-content">
  `;
  
  if (isLoading) {
    html += `
      <div class="empty-state">
        <p><strong>데이터를 불러오는 중...</strong></p>
        <div style="margin-top: 20px;">
          <div style="width: 40px; height: 40px; border: 4px solid #e5e7eb; border-top-color: #2563eb; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
        </div>
      </div>
    `;
  } else if (studentCount === 0) {
    html += `
      <div class="empty-state">
        <p><strong>아직 제출한 학생이 없습니다.</strong></p>
        <p style="margin-top: 16px; color: #666;">Apps Script에서 데이터를 가져오는 중 오류가 발생했거나, 실제로 제출된 데이터가 없을 수 있습니다.</p>
        <p style="margin-top: 8px; color: #666;">브라우저 콘솔을 확인하여 자세한 오류 정보를 확인하세요.</p>
        <button class="btn-refresh" onclick="refreshData()" style="margin-top: 20px;">🔄 다시 시도</button>
      </div>
    `;
  } else {
    html += '<div class="student-list">';
    
    const students = Object.keys(scienceReports).sort((a, b) => {
      const dateA = new Date(scienceReports[a].updatedAt || 0);
      const dateB = new Date(scienceReports[b].updatedAt || 0);
      return dateB - dateA;
    });
    
    students.forEach(studentKey => {
      const student = scienceReports[studentKey];
      const completedCount = getCompletedStepsCount(studentKey);
      const progressPercent = (completedCount / 9) * 100;
      // Format date like "2025. 12. 18. 오전 2:20:09"
      let updatedAt = '알 수 없음';
      if (student.updatedAt) {
        const date = new Date(student.updatedAt);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        const ampm = hours < 12 ? '오전' : '오후';
        const displayHours = hours % 12 || 12;
        updatedAt = `${year}. ${month}. ${day}. ${ampm} ${displayHours}:${minutes}:${seconds}`;
      }
      
      // Format student name display (user 정보 우선 사용)
      const displayName = student.userName || student.studentName;
      const displayId = student.userId || student.studentId;
      const displayEmail = student.email || '';
      let studentDisplay = `${displayName} (${displayId})`;
      if (displayEmail) {
        studentDisplay += `<br><span style="font-size: 12px; color: #666;">${displayEmail}</span>`;
      }
      
      html += `
        <div class="student-card" data-student-key="${studentKey}">
          <div class="student-info">
            ${student.picture ? `<img src="${student.picture}" alt="프로필" style="width: 40px; height: 40px; border-radius: 50%; margin-right: 12px; border: 2px solid #c5b9e0;" />` : ''}
            <div>
              <h3>${studentDisplay}</h3>
            </div>
          </div>
            <div class="progress-info">
              <span class="progress-text">${completedCount}/9 완료</span>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${progressPercent}%"></div>
              </div>
            </div>
            <div class="updated-at">최신 제출: ${updatedAt}</div>
          </div>
          <div class="student-actions">
            <button class="btn-view" onclick="renderDetail('${studentKey}')">상세 보기</button>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
  }
  
  html += `
      </div>
    </div>
  `;
  
  app.innerHTML = html;
}

// Render detail view
function renderDetail(studentKey) {
  currentView = 'detail';
  selectedStudentKey = studentKey;
  
  const app = document.getElementById('app');
  const student = scienceReports[studentKey];
  
  if (!student) {
    console.error('Student not found:', studentKey);
    renderList();
    return;
  }
  
  let html = `
    <div class="dashboard-container">
      <header class="dashboard-header">
        <button class="btn-back" onclick="renderList()">← 목록으로</button>
        <div style="display: flex; align-items: center; gap: 12px;">
          ${student.picture ? `<img src="${student.picture}" alt="프로필" style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid #c5b9e0;" />` : ''}
          <div>
            <h1>${student.userName || student.studentName} (${student.userId || student.studentId})</h1>
            ${student.email ? `<p style="font-size: 14px; color: #666; margin-top: 4px;">${student.email}</p>` : ''}
          </div>
        </div>
        <button class="btn-evaluate" onclick="showEvaluation('${studentKey}')">📝 평가</button>
      </header>
      
      <div class="dashboard-content">
        <div class="student-detail">
  `;
  
  for (let step = 1; step <= 9; step++) {
    const stepGuide = stepGuides.find(s => s.id === step);
    const stepContent = student.steps[step] || '';
    const isCompleted = stepContent.trim() !== '';
    
    html += `
      <div class="step-card ${isCompleted ? 'completed' : 'empty'}">
        <div class="step-header">
          <h3>${step}. ${stepGuide ? stepGuide.title : `Step ${step}`}</h3>
          ${isCompleted ? '<span class="badge-completed">완료</span>' : '<span class="badge-empty">미작성</span>'}
        </div>
        <div class="step-content">
          ${isCompleted ? `<pre>${escapeHtml(stepContent)}</pre>` : '<p class="empty-text">작성된 내용이 없습니다.</p>'}
        </div>
      </div>
    `;
  }
  
  html += `
        </div>
      </div>
    </div>
  `;
  
  app.innerHTML = html;
}

// Show evaluation modal
function showEvaluation(studentKey) {
  const student = scienceReports[studentKey];
  if (!student) {
    alert('학생 정보를 찾을 수 없습니다.');
    return;
  }
  
  const evaluation = generateEvaluation(student);
  
  try {
    const evaluationData = JSON.parse(localStorage.getItem('teacherDashboardEvaluations') || '{}');
    evaluationData[student.studentId] = {
      ...evaluation,
      studentId: student.studentId,
      studentName: student.studentName,
      evaluatedAt: new Date().toISOString()
    };
    localStorage.setItem('teacherDashboardEvaluations', JSON.stringify(evaluationData));
    console.log('Evaluation saved:', evaluationData[student.studentId]);
  } catch (error) {
    console.error('Failed to save evaluation:', error);
  }
  
  const modal = document.createElement('div');
  modal.className = 'evaluation-modal';
  modal.innerHTML = `
    <div class="evaluation-content">
      <div class="evaluation-header">
        <h2>평가 결과</h2>
        <button class="btn-close" onclick="this.closest('.evaluation-modal').remove()">×</button>
      </div>
      <div class="evaluation-body">
        <div class="score-section">
          <div class="score-item">
            <span class="score-label">과학성</span>
            <span class="score-value">${evaluation.scores.scientific}/50</span>
          </div>
          <div class="score-item">
            <span class="score-label">논리성</span>
            <span class="score-value">${evaluation.scores.logical}/30</span>
          </div>
          <div class="score-item">
            <span class="score-label">창의적 아이디어</span>
            <span class="score-value">${evaluation.scores.creative}/20</span>
          </div>
          <div class="score-item total">
            <span class="score-label">총점</span>
            <span class="score-value">${evaluation.scores.total}/100</span>
          </div>
        </div>
        
        <div class="evaluation-details">
          <div class="detail-item">
            <h4>과학성</h4>
            <p>${evaluation.comments.scientific}</p>
          </div>
          <div class="detail-item">
            <h4>논리성</h4>
            <p>${evaluation.comments.logical}</p>
          </div>
          <div class="detail-item">
            <h4>창의적 아이디어</h4>
            <p>${evaluation.comments.creative}</p>
          </div>
        </div>
        
        <div class="evaluation-feedback">
          <h4>종합 피드백</h4>
          <p>${evaluation.feedback}</p>
        </div>
        
        <div class="evaluation-suggestions">
          <h4>개선 제안</h4>
          <ul>
            ${evaluation.suggestions.map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  });
}

// Generate evaluation based on rules
function generateEvaluation(student) {
  const steps = student.steps || {};
  const allText = Object.values(steps).join(' ').toLowerCase();
  const allTextLength = allText.length;
  
  const completedSteps = Object.keys(steps).length;
  
  const scientificKeywords = ['가설', '실험', '변인', '통제', '측정', '관찰', '데이터', '결과', '분석', '독립변인', '종속변인'];
  const logicalKeywords = ['왜냐하면', '따라서', '그러므로', '결론', '근거', '이유', '원인', '결과', '그래서', '때문에'];
  const creativeKeywords = ['새로운', '독특한', '창의', '혁신', '다른', '특별한', '차별화', '독창적'];
  
  const scientificKeywordCount = scientificKeywords.filter(kw => allText.includes(kw)).length;
  const logicalKeywordCount = logicalKeywords.filter(kw => allText.includes(kw)).length;
  const creativeKeywordCount = creativeKeywords.filter(kw => allText.includes(kw)).length;
  
  let scientificScore = 0;
  scientificScore += (completedSteps / 9) * 30;
  scientificScore += Math.min(20, (scientificKeywordCount / scientificKeywords.length) * 20);
  
  let logicalScore = 0;
  logicalScore += (completedSteps >= 5 ? 15 : (completedSteps / 5) * 15);
  logicalScore += Math.min(15, (logicalKeywordCount / logicalKeywords.length) * 15);
  
  let creativeScore = 0;
  creativeScore += Math.min(10, creativeKeywordCount > 0 ? 10 : 0);
  creativeScore += (completedSteps >= 7 ? 10 : (completedSteps / 7) * 10);
  
  const wordCountBonus = Math.min(5, allTextLength / 500);
  scientificScore += wordCountBonus;
  logicalScore += wordCountBonus * 0.6;
  creativeScore += wordCountBonus * 0.4;
  
  scientificScore = Math.max(0, Math.min(50, Math.round(scientificScore)));
  logicalScore = Math.max(0, Math.min(30, Math.round(logicalScore)));
  creativeScore = Math.max(0, Math.min(20, Math.round(creativeScore)));
  const totalScore = scientificScore + logicalScore + creativeScore;
  
  const scientificComment = scientificScore >= 40 
    ? '과학적 용어와 개념을 잘 활용하고 있습니다. 가설, 변인, 실험 등의 과학적 접근이 체계적입니다.'
    : scientificScore >= 25
    ? '과학적 용어 사용이 부족합니다. 가설, 실험, 변인 등의 개념을 더 명확히 다뤄주세요.'
    : '과학적 접근이 부족합니다. 각 단계에서 과학적 용어와 개념을 명확히 사용해주세요.';
  
  const logicalComment = logicalScore >= 20
    ? '논리적 흐름이 잘 연결되어 있습니다. 각 단계 간의 연결고리가 명확합니다.'
    : logicalScore >= 12
    ? '논리적 연결이 일부 부족합니다. 근거와 결론을 더 명확히 연결해주세요.'
    : '논리적 구조가 부족합니다. 각 단계 간의 인과관계를 더 명확히 표현해주세요.';
  
  const creativeComment = creativeScore >= 15
    ? '창의적이고 독특한 접근이 돋보입니다. 새로운 관점이나 방법을 잘 활용했습니다.'
    : creativeScore >= 8
    ? '일부 창의적인 요소가 있으나 더 발전시킬 여지가 있습니다.'
    : '창의적 아이디어가 부족합니다. 새로운 관점이나 독특한 방법을 시도해보세요.';
  
  let feedback = '';
  if (totalScore >= 80) {
    feedback = '전반적으로 매우 우수한 보고서입니다. 과학적 탐구 과정을 체계적으로 잘 수행했으며, 논리적 흐름도 명확합니다. 창의적인 접근도 돋보입니다. 각 단계가 잘 연결되어 있어 탐구의 전체적인 흐름을 이해하기 쉽습니다.';
  } else if (totalScore >= 60) {
    feedback = '양호한 보고서입니다. 대부분의 탐구 단계를 잘 수행했으나, 일부 부분에서 보완이 필요합니다. 과학적 용어 사용과 논리적 연결을 더 강화하면 더 좋은 보고서가 될 것입니다. 특히 각 단계 간의 연결고리를 명확히 하면 좋겠습니다.';
  } else if (totalScore >= 40) {
    feedback = '기본적인 탐구 과정은 수행했으나, 여러 부분에서 개선이 필요합니다. 각 단계를 더 체계적으로 작성하고, 과학적 개념과 논리적 연결을 강화해주세요. 특히 가설 설정과 실험 설계 부분을 더 구체적으로 작성하면 좋겠습니다.';
  } else {
    feedback = '탐구 보고서의 기본 구조는 갖추었으나, 내용이 부족합니다. 각 단계별로 더 구체적이고 상세한 내용을 작성하고, 과학적 접근과 논리적 흐름을 개선해주세요. 모든 단계를 완성하고 각 단계 간의 연결을 명확히 하는 것이 중요합니다.';
  }
  
  const suggestions = [];
  if (completedSteps < 9) {
    suggestions.push(`모든 단계를 완성해주세요. 현재 ${completedSteps}/9 단계만 작성되었습니다.`);
  }
  if (scientificKeywordCount < 5) {
    suggestions.push('과학적 용어(가설, 실험, 변인, 결과 등)를 더 많이 사용해주세요.');
  }
  if (logicalKeywordCount < 3) {
    suggestions.push('논리적 연결어(왜냐하면, 따라서, 결론 등)를 사용하여 단계 간 연결을 강화해주세요.');
  }
  while (suggestions.length < 3) {
    suggestions.push('글자 수를 늘려 더 상세한 설명을 추가해주세요.');
  }
  
  return {
    scores: {
      scientific: scientificScore,
      logical: logicalScore,
      creative: creativeScore,
      total: totalScore
    },
    comments: {
      scientific: scientificComment,
      logical: logicalComment,
      creative: creativeComment
    },
    feedback: feedback,
    suggestions: suggestions.slice(0, 3)
  };
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Show login history view
function showLoginHistory() {
  currentView = 'login-history';
  selectedStudentKey = null;
  
  const app = document.getElementById('app');
  const loginCount = Object.keys(loginHistory).length;
  const totalLogins = Object.values(loginHistory).reduce((sum, logs) => sum + (Array.isArray(logs) ? logs.length : 0), 0);
  
  let html = `
    <div class="dashboard-container">
      <header class="dashboard-header">
        <button class="btn-back" onclick="renderList()">← 목록으로</button>
        <div>
          <h1>🔐 로그인 기록</h1>
          <div class="student-count">사용자 수: <strong>${loginCount}</strong>명 | 총 로그인: <strong>${totalLogins}</strong>회</div>
        </div>
        <button class="btn-refresh" onclick="refreshData(); showLoginHistory();">🔄 새로고침</button>
      </header>
      
      <div class="dashboard-content">
  `;
  
  if (loginCount === 0) {
    html += `
      <div class="empty-state">
        <p><strong>로그인 기록이 없습니다.</strong></p>
        <p style="margin-top: 16px; color: #666;">학생들이 로그인하면 여기에 기록이 표시됩니다.</p>
      </div>
    `;
  } else {
    html += '<div class="login-history-list">';
    
    // 사용자별로 정렬 (최근 로그인 순)
    const users = Object.keys(loginHistory).sort((a, b) => {
      const logsA = loginHistory[a];
      const logsB = loginHistory[b];
      const lastLoginA = Array.isArray(logsA) && logsA.length > 0 ? new Date(logsA[logsA.length - 1].timestamp || 0) : new Date(0);
      const lastLoginB = Array.isArray(logsB) && logsB.length > 0 ? new Date(logsB[logsB.length - 1].timestamp || 0) : new Date(0);
      return lastLoginB - lastLoginA;
    });
    
    users.forEach(userId => {
      const logs = loginHistory[userId];
      if (!Array.isArray(logs) || logs.length === 0) return;
      
      // 첫 번째 로그인 정보 (사용자 이름, 이메일)
      const firstLog = logs[0];
      const userName = firstLog.name || firstLog.userName || '알 수 없음';
      const userEmail = firstLog.email || '';
      const loginCount = logs.length;
      
      // 최근 로그인 시간
      const lastLog = logs[logs.length - 1];
      const lastLoginTime = lastLog.timestamp ? new Date(lastLog.timestamp) : null;
      
      let lastLoginText = '알 수 없음';
      if (lastLoginTime) {
        const year = lastLoginTime.getFullYear();
        const month = String(lastLoginTime.getMonth() + 1).padStart(2, '0');
        const day = String(lastLoginTime.getDate()).padStart(2, '0');
        const hours = lastLoginTime.getHours();
        const minutes = String(lastLoginTime.getMinutes()).padStart(2, '0');
        const seconds = String(lastLoginTime.getSeconds()).padStart(2, '0');
        const ampm = hours < 12 ? '오전' : '오후';
        const displayHours = hours % 12 || 12;
        lastLoginText = `${year}. ${month}. ${day}. ${ampm} ${displayHours}:${minutes}:${seconds}`;
      }
      
      html += `
        <div class="login-history-card">
          <div class="login-history-header">
            <div style="display: flex; align-items: center; gap: 12px;">
              ${firstLog.picture ? `<img src="${firstLog.picture}" alt="프로필" style="width: 48px; height: 48px; border-radius: 50%; border: 2px solid #c5b9e0;" />` : ''}
              <div>
                <h3>${userName}</h3>
                ${userEmail ? `<p style="font-size: 14px; color: #666; margin-top: 4px;">${userEmail}</p>` : ''}
                <p style="font-size: 12px; color: #999; margin-top: 4px;">ID: ${userId}</p>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 24px; font-weight: bold; color: #9333ea;">${loginCount}</div>
              <div style="font-size: 12px; color: #666;">회 로그인</div>
            </div>
          </div>
          <div class="login-history-info">
            <div><strong>최근 로그인:</strong> ${lastLoginText}</div>
            <div><strong>첫 로그인:</strong> ${logs[0].timestamp ? formatDate(new Date(logs[0].timestamp)) : '알 수 없음'}</div>
          </div>
          <details style="margin-top: 12px;">
            <summary style="cursor: pointer; padding: 8px; background: #f3f4f6; border-radius: 8px; font-weight: bold;">
              📋 전체 로그인 기록 보기 (${loginCount}건)
            </summary>
            <div style="margin-top: 12px; max-height: 300px; overflow-y: auto; background: #f9fafb; padding: 12px; border-radius: 8px;">
              ${logs.reverse().map((log, idx) => {
                const logTime = log.timestamp ? new Date(log.timestamp) : null;
                let logTimeText = '알 수 없음';
                if (logTime) {
                  const year = logTime.getFullYear();
                  const month = String(logTime.getMonth() + 1).padStart(2, '0');
                  const day = String(logTime.getDate()).padStart(2, '0');
                  const hours = logTime.getHours();
                  const minutes = String(logTime.getMinutes()).padStart(2, '0');
                  const seconds = String(logTime.getSeconds()).padStart(2, '0');
                  const ampm = hours < 12 ? '오전' : '오후';
                  const displayHours = hours % 12 || 12;
                  logTimeText = `${year}. ${month}. ${day}. ${ampm} ${displayHours}:${minutes}:${seconds}`;
                }
                return `<div style="padding: 8px; border-bottom: 1px solid #e5e7eb; ${idx === logs.length - 1 ? 'border-bottom: none;' : ''}">
                  <div style="font-weight: bold;">${logTimeText}</div>
                </div>`;
              }).join('')}
            </div>
          </details>
        </div>
      `;
    });
    
    html += '</div>';
  }
  
  html += `
      </div>
    </div>
  `;
  
  app.innerHTML = html;
}

// Format date helper
function formatDate(date) {
  if (!date || isNaN(date.getTime())) return '알 수 없음';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  const ampm = hours < 12 ? '오전' : '오후';
  const displayHours = hours % 12 || 12;
  return `${year}. ${month}. ${day}. ${ampm} ${displayHours}:${minutes}:${seconds}`;
}

// Make functions available globally
window.renderList = renderList;
window.renderDetail = renderDetail;
window.showEvaluation = showEvaluation;
window.refreshData = refreshData;
window.generateSampleData = generateSampleData;
window.showLoginHistory = showLoginHistory;

// Initialize dashboard when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', async function() {
    await loadTeacherDashboardData();
    renderList();
    
    // Refresh data periodically (every 30 seconds)
    setInterval(async () => {
      if (currentView === 'list' && !isLoading) {
        await loadTeacherDashboardData();
        renderList();
      }
    }, 30000);
  });
} else {
  (async function() {
    await loadTeacherDashboardData();
    renderList();
    
    // Refresh data periodically (every 30 seconds)
    setInterval(async () => {
      if (currentView === 'list' && !isLoading) {
        await loadTeacherDashboardData();
        renderList();
      }
    }, 30000);
  })();
}
