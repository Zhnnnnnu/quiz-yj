import React from 'react';
import { useNavigate } from 'react-router-dom';

/** 首页 - 三个核心功能入口 */
export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const modules = [
    {
      title: '练习模式',
      desc: '按年份选择题库，逐题练习，自动记录错题',
      icon: '📝',
      color: 'from-blue-600 to-blue-400',
      path: '/practice',
    },
    {
      title: '模拟考试',
      desc: '50题随机组卷，2小时限时，模拟真实考试',
      icon: '🏆',
      color: 'from-amber-500 to-orange-400',
      path: '/exam',
    },
    {
      title: '错题集',
      desc: '回顾错题，巩固练习，直至全部掌握',
      icon: '📋',
      color: 'from-rose-600 to-red-400',
      path: '/wrong',
    },
  ];

  return (
    <div className="page-enter min-h-screen flex flex-col px-5 py-8">
      {/* 顶部标题 */}
      <div className="text-center mb-10 mt-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-500/20 border border-tech-border/50 mb-4">
          <span className="text-4xl">🛡️</span>
        </div>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
          禁毒King
        </h1>
        <p className="text-slate-400 text-sm mt-2">
          青少年禁毒知识竞赛刷题助手
        </p>
      </div>

      {/* 三个功能入口 */}
      <div className="flex-1 space-y-4">
        {modules.map((m) => (
          <button
            key={m.path}
            onClick={() => navigate(m.path)}
            className="card w-full text-left active:scale-[0.98] transition-all duration-200"
          >
            <div className="flex items-center gap-4">
              <div
                className={`flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center text-2xl`}
              >
                {m.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-slate-100">
                  {m.title}
                </h3>
                <p className="text-sm text-slate-400 mt-1">{m.desc}</p>
              </div>
              <svg
                className="w-5 h-5 text-slate-500 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </button>
        ))}
      </div>

      {/* 底部信息 */}
      <p className="text-center text-xs text-slate-500 mt-8 pb-4">
        支持离线使用 · 数据本地存储
      </p>
    </div>
  );
};
