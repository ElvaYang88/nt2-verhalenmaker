# 使用说明

我已经把可编译的修正版组件保存为：

`App.fixed.jsx`

这个文件不是网页文件，不能直接双击用浏览器打开。它需要放进 React 项目的 `src` 目录里，例如：

```text
你的项目/
  package.json
  src/
    App.jsx
```

## 怎么使用

1. 打开你的 React 项目目录。
2. 把 `App.fixed.jsx` 复制到项目的 `src` 目录。
3. 可以直接改名为 `App.jsx`，替换原来的 `src/App.jsx`。
4. 确认项目已安装依赖：

```bash
npm install lucide-react firebase
```

5. 启动项目：

```bash
npm run dev
```

## 这版主要修了什么

- 去掉 TypeScript 语法，适合普通 `App.jsx`
- 修复 Firebase 重复初始化
- 修复离线主题判断，不再用 `theme.id <= 4`
- 修复浏览器 TTS fallback，可以真的朗读荷兰语
- 修复移动端词汇抽屉发音
- 加入本页目标词提示
- 加入错题词汇复习
- 防止 hover 词汇反复刷 XP
- 头像上传改为本地预览，避免误导用户以为照片进入 AI 生成

## 注意

这是一版稳定骨架，保留了 Gemini API key 抽屉，但动态生成故事的 Gemini 路线暂时作为接入口保留。等这版能跑起来后，再把你原来的 `generateStoryTextAndAnchor` 和更多静态故事库逐步搬回来会更稳。
