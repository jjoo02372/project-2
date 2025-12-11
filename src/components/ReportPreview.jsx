import React from 'react';
import { stepGuides } from '../data/stepGuides';

const ReportPreview = ({ reportData, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800">보고서 미리보기</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        <div className="p-6">
          <div className="prose max-w-none">
            <h1 className="text-3xl font-bold mb-6 text-center">과학 탐구 보고서</h1>
            {stepGuides.map((step) => {
              const content = reportData[step.id] || '';
              if (!content.trim()) return null;
              return (
                <div key={step.id} className="mb-8">
                  <h2 className="text-2xl font-bold mb-3 text-gray-800 flex items-center gap-2">
                    <span>{step.icon || '📝'}</span>
                    {step.id}. {step.title}
                  </h2>
                  <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {content}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportPreview;

