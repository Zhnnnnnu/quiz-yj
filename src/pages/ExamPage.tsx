import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Question,
  addWrongQuestion,
  saveAnswerRecord,
  saveExamRecord,
  type ExamQuestionResult,
} from '../database/db';
import { OptionButton } from '../components/OptionButton';
import { ProgressBar } from '../components/ProgressBar';
import { Timer } from '../components/Timer';
import { shuffle } from '../utils/shuffle';
import questionsData from '../data/questions.json';

const EXAM_SIZE = 50;
const MAX_DURATION = 2 * 60 * 60; // 2小时（秒）

/** 模拟考试页面 */
export const ExamPage: React.FC = () => {
  const navigate = useNavigate();

  // 随机抽取50题
  const questions = useMemo(() => {
    return shuffle(questionsData as Question[]).slice(0, EXAM_SIZE);
  }, []);

  const startTimeRef = useRef(Date.now());

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);     // 考试是否结束
  const [results, setResults] = useState<ExamQuestionResult[]>([]);
  // ref 保持 results 最新值，防止 handleTimeUp 中的闭包过期
  const resultsRef = useRef<ExamQuestionResult[]>([]);
  useEffect(() => {
    resultsRef.current = results;
  }, [results]);

  const currentQuestion = questions[currentIndex];

  // 提交当前题答案 → 记录后直接进入下一题，不显示对错
  const handleSubmit = useCallback(async () => {
    if (selectedOption === null || !currentQuestion) return;

    const isCorrect = selectedOption === currentQuestion.answer;

    // 记录结果
    const result: ExamQuestionResult = {
      questionId: currentQuestion.id,
      year: currentQuestion.year,
      question: currentQuestion.question,
      options: currentQuestion.options,
      correctAnswer: currentQuestion.answer,
      userAnswer: selectedOption,
      isCorrect,
    };
    const updatedResults = [...resultsRef.current, result];
    resultsRef.current = updatedResults;
    setResults(updatedResults);

    // 答错加入错题集（fire-and-forget，不阻塞跳转）
    if (!isCorrect) {
      addWrongQuestion(currentQuestion);
    }
    // 保存答题记录（fire-and-forget，不阻塞跳转）
    saveAnswerRecord({
      questionId: currentQuestion.id,
      year: currentQuestion.year,
      userAnswer: selectedOption,
      isCorrect,
      mode: 'exam',
      timestamp: Date.now(),
    });

    // 判断是否结束
    if (currentIndex >= EXAM_SIZE - 1) {
      // 最后一题 → 交卷
      if (finished) return;
      setFinished(true);
      const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const correctCount = updatedResults.filter((r) => r.isCorrect).length;
      const wrongCount = updatedResults.length - correctCount;
      const score = updatedResults.length > 0 ? Math.round((correctCount / updatedResults.length) * 100) : 0;

      await saveExamRecord({
        date: Date.now(),
        totalQuestions: EXAM_SIZE,
        correctCount,
        wrongCount,
        score,
        duration,
        questionResults: updatedResults,
      });

      navigate('/exam/result', {
        state: { total: updatedResults.length, correct: correctCount, wrong: wrongCount, score, duration, results: updatedResults },
      });
    } else {
      // 直接进入下一题，不显示对错反馈
      setSelectedOption(null);
      setCurrentIndex((i) => i + 1);
    }
  }, [selectedOption, currentQuestion, currentIndex, finished, navigate]);

  // 时间到自动交卷
  const handleTimeUp = useCallback(async () => {
    if (finished) return;
    setFinished(true);

    let finalResults = [...resultsRef.current];

    // 如果当前题已选择但未提交，自动记录
    if (currentQuestion && selectedOption) {
      const isCorrect = selectedOption === currentQuestion.answer;
      const result: ExamQuestionResult = {
        questionId: currentQuestion.id,
        year: currentQuestion.year,
        question: currentQuestion.question,
        options: currentQuestion.options,
        correctAnswer: currentQuestion.answer,
        userAnswer: selectedOption,
        isCorrect,
      };
      finalResults = [...finalResults, result];

      if (!isCorrect) addWrongQuestion(currentQuestion);
      saveAnswerRecord({
        questionId: currentQuestion.id,
        year: currentQuestion.year,
        userAnswer: selectedOption,
        isCorrect,
        mode: 'exam',
        timestamp: Date.now(),
      });
    }

    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    const correctCount = finalResults.filter((r) => r.isCorrect).length;
    const wrongCount = finalResults.length - correctCount;
    const score = finalResults.length > 0 ? Math.round((correctCount / finalResults.length) * 100) : 0;

    await saveExamRecord({
      date: Date.now(),
      totalQuestions: EXAM_SIZE,
      correctCount,
      wrongCount,
      score,
      duration,
      questionResults: finalResults,
    });

    navigate('/exam/result', {
      state: { total: finalResults.length, correct: correctCount, wrong: wrongCount, score, duration, results: finalResults },
    });
  }, [finished, currentQuestion, selectedOption, navigate]);

  // 阻止意外刷新/关闭
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!finished) e.preventDefault();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [finished]);

  return (
    <div className="page-enter min-h-screen flex flex-col px-5 py-4">
      {/* 顶部：返回 + 计时器 + 进度 */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => {
            if (results.length > 0) {
              if (window.confirm('确定要退出考试吗？已答题目不会保存为考试记录。')) {
                navigate('/');
              }
            } else {
              navigate('/');
            }
          }}
          className="text-slate-400 p-1 -ml-1 flex-shrink-0"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 flex items-center justify-between">
          <Timer
            startTime={startTimeRef.current}
            maxDuration={MAX_DURATION}
            onTimeUp={handleTimeUp}
          />
          <span className="text-sm text-slate-400">
            {currentIndex + 1} / {EXAM_SIZE}
          </span>
        </div>
      </div>

      <ProgressBar current={currentIndex + 1} total={EXAM_SIZE} />

      {/* 题目区域 */}
      <div className="flex-1 flex flex-col mt-5">
        <div className="card mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-tech-accent/10 text-tech-accent">
              第 {currentIndex + 1} 题
            </span>
            <span className="text-xs text-slate-500">
              {currentQuestion.year}年
            </span>
          </div>
          <p className="text-base leading-relaxed text-slate-100">
            {currentQuestion.question}
          </p>
        </div>

        {/* 选项 — 考试中不显示对错高亮 */}
        <div className="flex-1">
          {(Object.keys(currentQuestion.options) as Array<'A' | 'B' | 'C' | 'D'>)
            .filter((key) => currentQuestion.options[key].trim() !== '')
            .map((key) => (
            <OptionButton
              key={key}
              label={key}
              text={currentQuestion.options[key]}
              selected={selectedOption === key}
              disabled={false}
              isCorrect={false}
              isUserAnswer={false}
              onClick={() => setSelectedOption(key)}
            />
          ))}
        </div>

        {/* 操作按钮 */}
        <div className="pb-6 pt-2">
          <button
            className="btn-primary"
            disabled={selectedOption === null}
            onClick={handleSubmit}
          >
            {currentIndex >= EXAM_SIZE - 1 ? '交卷' : '确认答案 →'}
          </button>
        </div>
      </div>
    </div>
  );
};

