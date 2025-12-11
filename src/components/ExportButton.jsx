import React from 'react';
import { stepGuides } from '../data/stepGuides';

const ExportButton = ({ reportData }) => {
  const generateReportText = () => {
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
  };

  const generateReportHTML = () => {
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
  };

  const exportTXT = () => {
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
  };

  const exportHTML = () => {
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
  };

  const hasContent = Object.values(reportData).some(content => content.trim());

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">보고서 내보내기</h3>
      <div className="flex gap-4">
        <button
          onClick={exportTXT}
          disabled={!hasContent}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <span>📄</span> TXT 파일로 저장
        </button>
        <button
          onClick={exportHTML}
          disabled={!hasContent}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <span>🌐</span> HTML 파일로 저장
        </button>
      </div>
      {!hasContent && (
        <p className="text-sm text-gray-500 mt-2">내보낼 내용이 없습니다. 먼저 보고서를 작성해주세요.</p>
      )}
    </div>
  );
};

export default ExportButton;

