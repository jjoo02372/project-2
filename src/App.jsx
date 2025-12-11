import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import StepProgress from './components/StepProgress';
import StepCard from './components/StepCard';
import AIAssistant from './components/AIAssistant';
import ReportPreview from './components/ReportPreview';
import ExportButton from './components/ExportButton';
import { stepGuides } from './data/stepGuides';

const STORAGE_KEY = 'science-inquiry-report';

function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [reportData, setReportData] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  const [aiResponse, setAiResponse] = useState('');

  // LocalStorage에서 데이터 로드
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        setReportData(JSON.parse(savedData));
      } catch (error) {
        console.error('Failed to load saved data:', error);
      }
    }
  }, []);

  // LocalStorage에 데이터 저장
  useEffect(() => {
    if (Object.keys(reportData).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(reportData));
    }
  }, [reportData]);

  const handleStepChange = (stepId) => {
    setCurrentStep(stepId);
    setAiResponse('');
  };

  const handleContentChange = (content) => {
    setReportData((prev) => ({
      ...prev,
      [currentStep]: content,
    }));
  };

  const handleAIResponse = (response) => {
    setAiResponse(response);
  };

  const handleNextStep = () => {
    if (currentStep < stepGuides.length) {
      setCurrentStep(currentStep + 1);
      setAiResponse('');
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setAiResponse('');
    }
  };

  const currentStepData = stepGuides.find((step) => step.id === currentStep);
  const currentContent = reportData[currentStep] || '';

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <StepProgress currentStep={currentStep} onStepClick={handleStepChange} reportData={reportData} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <StepCard
              step={currentStepData}
              content={currentContent}
              onContentChange={handleContentChange}
            />
            
            <AIAssistant
              step={currentStepData}
              content={currentContent}
              onAIResponse={handleAIResponse}
            />

            {aiResponse && (
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg mb-6">
                <h4 className="font-semibold text-gray-800 mb-2">🤖 AI 제안:</h4>
                <p className="text-gray-700 whitespace-pre-wrap">{aiResponse}</p>
              </div>
            )}

            <div className="flex justify-between items-center bg-white rounded-lg shadow-md p-4">
              <button
                onClick={handlePrevStep}
                disabled={currentStep === 1}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                ← 이전 단계
              </button>
              <span className="text-gray-600 font-medium">
                {currentStep} / {stepGuides.length}
              </span>
              <button
                onClick={handleNextStep}
                disabled={currentStep === stepGuides.length}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                다음 단계 →
              </button>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6 sticky top-4">
              <h3 className="text-xl font-semibold mb-4 text-gray-800">작성 현황</h3>
              <div className="space-y-2">
                {stepGuides.map((step) => {
                  const content = reportData[step.id] || '';
                  const contentLength = content.trim().length;
                  
                  // 색상 결정: 현재 페이지=파란색, 10자 이상=초록색, 0~9자=회색
                  let bgColor = 'bg-gray-50';
                  if (step.id === currentStep) {
                    bgColor = 'bg-blue-100';
                  } else if (contentLength >= 10) {
                    bgColor = 'bg-green-50';
                  }
                  
                  return (
                    <div
                      key={step.id}
                      className={`flex items-center justify-between p-2 rounded ${bgColor}`}
                    >
                      <span className="text-sm text-gray-700">
                        {step.icon || '📝'} {step.id}. {step.title}
                      </span>
                      {contentLength >= 10 && (
                        <span className="text-green-600 text-sm">✓</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => setShowPreview(true)}
                className="w-full mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                📄 미리보기
              </button>
            </div>

            <ExportButton reportData={reportData} />
          </div>
        </div>
      </div>

      <ReportPreview
        reportData={reportData}
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
      />
    </div>
  );
}

export default App;

