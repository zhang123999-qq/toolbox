# Toolbox 全方位代码审计 — 汇总报告 (2026-11-04)

> 分报告: [architecture.md](architecture-notice.md) 见工作区根 `audit/architecture.md` / `audit/code-quality.md`; 本目录 `architecture.md`不存在请看根audit/
> - 架构: `../../audit/architecture.md` (P0×2/P1×7/P2×4)
> - 性能: `performance.md` (P0×3/P1×6)
> - 安全: `security.md` (P0×1/P1×6/P2×6)
> - DevSecOps: `devsecops.md` (P0×6/P1×6/P2×4)
> - React19/类型: `../../audit/code-quality.md` (P0×1/P1×6)

## 🔴 P0 致命 (需立即修复)

### DevSecOps (最严重, 6项)
1. `curl|bash` sha256同源TOFU无GPG/minisign签名 — `deploy/binary/install.sh:415-426`, `release.yml:121-127`
2. checksums.txt与toolboxctl同包自指校验, root执行包内脚本 — `toolboxctl:381-395`
3. 允许`http://`明文源 + `GITHUB_TOKEN`发往任意URL — `install.sh:249-274,311`
4. `load_conf`以shell `source`读`/etc/toolbox/toolbox.conf`, `--prefix`无白名单, `uninstall rm -rf $PREFIX` — `toolboxctl:151-158,777-782`
5. tar无traversal/symlink防护且验证在解包后 — `install.sh:434`
6. Actions/镜像tag浮动无SHA钉选, Dockerfile直写npmmirror/aliyun/curl.se — `ci.yml:25,32`, `Dockerfile:14-15`

### 性能/架构 (P0)
7. SSG无hydration: `entry-server` prerender静态HTML但`main.tsx`用`createRoot`全量重渲染 — LCP/TTI退化为SPA
8. prerender串行逐页渲染800+页 — `scripts/prerender.ts:229`, 无并发/增量, CI靠20min超时硬扛; 与`vite build`混写`dist`缓存污染 (`turbo.json:6`)
9. 工具页双层lazy(router+ToolPage glob)首屏白屏等`tool-*.js`
10. CSP仅Report-Only+`'unsafe-inline'`, 生产零强制 — `deploy/nginx/default.conf:32`, `nginx.conf.tpl:65`, 根因`index.html:11-43`内联脚本
11. `App.tsx`无根ErrorBoundary整站白屏; `ToolErrorBoundary`丢错误无重置

### 架构
12. qpdf-wasm postinstall与`pnpm-workspace.yaml:4-6 allowBuilds`冲突未列, CI又`--ignore-scripts`, 错误被`catch{}`吞掉 — WASM资产不可复现

## 🟠 P1 性能/架构缺陷
- Vendor未分组: dist现存781个`tool-*`+23个`chunk-*`碎片, 首页误带`tool-abi-codec/argon2-hash` chunk; Orama未接入, 当前799条子串索引随catalog常驻首屏每次按键全量map+sort无debounce
- `pdfjs/echarts`等~20工具静态import与动态范式不统一; `/tools`全量渲染799卡片
- turbo `^build`空转(catalog/search/config无build脚本), 无remoteCache; engines缺口(Node25被排除, 子包无engines); `@types/node@26` vs 运行时Node24
- `.npmrc strict-peer-dependencies=false`掩盖React19/Vite8 peer冲突; pnpm-lock双YAML文档头
- 安全P1: `SafeHtml trusted`无校验布尔旁路; API Key明文`localStorage`; 文档称DOMPurify实际手写清洗; `map`工具运行时拉`echarts@4.9.0` CDN geoJSON; `@neslinesli93`个人包+postinstall且CI无`pnpm audit`
- React19: `use/useOptimistic/useActionState/startTransition`零使用; `catalog/schema.ts:101 as ToolMeta`掩盖Zod漂移; 缺`noUncheckedIndexedAccess`
- DevSecOps P1: 全程root无最小化, Docker无USER, systemd无沙箱, nginx缺`server_tokens/limit_req/HSTS`, CI顶层`contents:write`

## 🟡 P2 优化
内联主题脚本可保留(建议抽文件+hash), Hero图片缺srcset/窗口化, 系统字体零webfont成本(好), 缺chunkSizeWarning/bundle预算门禁, compose `version:3.8`弃用, 日志无轮转, `escapeHtml`漏单引号等 — 详见各分报告.

## ✅ 已核实肯定项
- `dangerouslySetInnerHTML`全仓收敛于`SafeHtml.tsx:30`, 无可直接利用存储型XSS(17处trusted抽查安全); `eval/new Function/postMessage/cookie`零真实使用; 零gtag/统计/外链字体
- 依赖DAG无环: `config→catalog→search→web`; GPL系已装树0命中, `xlsx=Apache-2.0`
- `apps/web/src`中`as any`为0; i18n `Record<MessageKey,string>`防漏译; 测试1611文件/19408用例
- Hero图 eager/lazy+fetchPriority+aspect占位

## 修复顺序建议
1. DevSecOps P0-3/P0-4/P0-5 (HTTPS强制+conf/prefix白名单+tar防护) 与 minisign签名 — 提权RCE面
2. CSP转正+抽内联脚本+HSTS
3. hydration (`hydrateRoot`) + prerender并行化/增量 + 根ErrorBoundary
4. qpdf allowBuilds补齐与CI可复现
5. vendor分包+Orama构建期序列化+Worker, 加bundle预算门禁

## 方法与局限
5路并行取证(grep/read/glob), 每条带文件:行号. pwsh受沙箱ACL拒绝(SetNamedSecurityInfoW), 未能实测870chunk内存/双头lock frozen安装/check:licenses全量计数, 相关结论在分报告标"未核实".
