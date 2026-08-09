import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAllWrongQuestions,
  removeWrongQuestion,
  saveAnswerRecord,
  type WrongQuestion,
} from '../database/db';
import { OptionButton } from '../components/OptionButton';
import { ProgressBar } from '../components/ProgressBar';

/** 错题集页面 */
export const WrongQuestionsPage: React.FC = () => {
  const navigate = useNavigate();

  // 页面模式：列表 / 答题
  const [mode, setMode] = useState<'list' | 'quiz'>('list');
  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  // 加载错题数据
  const loadWrongQuestions = useCallback(async () => {
    const data = await getAllWrongQuestions();
    setWrongQuestions(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadWrongQuestions();
  }, [loadWrongQuestions]);

  const currentQuestion = wrongQuestions[currentIndex];
  const isLast = currentIndex >= wrongQuestions.length - 1;

  // 提交答案
  const handleSubmit = useCallback(async () => {
    if (selectedOption === null || submitted || !currentQuestion) return;

    const isCorrect = selectedOption === currentQuestion.answer;
    setSubmitted(true);

    // 保存答题记录（fire-and-forget）
    saveAnswerRecord({
      questionId: currentQuestion.id,
      year: currentQuestion.year,
      userAnswer: selectedOption,
      isCorrect,
      mode: 'wrong',
      timestamp: Date.now(),
    });
  }, [selectedOption, submitted, currentQuestion]);

  // 下一题
  const handleNext = useCallback(() => {
    if (isLast) {
      // 错题全部做完
      loadWrongQuestions();
      setMode('list');
    } else {
      setSelectedOption(null);
      setSubmitted(false);
      setCurrentIndex((i) => i + 1);
    }
  }, [isLast, loadWrongQuestions]);

  // 标记"掌握"（从错题集移除）
  const handleMastered = useCallback(
    async (id: string) => {
      await removeWrongQuestion(id);
      await loadWrongQuestions();
    },
    [loadWrongQuestions],
  );

  // 删除所有错题
  const handleClearAll = useCallback(async () => {
    if (window.confirm('确定要清空所有错题吗？此操作不可撤销。')) {
      for (const q of wrongQuestions) {
        await removeWrongQuestion(q.id);
      }
      await loadWrongQuestions();
    }
  }, [wrongQuestions, loadWrongQuestions]);

  // ==================== 列表视图 ====================
  if (mode === 'list') {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-slate-400">加载中...</p>
        </div>
      );
    }

    return (
      <div className="page-enter min-h-screen flex flex-col px-5 py-6">
        {/* 顶部导航 */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/')}
            className="text-slate-400 p-2 -ml-2"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-slate-100">错题集</h2>
          {wrongQuestions.length > 0 && (
            <span className="text-sm text-slate-400 ml-auto">
              {wrongQuestions.length} 题
            </span>
          )}
        </div>

        {wrongQuestions.length === 0 ? (
          /* 空白状态 */
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-lg font-semibold text-slate-300 mb-2">
              暂无错题
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              练习或考试中答错的题目会自动加入这里
            </p>
            <button onClick={() => navigate('/practice')} className="btn-primary max-w-xs">
              去练习
            </button>
          </div>
        ) : (
          <>
            {/* 操作栏 */}
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => {
                  setCurrentIndex(0);
                  setSelectedOption(null);
                  setSubmitted(false);
                  setMode('quiz');
                }}
                className="btn-primary flex-1"
              >
                开始复习（{wrongQuestions.length}题）
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-3 rounded-xl border border-tech-border/50 text-slate-400 text-sm"
              >
                清空
              </button>
            </div>

            {/* 错题列表 */}
            <div className="flex-1 space-y-2 overflow-y-auto">
              {wrongQuestions.map((q, i) => (
                <div key={q.id} className="card">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-slate-500 mt-0.5">{i + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-tech-accent/10 text-tech-accent">
                          {q.year}
                        </span>
                        {q.wrongCount > 1 && (
                          <span className="text-xs text-rose-400">
                            答错 {q.wrongCount} 次
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed line-clamp-2">
                        {q.question}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        答案：<span className="text-emerald-400">{q.answer}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleMastered(q.id)}
                      className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-tech-success/10 text-tech-success text-xs font-medium active:scale-95 transition-all"
                    >
                      已掌握
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  // ==================== 错题答题视图 ====================
  return (
    <div className="page-enter min-h-screen flex flex-col px-5 py-4">
      {/* 顶部 */}
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={() => setMode('list')}
          className="text-slate-400 p-2 -ml-2"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="text-sm text-slate-400">错题复习</div>
      </div>

      <ProgressBar current={currentIndex + 1} total={wrongQuestions.length} />

      {/* 题目 */}
      <div className="flex-1 flex flex-col mt-5">
        <div className="card mb-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-tech-accent/10 text-tech-accent">
              第 {currentIndex + 1} 题
            </span>
            <span className="text-xs text-slate-500">{currentQuestion.year}年</span>
            {currentQuestion.wrongCount > 1 && (
              <span className="text-xs text-rose-400">
                历史错误 {currentQuestion.wrongCount} 次
              </span>
            )}
          </div>
          <p className="text-base leading-relaxed text-slate-100">
            {currentQuestion.question}
          </p>
        </div>

        {/* 选项 */}
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
              onClick={() => setSelectedOption(key)}
            />
          ))}
        </div>

        {/* 结果 + 掌握/未掌握 */}
        {submitted && (
          <div className="mt-3 mb-3 space-y-3">
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

            {/* 掌握/未掌握 选择 */}
            <div className="card">
              <p className="text-sm text-slate-300 text-center mb-3">请选择：</p>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    await removeWrongQuestion(currentQuestion.id);
                    // 从 DB 直接获取最新列表，避免闭包中 stale 的 wrongQuestions.length
                    const updatedList = await getAllWrongQuestions();
                    setWrongQuestions(updatedList);

                    if (updatedList.length === 0 || currentIndex >= updatedList.length) {
                      // 删除后当前位置已超出新列表范围（删的是最后一道）→ 返回列表
                      setMode('list');
                    } else {
                      // 删除后数组前移，当前位置自动指向下一题，不递增 currentIndex
                      setSelectedOption(null);
                      setSubmitted(false);
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-tech-success/10 border border-tech-success/30 text-tech-success font-semibold text-sm active:scale-95 transition-all"
                >
                  已掌握
                </button>
                <button
                  onClick={() => {
                    if (isLast) {
                      loadWrongQuestions();
                      setMode('list');
                    } else {
                      setSelectedOption(null);
                      setSubmitted(false);
                      setCurrentIndex((i) => i + 1);
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-tech-warning/10 border border-tech-warning/30 text-tech-warning font-semibold text-sm active:scale-95 transition-all"
                >
                  未掌握
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        {!submitted && (
          <div className="pb-6 pt-2">
            <button
              className="btn-primary"
              disabled={selectedOption === null}
              onClick={handleSubmit}
            >
              确认提交
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
