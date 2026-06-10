# NT2 荷兰语学习 App 修复优化版

我已经把可直接打开的版本保存为：

`NT2-Verhalenmaker-Optimized.html`

这个版本不需要 React 项目、不需要 npm、不需要安装依赖。你可以直接双击这个 HTML 文件打开。

## 已修复和优化

- 不再混用 JSX / TypeScript，避免白屏
- 不再重复初始化 Firebase
- 无 API key 时不会卡 15 秒失败
- 首页明确显示 `Offline beschikbaar` / `AI key nodig`
- 浏览器 TTS 可以真实朗读荷兰语文本和单词
- 移动端/点击词汇弹出释义并朗读
- 阅读页显示本页目标词
- 翻页自动停止朗读并回到顶部
- Quiz 错题进入复习池
- 结果页显示错词、定义、原文语境，并可再次练习
- XP 只在第一次发现词汇时奖励，避免 hover 刷分
- 头像上传只做本地预览，不误导为 AI 头像生成
- 学习进度、XP、错题池会保存在浏览器 localStorage
- 修复闪卡空白问题
- 解锁前两章全部 8 个离线主题
- 每个离线故事固定 10 个生词、5 页、每页 2 个目标词
- 图片系统改为 Storybook 模式：默认显示更接近 Instagram 生活照片的 fallback；填写 Gemini API key 后，每页可点击 `Maak AI beeld`，按当前故事、目标词、Mila 这个主人公和“格罗宁根新移民生活”生成 16:9 photorealistic 图片
- 阅读工具栏新增 `Storybook beelden`，可一次为当前故事 5 页连续生成图片
- 阅读工具栏新增 `Prompt`，可查看当前页用于生成图片的完整 prompt，方便继续调图

## 注意

这是稳定可演示版本。Gemini 动态生成故事的接口位置已经保留，但为了保证你能直接打开使用，当前 HTML 版先以离线故事为主。

如果你想继续作为 React 项目开发，可以让我把这个 HTML 版本拆回 `src/App.jsx`、`src/main.jsx`、`package.json` 的 Vite 项目结构。
