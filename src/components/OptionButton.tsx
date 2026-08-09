import React from 'react';

interface OptionButtonProps {
  label: string;      // "A" | "B" | "C" | "D"
  text: string;        // 选项内容
  selected: boolean;   // 用户是否选中
  disabled: boolean;   // 是否禁用（已提交答案后）
  isCorrect?: boolean; // 是否是正确答案（提交后展示）
  isUserAnswer?: boolean; // 是否是用户选择的答案（提交后展示）
  onClick: () => void;
}

/**
 * 选项按钮组件
 * 支持四种状态：
 * - 默认：蓝色边框
 * - 用户选中（未提交）：高亮边框
 * - 答对（提交后）：绿色
 * - 答错（提交后）：红色 + 正确答案高亮绿色
 */
export const OptionButton: React.FC<OptionButtonProps> = ({
  label,
  text,
  selected,
  disabled,
  isCorrect,
  isUserAnswer,
  onClick,
}) => {
  let stateClass = '';

  if (disabled && isCorrect) {
    // 这是正确答案（无论用户是否选中它）
    stateClass = 'correct';
  } else if (disabled && isUserAnswer && !isCorrect) {
    // 用户选了这个，但它是错的
    stateClass = 'wrong';
  } else if (selected) {
    stateClass = 'selected';
  }

  return (
    <button
      className={`btn-option flex items-center gap-3 ${stateClass}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
          ${selected && !disabled ? 'bg-tech-accent text-tech-bg' : 'bg-tech-border/30 text-slate-300'}
          ${disabled && isCorrect ? 'bg-tech-success text-white' : ''}
          ${disabled && isUserAnswer && !isCorrect ? 'bg-tech-error text-white' : ''}
        `}
      >
        {label}
      </span>
      <span className="flex-1 leading-relaxed">{text}</span>
    </button>
  );
};
