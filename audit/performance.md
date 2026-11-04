# 审计2：性能与 SSG（apps/web）

> 范围：`apps/web/vite.config.ts`、`index.html`、`src/main.tsx`、`src/entry-server.tsx`、`src/router.tsx`、`scripts/prerender.ts`、`SearchDialog`/Orama（`packages/catalog/src/search.ts`）、工具懒加载（`React.lazy` / `import.meta.glob` / 动态 `import()`）、图片/字体、bundle 体积（`apps/web/dist` 现存产物）。
> 方法：read/grep 取证，每条附 `文件:行号`；分级 P0（阻塞/首屏）/ P1（显著）/ P2（优化）。
> 结论速览：**SSG 已落地但无 hydration、`createRoot` 全量重渲染（P0）；800+ chunk 按工具分包方向对、但 vendor 未分组导致碎片与瀑布（P1）；Orama 尚未接入，当前子串索引常驻首屏且每次按键全量扫描（P1）；图片/字体已用系统字体+WebP（P2 仅剩细节）。**

---

## P0

### P0-1 SSG 产物无 hydration，客户端 `createRoot` 丢弃 SSR DOM 全量重渲染，LCP/CLS 与 SEO 收益打折
- 证据：
  - `apps/web/src/entry-server.tsx:24-33` 用 `react-dom/static` 的 `prerender` 生成静态 HTML（注释称等待 Suspense 解析，得真实内容）。
  - `apps/web/src/main.tsx:2,13` 客户端却用 `createRoot(container).render(...)`，全仓无 `hydrateRoot`（grep `hydrate` 零命中）。
  - `scripts/prerender.ts:200,229-236` 把 `body` 注入 `<div id="root">` 写成 `dist/<route>/index.html`。
- 影响：首屏 HTML 虽可被爬虫/首绘看到，但浏览器拿到后 React 仍要下载 entry JS、重建整棵树、再 reconcile；INP/TTI 退化为 SPA 水平，pre-render 的 LCP 优势只在“JS 加载前”窗口成立。
- 优化（代码级）：
  ```tsx
  // main.tsx
  import { hydrateRoot } from 'react-dom/client'
  // 仅当 #root 已有 SSR 子节点时 hydrate，否则 createRoot
  const rootEl = document.getElementById('root')!
  const app = (<StrictMode><AppProviders><BrowserRouter><App/></BrowserRouter></AppProviders></StrictMode>)
  rootEl.hasChildNodes() ? hydrateRoot(rootEl, app) : createRoot(rootEl).render(app)
  ```
  注意：`entry-server` 与客户端必须同语言（中文）首渲染 —— 当前 `i18n/index.tsx:75` 初始 `zh` 与 SSG 一致，主题 `theme/index.tsx:46` 从 DOM 类读初始值，hydrate 对账风险低；`useIsomorphicLayoutEffect`（`lib/useIsomorphicLayoutEffect.ts:10`）在 SSG 回退 `useEffect`，hydrate 时会改 lang/class，需做 hydration mismatch 回归（`suppressHydrationWarning` 仅限 `<html>`）。

### P0-2 prerender 串行逐页渲染 800+ 页，构建时长 O(N) 且无并发/增量，CI 易超时
- 证据：`scripts/prerender.ts:229-237` `for (const route of routes) { await mod.render(route); ... writeFileSync }` 全程串行；路由数 = `allRoutes()`（`:91-99`）即 1+1+GROUPS+CATEGORIES+TOOL_ROUTES（799 工具，`packages/catalog/src/tools.generated.ts:4`）。
- 影响：每次发版全量重跑；且 `render()` 内 `prerender` 会等待每个工具页的 `lazy`（`router.tsx:15` + `ToolPage.tsx:28,37`）解析，尾部慢页阻塞全部。构建失败也无单页重试/跳过。
- 优化：`p-limit` 并发 4–8（注意 `prerender` 的 React 静态渲染并发安全性需先验证）、按 catalog 哈希做增量（meta 未变跳过写文件）、单页 try/catch 记失败清单后统一抛错。

