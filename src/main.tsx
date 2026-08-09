import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// 获取根元素并渲染应用
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('找不到 #root 元素，请检查 index.html');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
