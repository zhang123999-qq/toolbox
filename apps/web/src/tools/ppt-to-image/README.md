# PPT 转图片（ppt-to-image · #506）

上传 `.pptx` 文件，在浏览器本地将每张幻灯片渲染为 PNG 图片，可逐张下载。
全程本地处理，不上传文件。

## 功能

- 选择 `.pptx` 文件后，按播放顺序将每张幻灯片渲染为 PNG（canvas 绘制）
- 版式：标题置顶加粗、正文段落依次向下，超出画布高度时截断
- 选项：输出尺寸（960x540 / 1280x720 / 800x600）、背景（白色 / 深色）
- 切换选项后即时重渲染
- 每张图片附「下载 PNG」链接（`slide-<n>.png`）
- 空白幻灯片渲染为居中的「（空白幻灯片）」占位图

## 边界与错误

| 情况                           | 行为                                        |
| ------------------------------ | ------------------------------------------- |
| 旧版 `.ppt`                    | 提示「暂不支持旧版 .ppt，请另存为 .pptx」   |
| 非 `.pptx` 文件                | 中文错误「请选择 .pptx 文件」               |
| 空文件 / 超 50 MiB             | 中文错误                                    |
| 损坏的 pptx（非 zip / 缺部件） | 中文错误并注明缺失部件                      |
| 无幻灯片的演示文稿             | 中文错误「演示文稿中没有幻灯片」            |
| 浏览器不支持 canvas 2D         | 中文错误「当前浏览器不支持 canvas 2D 渲染」 |

## 实现说明（回退）

规划原要求用 `@neo-office/renderer` 做高保真幻灯片渲染，
但该包把 WASM 初始化地址硬编码为 `/wasm/init.js`，
而仓库约束「只允许修改工具目录、不得复制静态资源」，
无法实际初始化。因此回退为 **fflate 解包 + 文本提取 + canvas 简化版式渲染**：

- pptx 本质是 zip：`unzipSync` 解包
- `ppt/presentation.xml` 的 `<p:sldId>` 决定播放顺序，
  经 `ppt/_rels/presentation.xml.rels` 映射到 `ppt/slides/slideN.xml`
- 从 slide XML 的 `<a:p>` / `<a:t>` 提取段落文本并反转义 XML 实体
- `utils.wrapText` 做贪心换行（measure 回调由 Tool 注入 canvas 的 measureText）
- `utils.layoutSlideImage` 计算纯文本版式（标题 / 正文坐标与字号），Tool.tsx 负责 canvas 绘制

注意：这是**基于提取文本的简化渲染**，不还原原稿的排版、图形、动画与图片。
`meta.feasibility='A'`、`wasm=false`、`deps=['fflate']` 均按此回退填写。