### P0-3 工具页 SSG 内容依赖 lazy chunk，预渲染与 hydration 双为“加载中”风险（当前靠 `prerender` 等 Suspense 兜底，但客户端首屏仍闪）
- 证据：`router.tsx:7-18` 六个页面全 `lazy()`；`ToolPage.tsx:28,37` 再 `import.meta.glob('../tools/*/Tool.tsx')` + `lazy(entry)`；`router.tsx:28-30` / `ToolPage.tsx:86-90` fallback 为纯文本“加载中…”。
- 影响：客户端（非 SSG 命中或 hydrate 失败）进工具页先白屏等 `tool-*.js`；SSG 页 hydrate 时 Tool 仍需二次加载，与 P0-1 叠加成 CLS。
- 优化：工具页对 SEO 关键的壳（标题/描述/JSON-LD，已在 `prerender.ts:67-85` 生成）保持静态；`ToolComponent` 用 `webpackPreload`/`<link rel=modulepreload>` 按路由预载（见 P1-1），或路由级 `lazy` 改 `lazyWithPreload` 在 hover/`idle` 时预取。

## P1

### P1-1 800+ chunk 分包：按工具切分正确，但 vendor 未分组 → 大量 `chunk-*` 碎片 + 请求瀑布
- 证据：
  - `vite.config.ts:13-27` `manualChunks`：仅 `/src/tools/<id>/` → `tool-<id>`、`src/(i18n|theme|lib)` → `app-core`，其余（含全部 `node_modules`）返回 `undefined` 交给 Rolldown 自动切。
  - 现存 `dist/assets`（glob 统计 925 条目）：`tool-*.js` 781 个（行 113–893）、`chunk-*.js` 23 个（如 `chunk-2E7WHVMD-*.js`）、`echarts-*.js`、`mermaid.core-*.js` + 60+ 个 `*Diagram-*.js`、`pdf*` 相关分片等。
- 影响：
  1. 每个工具页实际请求 = `tool-<id>` + 若干 `chunk-*`（共享依赖被拆散）+ `app-core` + 入口，HTTP/2 下仍有解析与优先级竞争；工具页“JS <30KB”预算（`vite.config.ts:10` 注释）只约束了 `tool-*` 本身，共享 chunk 的体积未计入。
  2. `chunk-*` 哈希名不稳定，缓存命中率低（内容改动即全量换名）。
- 优化（代码级）：给 vendor 显式分组，稳定长缓存并减少碎片：
  ```ts
  manualChunks(id) {
    if (id.includes('node_modules')) {
      if (id.includes('echarts')) return 'vendor-echarts'
      if (id.includes('mermaid')) return 'vendor-mermaid'
      if (id.includes('pdfjs-dist')) return 'vendor-pdfjs'
      if (id.includes('@ffmpeg')) return 'vendor-ffmpeg'
      if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) return 'vendor-react'
      return 'vendor'
    }
    // ...原有 tool-/app-core 规则保持（注意顺序：tools 规则在 node_modules 之后）
  }
  ```
  并在 CI 加 bundle 预算（见 P2-3）。

### P1-2 首页 `dist/index.html` modulepreload 误带两个工具 chunk，首屏多付未用字节
- 证据：`apps/web/dist/index.html:44-49` 在入口外 `<link rel="modulepreload" href="/assets/tool-abi-codec-*.js">` 与 `tool-argon2-hash-*.js`（另含 `rolldown-runtime`、`app-core`、CSS）。源码中无对这两工具的静态 import（grep `abi-codec|argon2-hash` 仅命中各工具自身文件与注释），首页也不渲染它们（`FeaturedTools.tsx:15-19` 只渲染每分类代表卡片，`ToolCard.tsx` 不 import 工具组件）。
- 影响：所有页面首屏多下载 2 个工具 chunk（虽小，但与“首屏只加载壳”目标 `router.tsx:6` 冲突），且指向 `import.meta.glob`（`ToolPage.tsx:28`）的预加载行为不透明、易随构建漂移。
- 优化：确认是 Rolldown 对 glob 首批 dynamic import 的 preload 误判后，用 `manualChunks`/glob 选项关闭首页 preload，或在 `index.html` 模板中过滤 `tool-*` 的 modulepreload；加一条产物断言（首页 preload 不含 `tool-`）。

