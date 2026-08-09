# 禁毒King — 青少年禁毒知识竞赛刷题 PWA

一个**完全离线**的 PWA 刷题应用，无需服务器、无需网络、数据本地存储，支持添加到手机桌面获得类 App 体验。

---

### 添加到手机桌面（安装）
1. 用手机浏览器打开应用
2. **iOS Safari**：点击底部"分享" → "添加到主屏幕"
3. **Android Chrome**：点击菜单 → "添加到主屏幕"

添加后即可像普通 App 一样使用，支持离线访问。

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


## 离线能力

- 无网络环境仍可正常刷题
- 关闭网页重新打开，数据不丢失
