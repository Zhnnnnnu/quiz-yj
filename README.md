# 禁毒King — 青少年禁毒知识竞赛刷题 PWA

一个**完全离线**的 PWA 刷题应用，无需服务器、无需网络、数据本地存储，支持添加到手机桌面获得类 App 体验。

---

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 开发模式运行
npm run dev

# 3. 浏览器访问
# http://localhost:3000
```

---

## 构建生产版本

```bash
npm run build
```

构建产物在 `dist/` 目录，可直接部署到任何静态服务器。

---

## 手机使用

### 方法一：本地网络访问
1. 在电脑上运行 `npm run dev`
2. 手机连接同一 WiFi
3. 手机浏览器访问 `http://<电脑IP>:3000`

### 方法二：部署到静态服务器
1. 将 `dist/` 目录上传到任何静态托管（GitHub Pages、Vercel、Netlify 等）
2. 手机浏览器访问对应网址

### 添加到手机桌面（安装 PWA）
1. 用手机浏览器打开应用
2. **iOS Safari**：点击底部"分享" → "添加到主屏幕"
3. **Android Chrome**：点击菜单 → "添加到主屏幕"

添加后即可像普通 App 一样使用，支持离线访问。

---

## 题库转换

如需更新题库（从 DOCX 文件）：

```bash
# 前置条件：安装 pandoc
brew install pandoc

# 运行转换脚本
npm run convert <路径/到/题库.docx> src/data/questions.json
```

---

## 项目结构

```
quiz-pwa/
├── public/
│   └── icons/            # PWA 图标
├── src/
│   ├── components/       # 通用组件
│   │   ├── OptionButton.tsx   # 选项按钮
│   │   ├── ProgressBar.tsx    # 进度条
│   │   └── Timer.tsx          # 计时器
│   ├── pages/            # 页面组件
│   │   ├── HomePage.tsx       # 首页
│   │   ├── PracticePage.tsx   # 练习模式
│   │   ├── ExamPage.tsx       # 模拟考试
│   │   └── WrongQuestionsPage.tsx  # 错题集
│   ├── database/
│   │   └── db.ts         # IndexedDB 封装
│   ├── data/
│   │   └── questions.json # 题库数据
│   ├── utils/
│   │   └── shuffle.ts    # 工具函数
│   ├── App.tsx           # 路由配置
│   ├── main.tsx          # 入口
│   └── index.css         # 全局样式 (Tailwind)
├── scripts/
│   └── convert-docx.js   # DOCX → JSON 转换脚本
├── index.html
├── package.json
├── vite.config.ts        # Vite + PWA 配置
├── tailwind.config.js
└── README.md
```

---

## 功能说明

### 练习模式
- 按年份选择题库（2021-2025）
- 题目随机打乱
- 先选答案，再点"确认提交"
- 答对显示"✅ 回答正确"
- 答错显示正确答案
- 错题自动加入错题集

### 模拟考试
- 50题随机组卷（全部年份）
- 2小时倒计时
- 时间到自动交卷
- 交卷后展示：正确率、用时、错题列表
- 错题自动加入错题集

### 错题集
- 查看所有错题
- 逐题复习
- 每道题可选择：
  - **已掌握**：从错题集移除
  - **未掌握**：继续保留

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建 | Vite 5 |
| UI | Tailwind CSS |
| 路由 | React Router v6 (Hash) |
| 存储 | IndexedDB (idb) |
| PWA | vite-plugin-pwa (Workbox) |
| 转换 | Pandoc + Node.js |

---

## 离线能力

- 首次访问后，所有资源（HTML/JS/CSS/题库）被 Service Worker 缓存
- 无网络环境仍可正常刷题
- 所有答题数据存储在浏览器 IndexedDB 中
- 关闭网页重新打开，数据不丢失

---

## 数据备份

在浏览器控制台执行：

```js
// 导出数据
const data = await import('./src/database/db').then(m => m.exportAllData());
const blob = new Blob([data], {type: 'application/json'});
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'backup.json';
a.click();
```
