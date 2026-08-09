/**
 * DOCX 题库转换脚本
 *
 * 使用 pandoc 将 DOCX 转为 Markdown，然后解析结构化数据生成 JSON。
 *
 * 前置依赖: pandoc (需在系统 PATH 中)
 *
 * 使用方法：
 *   node scripts/convert-docx.js <input.docx> [output.json]
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// ==================== 解析逻辑 ====================

/**
 * 从 pandoc 生成的 markdown 文本中解析题目
 *
 * Markdown 格式：
 *   **2021年全国青少年禁毒知识竞赛**
 *   **中学组题库（共108题）**
 *
 *   **1.** 题目内容...
 *
 *   > **A.** 选项A
 *   >
 *   > **B.** 选项B
 *   >
 *   > **C.** 选项C
 *   >
 *   > **D.** 选项D
 *   >
 *   > **答案：C**
 */
function parseMarkdownQuestions(md) {
  const lines = md.split('\n');
  const questions = [];

  let currentYear = null;
  let yearIdx = 0;

  // 将整个文件按"**year**标题"切分为年份块
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 检测年份标题: "**2021年全国青少年禁毒知识竞赛**"
    const yearMatch = line.match(/\*\*(\d{4})年全国青少年禁毒知识竞赛\*\*/);
    if (yearMatch) {
      currentYear = parseInt(yearMatch[1]);
      yearIdx = 0;

      // 向前查找直到遇到下一个年份标题或文件结束
      let j = i + 1;
      // 跳过 "**中学组题库（共XX题）**" 行
      while (j < lines.length && lines[j].includes('中学组题库')) {
        j++;
      }

      // 收集当前年份的所有题目
      while (j < lines.length) {
        const l = lines[j];

        // 遇到下一个年份标题就停止
        if (/\*\*(\d{4})年全国青少年禁毒知识竞赛\*\*/.test(l)) {
          break;
        }

        // 检测题目开始: "**数字.**"
        const qMatch = l.match(/^\*\*(\d+)\.\*\*\s*(.*)$/);
        if (qMatch && currentYear) {
          yearIdx++;

          // 从当前行开始收集完整的题目块（直到遇到空行组结束或下一题）
          const blockLines = [l];
          j++;
          while (j < lines.length) {
            const nl = lines[j];
            // 遇到下一题或年份标题就停止
            if (/^\*\*(\d+)\.\*\*/.test(nl) || /\*\*(\d{4})年全国青少年禁毒知识竞赛\*\*/.test(nl)) {
              break;
            }
            // 跳过目录和其他元数据
            if (nl.includes('各年份题目数量') || nl.includes('总计：') || nl.includes('目录')) {
              j++;
              continue;
            }
            blockLines.push(nl);
            j++;
          }

          const q = parseSingleQuestionBlock(blockLines, currentYear, yearIdx);
          if (q) {
            questions.push(q);
          }
          continue;
        }

        j++;
      }

      // 回退外层循环指针
      i = j - 1;
    }
  }

  return questions;
}

/**
 * 解析单个题目的 markdown 块
 */
