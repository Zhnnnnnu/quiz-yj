// Fisher-Yates 洗牌算法，用于随机打乱题目顺序
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** 从数组中随机抽取 n 个元素 */
export function randomPick<T>(array: T[], n: number): T[] {
  return shuffle(array).slice(0, Math.min(n, array.length));
}
