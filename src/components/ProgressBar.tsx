import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
}

/** 答题进度条 */
export const ProgressBar: React.FC<ProgressBarProps> = ({ current, total }) => {
  const pct = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="w-full">
      <div className="flex justify-between mb-1.5 text-xs text-slate-400">
        <span>
          第 {current} / {total} 题
        </span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};
