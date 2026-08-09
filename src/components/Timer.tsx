import React, { useEffect, useState, useCallback, useRef } from 'react';

interface TimerProps {
  startTime: number;      // 考试开始时间戳
  maxDuration: number;    // 最大时长（秒），2小时=7200秒
  onTimeUp: () => void;   // 时间到回调
}

/** 倒计时组件 */
export const Timer: React.FC<TimerProps> = ({ startTime, maxDuration, onTimeUp }) => {
  const [remaining, setRemaining] = useState(maxDuration);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  const tick = useCallback(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const left = Math.max(0, maxDuration - elapsed);
    setRemaining(left);

    if (left <= 0) {
      onTimeUpRef.current();
    }
  }, [startTime, maxDuration]);

  useEffect(() => {
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [tick]);

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  const pad = (n: number) => String(n).padStart(2, '0');

  // 剩余不足5分钟时变红闪烁
  const isWarning = remaining <= 300 && remaining > 60;
  const isDanger = remaining <= 60;

  const stateClass = isDanger ? 'timer danger' : isWarning ? 'timer warning' : 'timer';

  return (
    <div className={`${stateClass} text-tech-accent`}>
      {pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </div>
  );
};
