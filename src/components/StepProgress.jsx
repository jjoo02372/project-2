import React from 'react';
import { stepGuides } from '../data/stepGuides';

const StepProgress = ({ currentStep, onStepClick, reportData }) => {
  const getStepColor = (stepId) => {
    // 현재 페이지는 파란색
    if (stepId === currentStep) {
      return 'bg-blue-600 text-white shadow-md scale-105';
    }
    
    // 해당 단계의 내용 길이 확인
    const content = reportData[stepId] || '';
    const contentLength = content.trim().length;
    
    // 10자 이상이면 초록색, 0~9자면 회색
    if (contentLength >= 10) {
      return 'bg-green-500 text-white hover:bg-green-600';
    } else {
      return 'bg-gray-200 text-gray-700 hover:bg-gray-300';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">진행 상황</h2>
      <div className="flex flex-wrap gap-2">
        {stepGuides.map((step) => (
          <button
            key={step.id}
            onClick={() => onStepClick(step.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${getStepColor(step.id)}`}
          >
            {step.icon || '📝'} {step.id}. {step.title}
          </button>
        ))}
      </div>
    </div>
  );
};

export default StepProgress;

