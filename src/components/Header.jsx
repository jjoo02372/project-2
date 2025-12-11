import React from 'react';

const Header = () => {
  return (
    <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-6 shadow-lg">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-center flex items-center justify-center gap-2">
          <span>🔬</span> 과학 탐구 보고서 도우미
        </h1>
        <p className="text-center mt-2 text-blue-100">나만의 과학자 포트폴리오 만들기</p>
      </div>
    </header>
  );
};

export default Header;

