import { stepGuides } from './data/stepGuides.js';
import './teacher-dashboard.css';

const TEACHER_DASHBOARD_DATA_KEY = 'teacherDashboardData';
const DEV = true; // 개발 모드 플래그

// Dashboard State
let currentView = 'list'; // 'list' or 'detail'
let selectedStudentKey = null;
let scienceReports = {};

// Load teacher dashboard data from localStorage
function loadTeacherDashboardData() {
  try {
    // 디버깅: localStorage의 모든 키 출력
    console.log('=== Teacher Dashboard Debug ===');
    console.log('All localStorage keys:', Object.keys(localStorage));
    
    const data = localStorage.getItem(TEACHER_DASHBOARD_DATA_KEY);
    console.log('Looking for key:', TEACHER_DASHBOARD_DATA_KEY);
    console.log('Found data:', data ? 'Yes' : 'No');
    
    if (data) {
      const rawData = JSON.parse(data);
      console.log('Raw data:', rawData);
      
      // 데이터 구조 변환: { studentId: {...} } -> { studentId|studentName: {...} }
      scienceReports = {};
      Object.keys(rawData).forEach(studentId => {
        const student = rawData[studentId];
        const studentKey = `${student.studentId}|${student.studentName}`;
        
        // steps 객체로 변환
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
      
      console.log('Converted scienceReports:', scienceReports);
      console.log('Student count:', Object.keys(scienceReports).length);
    } else {
      scienceReports = {};
      console.log('No data found in teacherDashboardData');
    }
  } catch (error) {
    console.error('Failed to load teacher dashboard data:', error);
    scienceReports = {};
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
  // completedSteps가 있으면 사용, 없으면 steps 객체의 키 개수 사용
  return student.completedSteps || (student.steps ? Object.keys(student.steps).length : 0);
}

// Generate sample data for testing
function generateSampleData() {
  const sampleData = {
    '101': {
      studentId: '101',
      studentName: '김철수',
      step1: '식물의 광합성에 미치는 빛의 색깔의 영향에 대해 탐구하고자 합니다.',
      step2: '일상생활에서 식물을 키우다가 빛의 색깔이 성장에 영향을 미칠 수 있다는 생각이 들었습니다.',
      step3: '빛의 색깔에 따라 식물의 광합성 속도가 달라질 것이다.',
      step4: '독립변인: 빛의 색깔(빨강, 파랑, 초록), 종속변인: 식물의 성장 속도, 통제변인: 온도, 물의 양, 식물 종류',
      step5: '같은 종류의 식물 3개를 준비하고, 각각 다른 색깔의 필터를 씌워 2주간 관찰합니다.',
      step6: '빨강 필터: 5cm 성장, 파랑 필터: 7cm 성장, 초록 필터: 3cm 성장',
      step7: '파랑 빛에서 가장 빠르게 성장했고, 초록 빛에서 가장 느리게 성장했습니다.',
      step8: '파랑 빛이 식물의 광합성에 가장 효과적이며, 초록 빛은 식물이 흡수하기 어려운 빛입니다.',
      step9: '실험 결과를 바탕으로 식물 재배 시 적절한 빛의 색깔을 선택하는 것이 중요함을 알 수 있습니다.',
      completedSteps: 9,
      updatedAt: new Date().toISOString()
    },
    '102': {
      studentId: '102',
      studentName: '이영희',
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
      updatedAt: new Date(Date.now() - 3600000).toISOString()
    },
    '103': {
      studentId: '103',
      studentName: '박민수',
      step1: '탄산음료의 종류에 따른 이산화탄소 발생량 비교',
      step2: '탄산음료를 마시다가 종류에 따라 탄산의 양이 다른 것 같아서 궁금했습니다.',
      step3: '탄산음료의 종류에 따라 이산화탄소 발생량이 다를 것이다.',
      step4: '독립변인: 탄산음료 종류, 종속변인: 이산화탄소 발생량',
      step5: '다양한 탄산음료를 준비하고 각각에서 발생하는 이산화탄소를 측정합니다.',
      step6: '',
      step7: '',
      step8: '',
      step9: '',
      completedSteps: 5,
      updatedAt: new Date(Date.now() - 7200000).toISOString()
    }
  };
  
  localStorage.setItem(TEACHER_DASHBOARD_DATA_KEY, JSON.stringify(sampleData));
  console.log('Sample data generated:', sampleData);
  loadTeacherDashboardData();
  renderList();
}

// Render list view
function renderList() {
  currentView = 'list';
  selectedStudentKey = null;
  
  const app = document.getElementById('teacher-dashboard-app');
  const studentCount = getStudentCount();
  
  let html = `
    <div class="dashboard-container">
      <header class="dashboard-header">
        <div>
          <h1>📊 교사 대시보드</h1>
          <div class="student-count">학생 수: <strong>${studentCount}</strong>명</div>
        </div>
        ${DEV ? '<button class="btn-dev" onclick="generateSampleData()">🧪 샘플 데이터 생성</button>' : ''}
      </header>
      
      <div class="dashboard-content">
  `;
  
  if (studentCount === 0) {
    // 디버깅 정보 표시
    const allKeys = Object.keys(localStorage);
    const teacherDashboardData = localStorage.getItem(TEACHER_DASHBOARD_DATA_KEY);
    
    html += `
      <div class="empty-state">
        <p><strong>아직 제출한 학생이 없습니다.</strong></p>
        <div class="debug-info">
          <h3>디버깅 정보</h3>
          <p><strong>찾은 키:</strong> ${TEACHER_DASHBOARD_DATA_KEY}</p>
          <p><strong>데이터 존재:</strong> ${teacherDashboardData ? '예' : '아니오'}</p>
          <p><strong>전체 localStorage 키 수:</strong> ${allKeys.length}</p>
          ${DEV ? '<p><button class="btn-dev-small" onclick="generateSampleData()">샘플 데이터 생성하여 테스트</button></p>' : ''}
        </div>
      </div>
    `;
  } else {
    html += '<div class="student-list">';
    
    // Sort students by updatedAt (newest first)
    const students = Object.keys(scienceReports).sort((a, b) => {
      const dateA = new Date(scienceReports[a].updatedAt || 0);
      const dateB = new Date(scienceReports[b].updatedAt || 0);
      return dateB - dateA;
    });
    
    students.forEach(studentKey => {
      const student = scienceReports[studentKey];
      const completedCount = getCompletedStepsCount(studentKey);
      const progressPercent = (completedCount / 9) * 100;
      const updatedAt = student.updatedAt ? new Date(student.updatedAt).toLocaleString('ko-KR') : '알 수 없음';
      
      html += `
        <div class="student-card" data-student-key="${studentKey}">
          <div class="student-info">
            <h3>${student.studentName} (${student.studentId})</h3>
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
  
  const app = document.getElementById('teacher-dashboard-app');
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
        <h1>${student.studentName} (${student.studentId})</h1>
        <button class="btn-evaluate" onclick="showEvaluation('${studentKey}')">📝 평가</button>
      </header>
      
      <div class="dashboard-content">
        <div class="student-detail">
  `;
  
  // Render all 9 steps
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
  
  // 평가 결과를 localStorage에 저장
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
  
  // Count completed steps
  const completedSteps = Object.keys(steps).length;
  
  // Check for keywords
  const scientificKeywords = ['가설', '실험', '변인', '통제', '측정', '관찰', '데이터', '결과', '분석', '독립변인', '종속변인'];
  const logicalKeywords = ['왜냐하면', '따라서', '그러므로', '결론', '근거', '이유', '원인', '결과', '그래서', '때문에'];
  const creativeKeywords = ['새로운', '독특한', '창의', '혁신', '다른', '특별한', '차별화', '독창적'];
  
  const scientificKeywordCount = scientificKeywords.filter(kw => allText.includes(kw)).length;
  const logicalKeywordCount = logicalKeywords.filter(kw => allText.includes(kw)).length;
  const creativeKeywordCount = creativeKeywords.filter(kw => allText.includes(kw)).length;
  
  // Calculate scores
  // 과학성 (50점): 단계 완성도(30점) + 키워드(20점)
  let scientificScore = 0;
  scientificScore += (completedSteps / 9) * 30; // Step completion: 30 points
  scientificScore += Math.min(20, (scientificKeywordCount / scientificKeywords.length) * 20); // Keywords: 20 points
  
  // 논리성 (30점): 단계 완성도(15점) + 키워드(15점)
  let logicalScore = 0;
  logicalScore += (completedSteps >= 5 ? 15 : (completedSteps / 5) * 15); // Step completion: 15 points
  logicalScore += Math.min(15, (logicalKeywordCount / logicalKeywords.length) * 15); // Keywords: 15 points
  
  // 창의적 아이디어 (20점): 키워드(10점) + 완성도(10점)
  let creativeScore = 0;
  creativeScore += Math.min(10, creativeKeywordCount > 0 ? 10 : 0); // Creative keywords: 10 points
  creativeScore += (completedSteps >= 7 ? 10 : (completedSteps / 7) * 10); // Completeness: 10 points
  
  // 글자수 보너스 (각 점수에 최대 5점 추가)
  const wordCountBonus = Math.min(5, allTextLength / 500); // 500자당 1점, 최대 5점
  scientificScore += wordCountBonus;
  logicalScore += wordCountBonus * 0.6;
  creativeScore += wordCountBonus * 0.4;
  
  // Clamp scores
  scientificScore = Math.max(0, Math.min(50, Math.round(scientificScore)));
  logicalScore = Math.max(0, Math.min(30, Math.round(logicalScore)));
  creativeScore = Math.max(0, Math.min(20, Math.round(creativeScore)));
  const totalScore = scientificScore + logicalScore + creativeScore;
  
  // Generate comments
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
  
  // Generate feedback
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
  
  // Generate suggestions
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
  if (suggestions.length === 0) {
    suggestions.push('각 단계의 내용을 더 구체적이고 상세하게 작성해주세요.');
  }
  
  // Ensure exactly 3 suggestions
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
    suggestions: suggestions.slice(0, 3) // Max 3 suggestions
  };
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Make functions available globally for onclick handlers
window.renderList = renderList;
window.renderDetail = renderDetail;
window.showEvaluation = showEvaluation;
window.generateSampleData = generateSampleData;

// Initialize dashboard
loadTeacherDashboardData();
renderList();

// Refresh data periodically (every 5 seconds)
setInterval(() => {
  if (currentView === 'list') {
    loadTeacherDashboardData();
    renderList();
  }
}, 5000);
