// IndexedDB 数据库封装层
// 使用 idb 库简化 IndexedDB 操作，提供 Promise 风格 API

import { openDB, type IDBPDatabase } from 'idb';

// ==================== 数据类型定义 ====================

/** 题库中的单题 */
export interface Question {
  id: string;          // e.g. "2025-001"
  year: number;        // 2021-2025
  question: string;    // 题目文本
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  answer: string;      // "A" | "B" | "C" | "D"
}

/** 错题记录 */
export interface WrongQuestion {
  id: string;          // question id
  year: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  answer: string;
  wrongCount: number;  // 累计答错次数
  addedAt: number;     // 首次加入时间戳
}

/** 答题记录 */
export interface AnswerRecord {
  id?: number;         // auto-increment
  questionId: string;
  year: number;
  userAnswer: string;
  isCorrect: boolean;
  mode: 'practice' | 'exam' | 'wrong'; // 答题模式
  timestamp: number;
}

/** 模拟考试记录 */
export interface ExamRecord {
  id?: number;
  date: number;          // 完成时间戳
  totalQuestions: number; // 总题数
  correctCount: number;   // 正确数
  wrongCount: number;     // 错误数
  score: number;          // 正确率 (0-100)
  duration: number;       // 用时（秒）
  questionResults: ExamQuestionResult[]; // 每道题的答题结果
}

/** 模拟考试中单题结果 */
export interface ExamQuestionResult {
  questionId: string;
  year: number;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
}

// ==================== 数据库配置 ====================

const DB_NAME = 'anti-drug-king-db';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase | null = null;

/** 获取数据库实例（单例） */
async function getDB(): Promise<IDBPDatabase> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 错题存储
      if (!db.objectStoreNames.contains('wrong_questions')) {
        const wrongStore = db.createObjectStore('wrong_questions', { keyPath: 'id' });
        wrongStore.createIndex('year', 'year');
        wrongStore.createIndex('addedAt', 'addedAt');
      }

      // 答题记录
      if (!db.objectStoreNames.contains('answer_records')) {
        const recordStore = db.createObjectStore('answer_records', {
          keyPath: 'id',
          autoIncrement: true,
        });
        recordStore.createIndex('questionId', 'questionId');
        recordStore.createIndex('timestamp', 'timestamp');
        recordStore.createIndex('mode', 'mode');
      }

      // 模拟考试记录
      if (!db.objectStoreNames.contains('exam_records')) {
        const examStore = db.createObjectStore('exam_records', {
          keyPath: 'id',
          autoIncrement: true,
        });
        examStore.createIndex('date', 'date');
      }
    },
  });

  return dbInstance;
}

// ==================== 错题集操作 ====================

/** 添加错题（已存在则更新 wrongCount） */
export async function addWrongQuestion(q: Question): Promise<void> {
  const db = await getDB();
  const existing = await db.get('wrong_questions', q.id);

  if (existing) {
    // 已存在：更新错误次数
    await db.put('wrong_questions', {
      ...existing,
      wrongCount: existing.wrongCount + 1,
    });
  } else {
    // 新错题
    const wrongQ: WrongQuestion = {
      id: q.id,
      year: q.year,
      question: q.question,
      options: q.options,
      answer: q.answer,
      wrongCount: 1,
      addedAt: Date.now(),
    };
    await db.put('wrong_questions', wrongQ);
  }
}

/** 删除错题（用户标记"掌握"） */
export async function removeWrongQuestion(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('wrong_questions', id);
}

/** 获取所有错题 */
export async function getAllWrongQuestions(): Promise<WrongQuestion[]> {
  const db = await getDB();
  return db.getAll('wrong_questions');
}

/** 按年份获取错题 */
export async function getWrongQuestionsByYear(year: number): Promise<WrongQuestion[]> {
  const db = await getDB();
  return db.getAllFromIndex('wrong_questions', 'year', year);
}

/** 获取错题数量 */
export async function getWrongQuestionCount(): Promise<number> {
  const db = await getDB();
  return db.count('wrong_questions');
}

/** 判断某题是否在错题集中 */
export async function isWrongQuestion(id: string): Promise<boolean> {
  const db = await getDB();
  const result = await db.get('wrong_questions', id);
  return !!result;
}

// ==================== 答题记录操作 ====================

/** 保存答题记录 */
export async function saveAnswerRecord(record: Omit<AnswerRecord, 'id'>): Promise<void> {
  const db = await getDB();
  await db.add('answer_records', record);
}

/** 获取所有答题记录（按时间倒序） */
export async function getAnswerRecords(limit?: number): Promise<AnswerRecord[]> {
  const db = await getDB();
  const records = await db.getAllFromIndex('answer_records', 'timestamp');
  const sorted = records.sort((a, b) => b.timestamp - a.timestamp);
  return limit ? sorted.slice(0, limit) : sorted;
}

/** 获取某道题的答题记录 */
export async function getQuestionRecords(questionId: string): Promise<AnswerRecord[]> {
  const db = await getDB();
  return db.getAllFromIndex('answer_records', 'questionId', questionId);
}

// ==================== 模拟考试记录操作 ====================

/** 保存模拟考试记录 */
export async function saveExamRecord(record: Omit<ExamRecord, 'id'>): Promise<void> {
  const db = await getDB();
  await db.add('exam_records', record);
}

/** 获取所有模拟考试记录（按时间倒序） */
export async function getExamRecords(): Promise<ExamRecord[]> {
  const db = await getDB();
  const records = await db.getAllFromIndex('exam_records', 'date');
  return records.sort((a, b) => b.date - a.date);
}

/** 获取模拟考试记录数量 */
export async function getExamRecordCount(): Promise<number> {
  const db = await getDB();
  return db.count('exam_records');
}

// ==================== 数据导出/导入 ====================

/** 导出全部数据（用于备份） */
export async function exportAllData(): Promise<string> {
  const wrongQuestions = await getAllWrongQuestions();
  const answerRecords = await getAnswerRecords();
  const examRecords = await getExamRecords();

  const data = {
    version: 1,
    exportedAt: Date.now(),
    wrongQuestions,
    answerRecords,
    examRecords,
  };

  return JSON.stringify(data, null, 2);
}

/** 导入数据（用于恢复备份） */
export async function importData(jsonStr: string): Promise<void> {
  const data = JSON.parse(jsonStr);

  if (!data.version || !data.wrongQuestions) {
    throw new Error('无效的备份文件格式');
  }

  const db = await getDB();

  // 清空现有数据
  await db.clear('wrong_questions');
  await db.clear('answer_records');
  await db.clear('exam_records');

  // 导入数据
  for (const wq of data.wrongQuestions) {
    await db.put('wrong_questions', wq);
  }
  for (const ar of data.answerRecords) {
    await db.add('answer_records', ar);
  }
  for (const er of data.examRecords) {
    await db.add('exam_records', er);
  }
}
