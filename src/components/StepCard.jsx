import React from 'react';

const StepCard = ({ step, content, onContentChange }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="mb-4">
        <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center gap-2">
          <span>{step.icon || '📝'}</span>
          {step.id}. {step.title}
        </h2>
        <p className="text-gray-600 mb-2">{step.description}</p>
        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded mb-3">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">💡 가이드:</span> {step.guide}
          </p>
        </div>
        {step.prompts && step.prompts.length > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
            <p className="text-sm font-semibold text-gray-800 mb-2">💭 작성 시 고려할 질문:</p>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              {step.prompts.map((prompt, index) => (
                <li key={index}>{prompt}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <textarea
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
        placeholder={step.placeholder}
        className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
      />
      <p className="text-sm text-gray-500 mt-2">글자 수: {content.length}</p>
    </div>
  );
};

export default StepCard;