/** 模拟考试结果页面 */
export const ExamResultPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const state = (location.state || {}) as {
    total?: number;
    correct?: number;
    wrong?: number;
    score?: number;
    duration?: number;
    results?: ExamQuestionResult[];
  };

  const { total = 0, correct = 0, wrong = 0, score = 0, duration = 0, results = [] } = state;

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
  };

  const getGradeComment = (s: number) => {
    if (s >= 90) return { emoji: '🏆', text: '太棒了！知识掌握非常扎实！' };
    if (s >= 80) return { emoji: '🎉', text: '优秀！继续保持！' };
    if (s >= 60) return { emoji: '👍', text: '及格了，再加把劲！' };
    return { emoji: '💪', text: '还需努力，多刷错题！' };
  };

  const grade = getGradeComment(score);

  return (
    <div className="page-enter min-h-screen flex flex-col px-5 py-8">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">{grade.emoji}</div>
        <h2 className="text-2xl font-bold text-slate-100 mb-2">考试结束</h2>
        <p className="text-slate-400">{grade.text}</p>
      </div>

      {/* 核心数据 */}
      <div className="grid grid-cols-3 gap-3 mb-6">
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

      {/* 正确率 */}
      <div className="card text-center mb-6">
        <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
          {score}%
        </div>
        <div className="text-sm text-slate-400 mt-1">正确率</div>
      </div>

      {/* 用时 */}
      <div className="card text-center mb-6">
        <div className="font-mono text-xl text-tech-accent">
          {formatDuration(duration)}
        </div>
        <div className="text-sm text-slate-400 mt-1">用时</div>
      </div>

      {/* 错题列表 */}
      {results.filter((r) => !r.isCorrect).length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-200 mb-3">
            错题列表（{results.filter((r) => !r.isCorrect).length} 题）
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {results
              .filter((r) => !r.isCorrect)
              .map((r, i) => (
                <div key={i} className="card">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-slate-500 mt-0.5">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300 line-clamp-2">{r.question}</p>
                      <div className="flex gap-3 mt-1.5 text-xs">
                        <span className="text-red-400">
                          你的答案：{r.userAnswer}
                        </span>
                        <span className="text-emerald-400">
                          正确：{r.correctAnswer}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="space-y-3 mt-auto">
        <button onClick={() => navigate('/exam')} className="btn-primary">
          再考一次
        </button>
        <button onClick={() => navigate('/')} className="btn-secondary">
          返回首页
        </button>
        {wrong > 0 && (
          <button
            onClick={() => navigate('/wrong')}
            className="btn-secondary border-rose-500/50 text-rose-400"
          >
            复习错题
          </button>
        )}
      </div>
    </div>
  );
};