function parseSingleQuestionBlock(lines, year, yearIdx) {
  // 第一行是题目
  const firstLine = lines[0].trim();
  const qMatch = firstLine.match(/^\*\*(\d+)\.\*\*\s*(.*)$/);
  if (!qMatch) return null;

  let questionText = qMatch[2].trim();

  // 如果题目跨多行（即 firstLine 文本很短，可能是被截断了），
  // 继续收集直到遇到选项块
  if (!questionText || questionText.endsWith('（') || questionText.endsWith('(')) {
    for (let i = 1; i < lines.length; i++) {
      const l = lines[i].trim();
      if (l.startsWith('>')) break; // 遇到选项块
      if (!l || l.startsWith('**')) continue;
      questionText += l;
    }
  }

  // 从后续行中提取选项和答案
  const fullText = lines.join('\n');

  // 提取答案: "> **答案：C**"
  const ansMatch = fullText.match(/>\s*\*\*答案[：:]\s*([A-D])\*\*/);
  if (!ansMatch) return null;
  const answer = ansMatch[1];

  // 提取选项: "> **A.** xxx"
  const options = {};
  const optionRegex = />\s*\*\*([A-D])\.\*\*\s*(.*?)(?:\n|$)/g;
  let optMatch;
  while ((optMatch = optionRegex.exec(fullText)) !== null) {
    const label = optMatch[1];
    let text = optMatch[2].trim();

    // 清理 markdown 格式
    text = text.replace(/\*\*/g, '').trim();

    if (label && text) {
      options[label] = text;
    }
  }

  // 需要至少2个选项（支持判断题A/B格式）
  if (!answer || Object.keys(options).length < 2) return null;

  // 对于只有2个选项的情况（判断题），补齐为4个选项
  if (Object.keys(options).length === 2 && options.A && options.B) {
    // 判断题格式，保留A/B
    // 不补齐，应用层面处理
  }

  // 清理题目文本
  questionText = questionText.replace(/\s+/g, ' ').trim();

  return {
    id: `${year}-${String(yearIdx).padStart(3, '0')}`,
    year,
    question: questionText,
    options: {
      A: options.A || '',
      B: options.B || '',
      C: options.C || '',
      D: options.D || '',
    },
    answer,
  };
}

// ==================== 主函数 ====================

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error('用法: node scripts/convert-docx.js <input.docx> [output.json]');
    process.exit(1);
  }

  const inputPath = args[0];
  const outputPath = args[1] || 'src/data/questions.json';

  if (!fs.existsSync(inputPath)) {
    console.error(`错误: 找不到文件 "${inputPath}"`);
    process.exit(1);
  }

  console.log(`📖 转换 DOCX → Markdown: ${inputPath}`);

  // 使用 pandoc 转换
  let markdown;
  try {
    markdown = execSync(`pandoc "${inputPath}" -t markdown --wrap=none`, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024, // 50MB
    });
  } catch (err) {
    console.error('❌ pandoc 执行失败，请确认已安装 pandoc');
    console.error('   安装方式: brew install pandoc');
    process.exit(1);
  }

  console.log('🔍 解析 Markdown...');

  const questions = parseMarkdownQuestions(markdown);

  if (questions.length === 0) {
    console.error('❌ 未能解析出任何题目');
    process.exit(1);
  }

  // 去重（同一年份中相同题目可能因格式原因重复）
  const seen = new Set();
  const uniqueQuestions = questions.filter((q) => {
    const key = `${q.year}-${q.question.substring(0, 30)}-${q.answer}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 重新编号
  const yearCounters = {};
  uniqueQuestions.forEach((q) => {
    yearCounters[q.year] = (yearCounters[q.year] || 0) + 1;
    q.id = `${q.year}-${String(yearCounters[q.year]).padStart(3, '0')}`;
  });

  // 统计
  console.log(`\n📊 解析结果: 共 ${uniqueQuestions.length} 题（去重前 ${questions.length} 题）`);
  for (const [year, count] of Object.entries(yearCounters).sort()) {
    console.log(`   ${year}年: ${count} 题`);
  }

  // 检查不完整题目
  const incomplete = uniqueQuestions.filter(
    (q) => !q.options.A || !q.options.B
  );
  if (incomplete.length > 0) {
    console.warn(`\n⚠️  ${incomplete.length} 道题目选项不完整（缺少A或B）`);
    incomplete.slice(0, 3).forEach((q) => {
      console.warn(`   ${q.id}: ${q.question.substring(0, 50)}...`);
      console.warn(`   Options: ${JSON.stringify(q.options)}`);
    });
  }

  // 写入 JSON
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(uniqueQuestions, null, 2), 'utf-8');
  console.log(`\n✅ 已生成: ${outputPath}`);
  console.log(`   大小: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);

  // 示例
  console.log('\n📝 第一题:');
  console.log(JSON.stringify(uniqueQuestions[0], null, 2));
  console.log(`\n📝 最后一题 (${uniqueQuestions[uniqueQuestions.length - 1].id}):`);
  console.log(JSON.stringify(uniqueQuestions[uniqueQuestions.length - 1], null, 2));
}

main().catch((err) => {
  console.error('❌ 失败:', err.message);
  process.exit(1);
});
