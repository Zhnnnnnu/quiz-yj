import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Question, addWrongQuestion, saveAnswerRecord } from '../database/db';
import { OptionButton } from '../components/OptionButton';
import { ProgressBar } from '../components/ProgressBar';
import { shuffle } from '../utils/shuffle';
import questionsData from '../data/questions.json';

// ==================== 练习进度持久化 ====================

const PROGRESS_KEY = 'practice_progress';

interface PracticeProgress {
  year: number;
  questionIds: string[];   // 打乱后的题目顺序
  currentIndex: number;
  results: { questionId: string; correct: boolean }[];
}

function saveProgress(progress: PracticeProgress): void {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

function loadProgress(year: number): PracticeProgress | null {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PracticeProgress;
    if (data.year !== year) return null; // 不同年份不恢复
    return data;
  } catch {
    return null;
  }
}

function clearProgress(): void {
  localStorage.removeItem(PROGRESS_KEY);
}

// ==================== 年份选择页面 ====================

const YEARS = [2021, 2022, 2023, 2024, 2025];

export const PracticeSelectYear: React.FC = () => {
  const navigate = useNavigate();

  const yearCounts: Record<number, number> = {};
  (questionsData as Question[]).forEach((q) => {
    yearCounts[q.year] = (yearCounts[q.year] || 0) + 1;
  });

  return (
    <div className="page-enter min-h-screen flex flex-col px-5 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/')}
          className="text-slate-400 p-2 -ml-2"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-xl font-bold text-slate-100">选择练习年份</h2>
      </div>

      <p className="text-slate-400 text-sm mb-6">选择一个年份，开始随机练习</p>

      <div className="flex-1 space-y-3">
        {YEARS.map((year) => {
          const hasProgress = loadProgress(year) !== null;
          return (
            <button
              key={year}
              onClick={() => navigate(`/practice/${year}`)}
              className="card w-full flex items-center justify-between active:scale-[0.98] transition-all duration-200"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-tech-accent/10 flex items-center justify-center text-tech-accent font-bold text-sm">
                  {year}
                </div>
                <div>
                  <span className="text-slate-200 font-medium">{year}年题库</span>
                  {hasProgress && (
                    <span className="block text-xs text-amber-400 mt-0.5">有未完成的练习</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-400">{yearCounts[year] || 0} 题</span>
                <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ==================== 练习答题页面 ====================

export const PracticePage: React.FC = () => {
  const { year } = useParams<{ year: string }>();
  const navigate = useNavigate();
  const yearNum = parseInt(year || '2025');

  // 按年份筛选题目
  const allYearQuestions = useMemo(() => {
    return (questionsData as Question[]).filter((q) => q.year === yearNum);
  }, [yearNum]);

  // 初始化：尝试恢复进度，否则随机打乱
  const [questions, setQuestions] = useState<Question[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [questionResults, setQuestionResults] = useState<
    { questionId: string; correct: boolean }[]
  >([]);

  // 初始化题目顺序
  useEffect(() => {
    if (allYearQuestions.length === 0) {
      setInitialized(true);
      return;
    }

    const saved = loadProgress(yearNum);
    if (saved && saved.questionIds && saved.questionIds.length > 0) {
      // 恢复进度：按保存的 ID 顺序重建题目列表
      const idMap = new Map(allYearQuestions.map((q) => [q.id, q]));
      const restored: Question[] = [];
      for (const id of saved.questionIds) {
        const q = idMap.get(id);
        if (q) restored.push(q);
      }
      // 添加可能新增的题目（保存的进度中没有的）
      for (const q of allYearQuestions) {
        if (!saved.questionIds.includes(q.id)) restored.push(q);
      }

      setQuestions(restored);
      setCurrentIndex(saved.currentIndex);
      setQuestionResults(saved.results);
    } else {
      setQuestions(shuffle(allYearQuestions));
      setCurrentIndex(0);
      setQuestionResults([]);
    }
    setInitialized(true);
  }, [allYearQuestions, yearNum]);

  // 同步保存进度
  useEffect(() => {
    if (!initialized || questions.length === 0) return;
    saveProgress({
      year: yearNum,
      questionIds: questions.map((q) => q.id),
      currentIndex,
      results: questionResults,
    });
  }, [initialized, yearNum, questions, currentIndex, questionResults]);

  const total = questions.length;
  const currentQuestion = questions[currentIndex];
  const isLast = currentIndex >= total - 1;

  // 选择选项
  const handleSelect = useCallback((option: string) => {
    if (!submitted) {
      setSelectedOption(option);
    }
  }, [submitted]);

  // 确认提交
  const handleSubmit = useCallback(async () => {
    if (selectedOption === null || submitted || !currentQuestion) return;

    const isCorrect = selectedOption === currentQuestion.answer;
    setSubmitted(true);

    // 答题结果统计
    setQuestionResults((prev) => [
      ...prev,
      { questionId: currentQuestion.id, correct: isCorrect },
    ]);

    // 答错：加入错题集（fire-and-forget）
    if (!isCorrect) {
      addWrongQuestion(currentQuestion);
    }

    // 保存答题记录（fire-and-forget）
    saveAnswerRecord({
      questionId: currentQuestion.id,
      year: currentQuestion.year,
      userAnswer: selectedOption,
      isCorrect,
      mode: 'practice',
      timestamp: Date.now(),
    });
  }, [selectedOption, submitted, currentQuestion]);

  // 下一题 或 完成
  const handleNext = useCallback(() => {
    if (isLast) {
      clearProgress(); // 练习完成，清除进度
      const correctCount = questionResults.filter((r) => r.correct).length;
      navigate('/practice/complete', {
        state: {
          year: yearNum,
          total: questionResults.length,
          correct: correctCount,
          wrong: questionResults.length - correctCount,
        },
      });
    } else {
      setSelectedOption(null);
      setSubmitted(false);
      setCurrentIndex((i) => i + 1);
    }
  }, [isLast, questionResults, yearNum, navigate]);

  // 退出练习
  const handleExit = useCallback(() => {
    if (questionResults.length > 0 && !isLast) {
      // 有做题记录，确认是否退出（进度已自动保存）
      if (window.confirm('确定要退出吗？当前进度已自动保存，下次进入可继续练习。')) {
        navigate('/practice');
      }
    } else {
      navigate('/practice');
    }
  }, [questionResults, isLast, navigate]);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-400">加载中...</p>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5">
        <p className="text-slate-400 text-lg mb-4">该年份没有题目数据</p>
        <button onClick={() => navigate('/practice')} className="btn-secondary">
          返回选择年份
        </button>
      </div>
    );
  }

  return (
    <div className="page-enter min-h-screen flex flex-col px-5 py-4">
      {/* 顶部导航 — 始终可退出 */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={handleExit}
          className="text-slate-400 p-2 -ml-2"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="text-sm text-slate-400">{yearNum}年题库</div>
        </div>
        {/* 进度指示 */}
        <div className="text-xs text-slate-500">
          {currentIndex + 1}/{total}
        </div>
      </div>

      {/* 进度条 */}
      <ProgressBar current={currentIndex + 1} total={total} />

      {/* 题目区域 */}
      <div className="flex-1 flex flex-col mt-5">
        {/* 题目卡片 */}
        <div className="card mb-5">
          <div className="text-xs text-tech-accent mb-2">
            第 {currentIndex + 1} 题（共 {total} 题）
          </div>
          <p className="text-base leading-relaxed text-slate-100">
            {currentQuestion.question}
          </p>
        </div>

        {/* 选项列表 */}
        <div className="flex-1">
          {(Object.keys(currentQuestion.options) as Array<'A' | 'B' | 'C' | 'D'>)
            .filter((key) => currentQuestion.options[key].trim() !== '')
            .map((key) => (
            <OptionButton
              key={key}
              label={key}
              text={currentQuestion.options[key]}
              selected={selectedOption === key}
              disabled={submitted}
              isCorrect={submitted && key === currentQuestion.answer}
              isUserAnswer={submitted && key === selectedOption}
              onClick={() => handleSelect(key)}
            />
          ))}
        </div>

        {/* 提交后的结果提示 */}
        {submitted && (
          <div className="mt-3 mb-3">
            {selectedOption === currentQuestion.answer ? (
              <div className="text-center py-3 rounded-xl bg-tech-success/10 border border-tech-success/30">
                <span className="text-emerald-400 font-semibold text-lg">✅ 回答正确</span>
              </div>
            ) : (
              <div className="text-center py-3 rounded-xl bg-tech-error/10 border border-tech-error/30">
                <span className="text-red-400 font-semibold">
                  正确答案：{currentQuestion.answer}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="pb-6 pt-2">
          {!submitted ? (
            <button
              className="btn-primary"
              disabled={selectedOption === null}
              onClick={handleSubmit}
            >
              确认提交
            </button>
          ) : (
            <button className="btn-primary" onClick={handleNext}>
              {isLast ? '查看结果' : '下一题 →'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== 练习完成页面 ====================

export const PracticeComplete: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const state = (location.state || { year: 0, total: 0, correct: 0, wrong: 0 }) as {
    year: number;
    total: number;
    correct: number;
    wrong: number;
  };

  const { year, total, correct, wrong } = state;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <div className="page-enter min-h-screen flex flex-col px-5 py-8 items-center justify-center text-center">
      <div className="text-6xl mb-6">
        {accuracy >= 80 ? '🎉' : accuracy >= 60 ? '👍' : '💪'}
      </div>
      <h2 className="text-2xl font-bold text-slate-100 mb-2">练习完成</h2>
      <p className="text-slate-400 mb-8">
        {year > 0 ? `${year}年题库` : ''} · {total} 题
      </p>

      {/* 统计卡片 */}
      <div className="w-full grid grid-cols-3 gap-3 mb-8">
        <div className="card text-center">
          <div className="text-2xl font-bold text-blue-400">{total}</div>
          <div className="text-xs text-slate-400 mt-1">总题数</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-emerald-400">{correct}</div>
          <div className="text-xs text-slate-400 mt-1">正确</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-red-400">{wrong}</div>
          <div className="text-xs text-slate-400 mt-1">错误</div>
        </div>
      </div>

      {/* 正确率大数字 */}
      <div className="mb-8">
        <div className="text-5xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
          {accuracy}%
        </div>
        <div className="text-sm text-slate-400 mt-2">正确率</div>
      </div>

      <div className="w-full space-y-3">
        <button onClick={() => {
          clearProgress();
          navigate(`/practice/${year}`);
        }} className="btn-primary">
          再练一次
        </button>
        <button onClick={() => navigate('/practice')} className="btn-secondary">
          选择其他年份
        </button>
        {wrong > 0 && (
          <button onClick={() => navigate('/wrong')} className="btn-secondary border-rose-500/50 text-rose-400">
            查看错题集
          </button>
        )}
      </div>
    </div>
  );
};