### P1-3 Orama 未接入：所谓“索引”实为常驻首屏内存 + 每次按键 O(N) 全量扫描
- 证据：
  - `packages/catalog/src/search.ts:4-7`：文档定稿 Orama，当前为“轻量子串匹配”，签名保持稳定待替换；全仓无 `@orama/*` 依赖（grep 仅命中文档与注释）。
  - `search.ts:22-29` `SEARCH_INDEX = TOOLS.map(...)`（799 条，`tools.generated.ts` 16800 行）随 `@toolbox/catalog` 被首屏链路静态 import：`SearchDialog.tsx:3-4` → `packages/search/src/index.ts:7` 转发；Header 常驻挂载 `SearchDialog`（`Header.tsx:48`），故索引与 catalog 全量进首屏 JS（`app-core`/入口）。
  - `search.ts:61-65` 每次 `searchTools(query)` 对全索引 `map+score+sort+slice`；`SearchDialog.tsx:27` `useMemo(() => searchTools(query), [query])` 在每次输入都同步重算（无 debounce）。中文无分词（`search.ts:41` `includes`），“json”类查询命中 50 上限（`:55`）。
- 影响：内存常驻（~799 条 doc + 16800 行 meta）、首屏 JS 膨胀、输入卡顿；且与任务描述中的“Orama 全量索引内存/初始化”风险方向相同 —— 若按文档直接把 Orama 全量索引塞进首屏，内存/初始化成本会进一步放大。
- 优化：
  1. 短期：`SearchDialog` 改 `lazy(() => import('../search/SearchDialog'))` 动态加载，索引不进首屏；输入加 120–200ms debounce（`useDeferredValue` 亦可）。
  2. Orama 接入：构建期生成序列化索引（`@orama/orama` + `@orama/tokenizers/mandarin`），客户端 `import()` 异步 `restore()`，或走 Web Worker；中文分词与现有子串兜底并行灰度。

### P1-4 重型依赖静态 import 散落 ~20 个工具，靠 dynamic import 兜底不统一
- 证据：grep `^import .* from '(echarts|pdfjs-dist|mermaid|...)'` 在 `src/tools/*/Tool.tsx` 命中 `pdf-compare:2`、`pdf-delete:2`、`pdf-to-text:2`、`pdf-to-word:2`、`pdf-to-ppt:2`、`pdf-to-image:2`、`pdf-to-excel:2`、`pdf-to-image-extract:2` 等 `import * as pdfjsLib from 'pdfjs-dist'`；`embedding-vis:3`、`statistics:9`、`text-stats:7` 静态 `echarts/core`。对比正确写法：`chart-export:58`、`flowchart:27`、`pdf-to-csv:17` 等用 `await import('echarts'|'mermaid'|'pdfjs-dist')`。
- 影响：静态 import 使 `pdfjs-dist`/`echarts` 被打进各 `tool-*` 或共享 `chunk-*`，单工具页体积与 P1-1 预算失守（`ToolPage` 注释称 <30KB，`ToolPage.tsx:22`）；且与 `tool-*` 分包叠加后同一大依赖可能多份拷贝/多 chunk 引用。
- 优化：统一收敛为动态 `import()`（已有范式），或 `echarts/core` 按需子路径 + `manualChunks` vendor 分组（P1-1）；CI 加“工具 chunk 含 pdfjs/echarts 静态引用即失败”检查。

