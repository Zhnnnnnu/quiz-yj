import React, { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { PracticeSelectYear, PracticePage, PracticeComplete } from './pages/PracticePage';
import { ExamPage, ExamResultPage } from './pages/ExamPage';
import { WrongQuestionsPage } from './pages/WrongQuestionsPage';
import { syncWrongQuestionsFromBank } from './database/db';

/**
 * 应用根组件
 * 使用 HashRouter 确保静态文件部署时路由正常工作
 */
const App: React.FC = () => {
  // 题库修正答案后，将错题本中的旧答案快照同步为最新值（只执行一次）
  useEffect(() => {
    syncWrongQuestionsFromBank();
  }, []);

  return (
    <HashRouter>
      <Routes>
        {/* 首页 */}
        <Route path="/" element={<HomePage />} />

        {/* 练习模式 */}
        <Route path="/practice" element={<PracticeSelectYear />} />
        <Route path="/practice/:year" element={<PracticePage />} />
        <Route path="/practice/complete" element={<PracticeComplete />} />

        {/* 模拟考试 */}
        <Route path="/exam" element={<ExamPage />} />
        <Route path="/exam/result" element={<ExamResultPage />} />

        {/* 错题集 */}
        <Route path="/wrong" element={<WrongQuestionsPage />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
