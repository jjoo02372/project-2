import React, { useState } from 'react';

const AIAssistant = ({ step, content, onAIResponse }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAIAssist = async () => {
    if (!content.trim()) {
      alert('먼저 내용을 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // ChatGPT API 호출
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY || 'your-api-key-here'}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `당신은 과학 탐구 보고서 작성 도우미입니다. 사용자가 작성한 "${step.title}" 단계의 내용을 검토하고 개선 제안을 해주세요.`
            },
            {
              role: 'user',
              content: step.aiPrompt 
                ? `${step.aiPrompt}\n\n작성한 내용:\n${content}`
                : `다음은 "${step.title}" 단계에 작성한 내용입니다:\n\n${content}\n\n이 내용을 검토하고 개선 제안을 해주세요.`
            }
          ],
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error('API 호출에 실패했습니다.');
      }

      const data = await response.json();
      const aiMessage = data.choices[0].message.content;
      onAIResponse(aiMessage);
    } catch (err) {
      setError('AI 도움을 받을 수 없습니다. API 키를 확인하거나 나중에 다시 시도해주세요.');
      console.error('AI API Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <span className="text-2xl">🤖</span> AI 도움 받기
        </h3>
        <button
          onClick={handleAIAssist}
          disabled={isLoading || !content.trim()}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? '처리 중...' : 'AI 검토 요청'}
        </button>
      </div>
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      <div className="bg-white rounded p-4 border border-purple-200">
        <p className="text-sm text-gray-600">
          💡 AI가 작성한 내용을 검토하고 개선 제안을 해드립니다. API 키가 설정되어 있어야 합니다.
        </p>
      </div>
    </div>
  );
};

export default AIAssistant;