### P1-5 `/tools` 全量渲染 799 卡片 + 首页多区块，SSG HTML 与 DOM 膨胀
- 证据：`AllToolsPage.tsx:19-23` `TOOLS.map(<ToolCard/>)` 全量；首页 `HomePage.tsx:21-28` 串行叠加 Hero/Highlights/GroupShowcase/CategoryGrid/FeaturedTools/CtaSection，`FeaturedTools.tsx:9` 注释已自述“全量 800 卡会让 DOM 与预渲染 HTML 膨胀”。
- 影响：`/tools` 页预渲染 HTML 含 799 张卡（SEO 好、但 HTML 体积与 hydration DOM 量大）；移动端首屏渲染/滚动卡顿。当前靠 P0-1 的重渲染放大此成本。
- 优化：`/tools` 分页或客户端虚拟列表（`content-visibility: auto` 兜底），首屏只预渲染前 N 张 + “加载更多”；配合 P0-1 hydrate 后收益更明显。

### P1-6 WASM/大资产仅按工具动态加载，但无 `preload`/`prefetch` 策略，工具交互首跳延迟
- 证据：动态 import 重依赖遍布工具，如 `tools/blake3-hash/utils.ts:40-46`（`blake3-wasm` + `?url` wasm）、`argon2-hash/utils.ts:67`、`audio-*/Tool.tsx:47`（`@ffmpeg/ffmpeg`）、`ocr:82`（`tesseract.js`）、`doc-convert:35`（`mammoth.browser`）；产物含 `blake3_js_bg-*.wasm`、`qpdf-*.wasm`（dist/assets glob）。全仓无 `modulepreload`/`prefetch`（grep 仅命中工具自身 `preload` 属性与文档）。
- 影响：用户点进工具后才开始下载重依赖（ffmpeg/tesseract/pdfjs 动辄 MB 级），体感为点击后长等待；与 SSG 静态壳叠加时“可读但不可用”。
- 优化：路由 hover/focus 时 `import()` 预取工具 chunk + 重依赖；在工具页 idle 时预载 wasm `?url` 资源并 `WebAssembly.instantiateStreaming` 预热（仅 blake3/qpdf 这类小 wasm）。

## P2

### P2-1 内联主题/语言脚本阻塞：体积小但在 `<head>` 同步执行且与 CSS 串行
- 证据：`index.html:11-43` 内联脚本（localStorage + `matchMedia` + 3s 兜底定时器），`global.css:39-41` `html.i18n-pending #root{visibility:hidden}` 配合；脚本在 `<head>` 无 `defer`（内联天然阻塞解析）。
- 影响：当前脚本仅 ~1KB，阻塞可忽略；但 `i18n-pending` 用 `visibility:hidden` 遮罩，在 hydration（P0-1）下若 Provider 未及时摘类，最长 3s 白屏（`I18nProvider` 在 `i18n/index.tsx:77-82` 用 layout effect 摘类，通常首帧内完成）。
- 优化：保持现状或把遮罩改为仅隐藏文本节点（`color: transparent`）避免 LCP 元素被判不可见；3s 兜底缩短至 1.5s 并在 `DOMContentLoaded` 提前摘类。

### P2-2 图片：Hero 轮播已做对（eager/lazy + fetchPriority + aspect 占位），但 6 图全量挂载且无响应式尺寸
- 证据：`HeroCarousel.tsx:45-57` 首图 `loading=eager fetchPriority=high`、其余 `lazy`，容器 `aspect-[960/786]`（`:41`）防 CLS；`public/images/hero/` 6 张 WebP（`hero-home/dev/design/tools/argon2/cert.webp`）。无 `srcset`/`sizes`（grep 零命中）、无 `<link rel=preload as=image>`、无 `width/height` 属性（靠 CSS aspect）。
- 影响：移动端仍下载桌面尺寸图；其余 5 图即便 `lazy` 也在轮播挂载时全量请求（`SLIDES.map` 全部渲染 `<img>`，`:45`）。
- 优化：按需生成 480/960 两档 + `srcset`；仅渲染当前±1 张（窗口化）；首图加 `<link rel="preload" as="image" fetchpriority="high">`。

### P2-3 字体：系统字体栈，零 webfont 成本（好），但中文回退与等宽栈需确认
- 证据：`global.css:20-26` `system-ui,-apple-system,'PingFang SC','Microsoft YaHei',sans-serif`；`:57-59` 等宽 `ui-monospace,...`。全仓无 `@font-face`/`font-display`（grep 零命中）。
- 影响：无 FOUT/CLS 风险，LCP 友好。仅风险是 Windows 无 PingFang 时靠 YaHei、Linux 靠系统 CJK，跨端字形差异。
- 优化：维持现状；如需品牌字体则用 `font-display: swap` + `unicode-range` 分包中文（仍不建议首屏阻塞）。

### P2-4 构建配置缺预算与可观测性：无 `chunkSizeWarningLimit`、无 bundle 分析、无压缩体积门禁
- 证据：`vite.config.ts:8-33` `build` 仅设 `target/assetsDir/copyPublicDir`，无 `chunkSizeWarningLimit`、`reportCompressedSize`、sourcemap、bundle analyzer 插件；`package.json:10` `build:ssr` 独立于 `build`（prerender 需两步，`prerender.ts:209-218` 报错提示同样）。
- 影响：800+ chunk 下体积回归无声发生，P1-1/P1-4 无法提前拦截。
- 优化：`build.chunkSizeWarningLimit: 300`（工具页阈值）、`rollup-plugin-visualizer` 仅 CI 产物、CI 断言 `dist/assets/tool-*.js` gzip 总和与首屏入口 gzip 上限；`build` 与 `build:ssr` 合并为一条 `pnpm build:all`。

### P2-5 工具懒加载缓存正确但粒度粗：`lazyTools` Map 常驻且无预取失效
- 证据：`ToolPage.tsx:30-40` `lazyTools` 按 id 缓存 `lazy()` 结果（注释说明防语言切换卸载重挂，正确）；`router.tsx:7-18` 页面级 lazy 无 preload。
- 影响：已访问工具 JS 常驻内存（内存可控，799 个小 chunk 可接受）；未访问工具零预取（见 P1-6）。
- 优化：保持缓存；对当前路由的相邻工具（同 category）做 idle 预取，命中率与内存平衡。

---

## 取证清单（关键文件:行号速查）
| 维度 | 证据 |
|---|---|
| 分包策略 | `apps/web/vite.config.ts:13-27`；产物 781×`tool-*` + 23×`chunk-*`（dist/assets glob） |
| SSG 入口/脚本 | `apps/web/src/entry-server.tsx:24-33`；`scripts/prerender.ts:91-99,200,229-237` |
| 无 hydration | `apps/web/src/main.tsx:2,13`（`createRoot`，无 `hydrateRoot`） |
| 内联主题脚本 | `apps/web/index.html:11-43`；`global.css:39-41`；`i18n/index.tsx:77-82`、`theme/index.tsx:21-24,45-50` |
| 路由懒加载 | `apps/web/src/router.tsx:7-18,28-30` |
| 工具懒加载 | `apps/web/src/pages/ToolPage.tsx:28,30-40,86-90` |
| Orama/搜索 | `packages/catalog/src/search.ts:4-7,22-29,58-65`；`apps/web/src/components/search/SearchDialog.tsx:3,27`；`Header.tsx:48` |
| 图片 | `HeroCarousel.tsx:41,45-57`；`public/images/hero/*.webp`（6 张） |
| 字体 | `global.css:20-26,57-59`（无 `@font-face`） |
| 首页 preload 误带 | `apps/web/dist/index.html:44-49` |
