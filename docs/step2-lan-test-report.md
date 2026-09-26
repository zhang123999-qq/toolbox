# 第 2 步 · 局域网服务器全量测试报告

- 测试对象：Toolbox 前 190 个工具（pnpm monorepo / 纯前端 / 零新增网络依赖）
- 测试时间：2026-09-26（Asia/Shanghai）
- 被测服务：**https://192.168.200.4:5174/**（Vite dev，绑定 0.0.0.0，自签证书 HTTPS）
- 真实浏览器：系统自带 Microsoft Edge 153.0.4234.32（Playwright `channel: "msedge"`，headless）
- 配置：`apps/web/playwright.lan.config.ts`（baseURL 指向局域网 IP，`ignoreHTTPSErrors`）

## 结论

**状态：PASS。** 全量端到端 **622 个用例全部通过（622/622，失败 0）**，覆盖 190 个 e2e 套件；HTTP 探测 194 个路由全部 200；190 工具页加载零外部请求；vitest 3260 用例、web typecheck、production build 全部通过。

## 测试维度与证据映射

| 用户要求维度 | 如何验证                                                                                 | 证据                                        |
| ------------ | ---------------------------------------------------------------------------------------- | ------------------------------------------- |
| HTTP 状态    | 对 `/`、`/tools`、`/c/dev`、190 个 `/tools/:slug` 与未知路由共 194 个目标发真实请求      | 194/194 = 200，见下文「HTTP/结构/离线探测」 |
| 响应结构     | 校验 `Content-Type: text/html` 且页面含 `id="root"`（SPA 正常挂载点）                    | 194/194 含 root，无缺失                     |
| 边界输入     | 各工具 e2e 内置空输入、非法输入、超长/含逗号/中文等用例；vitest 另覆盖白名单/解析边界    | 622 e2e + 3260 vitest 全过                  |
| 错误处理     | 多工具 e2e 断言错误态 `role=alert`（如 MIME 严格模式、JSON 语法定位、空输入不报错等）    | 全部通过                                    |
| 前端交互     | 每个工具 e2e 覆盖：标题、示例→运行→输出、选项切换、首页搜索进入等真实点击/填写           | 622 个交互用例全过                          |
| 离线能力     | 项目无 Service Worker / PWA；离线能力=纯本地计算。遍历 190 工具页抓取全部网络请求的 host | 8644 个请求 host 全部为本机，外部请求 0     |

> 说明：项目入口（`main.tsx` / `App.tsx`）未注册 Service Worker、无 manifest，因此这里的「离线」
> 如实表述为**所有计算均在浏览器本地完成、运行期零外部网络请求**，而非可离线安装的 PWA。

## 三轮修复回归（21 → 4 → 0）

真实浏览器在局域网下首轮测出 21 个失败，逐项定位修复后归零：

| 轮次    | 协议                       | 通过/总数   | 失败  | 处理                 |
| ------- | -------------------------- | ----------- | ----- | -------------------- |
| 第 1 轮 | http://192.168.200.4:5173  | 601/622     | 21    | 见下方根因分析       |
| 第 2 轮 | https://192.168.200.4:5174 | 618/622     | 4     | WebCrypto 类全部恢复 |
| 第 3 轮 | https（修复后全量回归）    | **622/622** | **0** | 全绿                 |

### 根因 1（影响 17 个 WebCrypto 工具）：非安全上下文禁用 crypto.subtle

- 现象：AES/HMAC/SHA1/SHA256/ECDSA/Ed25519/RSA/ECC/JWE/JWS/JWT/PBKDF2/scrypt/key-generate/ssh-key 等浏览器内失败。
- 实测（真实 Edge）：`http://192.168.200.4` 下 `isSecureContext=false`、`window.crypto.subtle === undefined`。
- 定性：**浏览器安全机制，非代码缺陷**（localhost 不受此限，故此前单测/本机未暴露）。
- 处置：用 node-forge 生成仅含本机 IP/localhost SAN 的自签证书，以 HTTPS 提供局域网服务；切 HTTPS 后实测 `isSecureContext=true`、`crypto.subtle` 为 object，17 项全部恢复。

### 根因 2（真缺陷）：blake3-hash 浏览器内 WASM 未初始化

- 现象：页面输出 `BLAKE3 webassembly not loaded...`。
- 根因：包的 `browser` 字段只 re-export 哈希函数、不注入 WASM；Vite 按 `browser` 字段把 `import "blake3-wasm"` 重定向到该入口。
- 修复：浏览器改用官方异步入口 `blake3-wasm/browser-async`，WASM 以 Vite `?url` 静态资源地址传入实例化；Node/vitest 保留 Node 原生入口跑真实官方向量。
- 文件：`apps/web/src/tools/blake3-hash/utils.ts`；生产构建已正确产出独立 `*.wasm` 资源与 `browser-async-*.js` chunk。

### 根因 3（真缺陷）：big-json 在首页搜索不可达

- 现象：首页搜索 "json" 无法找到「BigJSON 流式」，用例超时。
- 根因：`searchTools` 默认上限 20，而 "json" 有 26 个标题同分命中，按 catalog 顺序把靠后的 big-json 截断。
- 修复：`packages/catalog/src/search.ts` 上限放宽到 50，并增加同分按 slug 升序的确定性排序；新增防回归单测 `apps/web/src/components/search/search.test.ts`（5 例）。

### 根因 4（用例选择器不严谨，应用正常）：csv-formatter / mime-lookup

- 现象：`getByLabel("模式")` 因子串匹配同时命中「模式」下拉框与「严格模式」复选框，触发 strict mode violation。
- 修复：两个 e2e 改用 `getByRole("combobox", { name: "模式" })` 精确定位。

## HTTP / 结构 / 离线探测（脚本 `apps/web/__probe_http.mjs`）

```
SLUG_COUNT=190
HTTP_TARGETS=194 NON_200=0 HTML_WITHOUT_ROOT=0
NAV_FAIL=0
REQUEST_HOSTS=[["192.168.200.4:5174",8644]]
EXTERNAL_REQUESTS=0
HTTP_STRUCTURE_OK=true
抽样：/  /tools  /c/dev  /tools/__not_exist_tool__ 均为 200 且含 id="root"
```

- 194 = 首页 1 + 工具列表 1 + 分类页 1 + 190 工具页 + 未知路由 1（SPA 兜底仍返回 200 HTML，前端路由处理）。
- 遍历全部 190 工具页（含懒加载模块）共产生 8644 个请求，**无一个指向外部 host**。

## 代码层回归（门禁）

| 门禁          | 命令                                        | 结果                         |
| ------------- | ------------------------------------------- | ---------------------------- |
| 单元/组件测试 | `npx vitest run`（apps/web）                | 388 文件 / **3260 用例全过** |
| 类型检查      | `tsc -p tsconfig.json --noEmit`（apps/web） | EXIT=0                       |
| 生产构建      | `pnpm build`（apps/web）                    | EXIT=0，3.26s，WASM 正确分包 |

## 端到端用例明细（622 个，全部 PASS）

> 「预期」以用例场景（标题）表达，「实际」为真实 Edge 中点击/填写/断言结果与耗时；日志见 `tmp/s2-e2e3-results.json`（Playwright JSON，含每条用例耗时与状态）。全量通过，无失败现场截图。

|   # | 工具                 | 用例（预期）                                              | 状态 | 耗时(ms) |
| --: | -------------------- | --------------------------------------------------------- | ---- | -------: |
|   1 | aes-encrypt          | 页面标题为该工具名                                        | PASS |     1536 |
|   2 | aes-encrypt          | 示例 → 运行 → 输出为 `<iv>.<密文>` 形式                   | PASS |     2052 |
|   3 | aes-encrypt          | 从首页能通过搜索进入该工具                                | PASS |     2048 |
|   4 | argon2-hash          | 页面标题为该工具名                                        | PASS |     1675 |
|   5 | argon2-hash          | 示例 → 运行 → 输出 PHC 串                                 | PASS |     2108 |
|   6 | argon2-hash          | 从首页能通过搜索进入该工具                                | PASS |     1949 |
|   7 | avro-parse           | 页面标题为该工具名                                        | PASS |     1308 |
|   8 | avro-parse           | 示例 → 生成字段树与 JSON Schema                           | PASS |     2244 |
|   9 | avro-parse           | 非法输入时输出区给出错误提示                              | PASS |     2014 |
|  10 | base32               | 页面标题为该工具名                                        | PASS |     1870 |
|  11 | base32               | 示例 → 运行 → 输出包含预期内容                            | PASS |     2175 |
|  12 | base32               | 从首页能通过搜索进入该工具                                | PASS |     2086 |
|  13 | base58               | 页面标题为该工具名                                        | PASS |     1552 |
|  14 | base58               | 示例 → 运行 → 输出包含预期内容                            | PASS |     1163 |
|  15 | base58               | 从首页能通过搜索进入该工具                                | PASS |     1263 |
|  16 | base64-encode        | 页面标题为该工具名                                        | PASS |     1079 |
|  17 | base64-encode        | 示例 → 运行 → 输出包含预期内容                            | PASS |     1074 |
|  18 | base64-encode        | 从首页能通过搜索进入该工具                                | PASS |     1276 |
|  19 | base85-codec         | 页面标题为该工具名                                        | PASS |     1115 |
|  20 | base85-codec         | 示例 → 运行 → 输出包含预期内容                            | PASS |     1120 |
|  21 | base85-codec         | 从首页能通过搜索进入该工具                                | PASS |     1415 |
|  22 | batch-replace        | 页面标题为该工具名                                        | PASS |     1185 |
|  23 | batch-replace        | 示例 → 运行 → 输出包含预期内容                            | PASS |     1152 |
|  24 | batch-replace        | 从首页能通过搜索进入该工具                                | PASS |     1276 |
|  25 | bcrypt-hash          | 页面标题为该工具名                                        | PASS |     1062 |
|  26 | bcrypt-hash          | 示例 → 运行 → 输出 bcrypt 哈希                            | PASS |     1105 |
|  27 | bcrypt-hash          | 从首页能通过搜索进入该工具                                | PASS |     1186 |
|  28 | big-json             | 页面标题为该工具名                                        | PASS |     1106 |
|  29 | big-json             | 示例 → 扫描 → 输出规模统计                                | PASS |     1173 |
|  30 | big-json             | 切到 error 模式能定位语法错误                             | PASS |     1089 |
|  31 | big-json             | 从首页能通过搜索进入该工具                                | PASS |     1266 |
|  32 | binary               | 页面标题为该工具名                                        | PASS |     1088 |
|  33 | binary               | 示例 → 运行 → 输出包含预期内容                            | PASS |     1102 |
|  34 | binary               | 从首页能通过搜索进入该工具                                | PASS |     1276 |
|  35 | binary-viewer        | 页面标题为该工具名                                        | PASS |     1064 |
|  36 | binary-viewer        | 示例 → 还原 xxd 风格转储并识别出 PNG                      | PASS |     1092 |
|  37 | binary-viewer        | 提供文件入口，选择后直接出字节报告                        | PASS |     1023 |
|  38 | binary-viewer        | 奇数长度十六进制给出错误提示                              | PASS |     1051 |
|  39 | binary-viewer        | 从首页能通过搜索进入该工具                                | PASS |     1241 |
|  40 | blake2-hash          | 页面标题为该工具名                                        | PASS |     1002 |
|  41 | blake2-hash          | 示例 → 运行 → 输出为标准向量                              | PASS |     1122 |
|  42 | blake2-hash          | 从首页能通过搜索进入该工具                                | PASS |     1377 |
|  43 | blake3-hash          | 页面标题为该工具名                                        | PASS |     1073 |
|  44 | blake3-hash          | 示例 → 运行 → 输出官方向量的摘要                          | PASS |     1213 |
|  45 | blake3-hash          | 从首页能通过搜索进入该工具                                | PASS |     1338 |
|  46 | blank-lines          | 页面标题为该工具名                                        | PASS |     1133 |
|  47 | blank-lines          | 示例 → 运行 → 输出包含预期内容                            | PASS |     1074 |
|  48 | blank-lines          | 从首页能通过搜索进入该工具                                | PASS |     1214 |
|  49 | bom                  | 页面标题为该工具名                                        | PASS |      984 |
|  50 | bom                  | 示例 → 运行 → 输出包含预期内容                            | PASS |     1154 |
|  51 | bom                  | 从首页能通过搜索进入该工具                                | PASS |     1247 |
|  52 | bson-codec           | 页面标题为该工具名                                        | PASS |     1101 |
|  53 | bson-codec           | 示例 → 输出 hex 字节串                                    | PASS |     1241 |
|  54 | bson-codec           | 解码模式下还原 JSON                                       | PASS |     1230 |
|  55 | bson-codec           | 从首页能通过搜索进入该工具                                | PASS |     1290 |
|  56 | case-convert         | 页面标题为该工具名                                        | PASS |      993 |
|  57 | case-convert         | 示例 → 运行 → 输出包含预期内容                            | PASS |     1398 |
|  58 | case-convert         | 从首页能通过搜索进入该工具                                | PASS |     1653 |
|  59 | charset-detect       | 页面标题为该工具名                                        | PASS |     1375 |
|  60 | charset-detect       | 示例 → 运行 → 输出包含预期内容                            | PASS |     1411 |
|  61 | charset-detect       | 从首页能通过搜索进入该工具                                | PASS |     1387 |
|  62 | charset-lookup       | 页面标题为该工具名                                        | PASS |     1171 |
|  63 | charset-lookup       | 示例 → 运行 → 输出包含预期内容                            | PASS |     1002 |
|  64 | charset-lookup       | 从首页能通过搜索进入该工具                                | PASS |     1379 |
|  65 | checksum             | 页面标题为该工具名                                        | PASS |     1225 |
|  66 | checksum             | 示例 → 输出 sum8 = 14                                     | PASS |     1162 |
|  67 | checksum             | 从首页能通过搜索进入该工具                                | PASS |     1461 |
|  68 | cn-en-count          | 页面标题为该工具名                                        | PASS |     1152 |
|  69 | cn-en-count          | 示例 → 运行 → 输出包含预期内容                            | PASS |      935 |
|  70 | cn-en-count          | 从首页能通过搜索进入该工具                                | PASS |     1225 |
|  71 | cookie-parse         | 页面标题为该工具名                                        | PASS |      999 |
|  72 | cookie-parse         | 示例 → 解析 → 输出包含会话 ID                             | PASS |     1193 |
|  73 | cookie-parse         | 生成模式下把 JSON 转成 Cookie 串                          | PASS |     1190 |
|  74 | cookie-parse         | 从首页能通过搜索进入该工具                                | PASS |     1214 |
|  75 | cors-check           | 页面标题为该工具名                                        | PASS |     1040 |
|  76 | cors-check           | 示例 → 生成检测报告                                       | PASS |     1099 |
|  77 | cors-check           | 无法解析时输出区给出错误提示                              | PASS |     1170 |
|  78 | crc-checksum         | 页面标题为该工具名                                        | PASS |     1070 |
|  79 | crc-checksum         | 示例 → 运行 → 输出标准 check 值                           | PASS |     1184 |
|  80 | crc-checksum         | 从首页能通过搜索进入该工具                                | PASS |     1324 |
|  81 | csp                  | 页面标题为该工具名                                        | PASS |     1010 |
|  82 | csp                  | 示例 → 运行 → 输出 Content-Security-Policy                | PASS |     1058 |
|  83 | csp                  | 从首页能通过搜索进入该工具                                | PASS |     1130 |
|  84 | csr-generate         | 页面标题为该工具名                                        | PASS |     1094 |
|  85 | csr-generate         | 示例 → 运行 → 输出 CSR                                    | PASS |     3583 |
|  86 | css-escape           | 页面标题为该工具名                                        | PASS |     1086 |
|  87 | css-escape           | 示例 → 运行 → 输出包含预期内容                            | PASS |     1075 |
|  88 | css-escape           | 从首页能通过搜索进入该工具                                | PASS |     1252 |
|  89 | csv-formatter        | 页面标题为该工具名                                        | PASS |     1095 |
|  90 | csv-formatter        | 示例 → 对齐 → 输出列宽一致的表格                          | PASS |     1190 |
|  91 | csv-formatter        | 切到 validate 后输出列数校验报告                          | PASS |     1073 |
|  92 | csv-formatter        | 从首页能通过搜索进入该工具                                | PASS |     1125 |
|  93 | csv-to-excel         | 页面标题为该工具名                                        | PASS |      988 |
|  94 | csv-to-excel         | 示例 → 转换 → 输出 SpreadsheetML                          | PASS |     1078 |
|  95 | csv-to-excel         | 切到 tsv 后输出制表符分隔的文本                           | PASS |     1134 |
|  96 | csv-to-excel         | 从首页能通过搜索进入该工具                                | PASS |     1252 |
|  97 | csv-to-json          | 页面标题为该工具名                                        | PASS |     1022 |
|  98 | csv-to-json          | 示例 → 转换 → 输出 JSON 数组                              | PASS |     1065 |
|  99 | csv-to-json          | 取消表头后输出二维数组                                    | PASS |     1160 |
| 100 | csv-to-json          | 从首页能通过搜索进入该工具                                | PASS |     1134 |
| 101 | csv-to-tsv           | 页面标题为该工具名                                        | PASS |     1169 |
| 102 | csv-to-tsv           | 示例 → 运行 → 输出包含预期内容                            | PASS |     1183 |
| 103 | csv-to-tsv           | 从首页能通过搜索进入该工具                                | PASS |     1174 |
| 104 | data-url             | 页面标题为该工具名                                        | PASS |      985 |
| 105 | data-url             | 示例 → 运行 → 输出包含预期内容                            | PASS |     1026 |
| 106 | data-url             | 从首页能通过搜索进入该工具                                | PASS |     1245 |
| 107 | data-url-parser      | 页面标题为该工具名                                        | PASS |     1144 |
| 108 | data-url-parser      | 示例 → 解析 → 输出媒体类型与字节数                        | PASS |     1235 |
| 109 | data-url-parser      | 切到 raw 后只输出还原出的正文                             | PASS |     1151 |
| 110 | data-url-parser      | 非 Data URL 输入给出错误提示                              | PASS |     1103 |
| 111 | data-url-parser      | 从首页能通过搜索进入该工具                                | PASS |     1151 |
| 112 | data-workbench       | 页面标题为该工具名                                        | PASS |     1155 |
| 113 | data-workbench       | 示例 → 默认流水线给出每步结果                             | PASS |     1119 |
| 114 | data-workbench       | 改写步骤后重算，并切到只输出最终结果                      | PASS |     1210 |
| 115 | data-workbench       | 未知步骤时输出区给出错误提示                              | PASS |     1219 |
| 116 | data-workbench       | 从首页能通过搜索进入该工具                                | PASS |     1128 |
| 117 | dedupe               | 页面标题为该工具名                                        | PASS |      955 |
| 118 | dedupe               | 示例 → 运行 → 输出包含预期内容                            | PASS |     1109 |
| 119 | dedupe               | 从首页能通过搜索进入该工具                                | PASS |     1238 |
| 120 | des-encrypt          | 页面标题为该工具名                                        | PASS |     1033 |
| 121 | des-encrypt          | 示例 → 运行 → 输出为 `<iv>.<密文>` 形式的密文             | PASS |     1180 |
| 122 | des-encrypt          | 从首页能通过搜索进入该工具                                | PASS |     1219 |
| 123 | diff-highlight       | 页面标题为该工具名                                        | PASS |     1067 |
| 124 | diff-highlight       | 示例 → 运行 → 输出包含预期内容                            | PASS |     1083 |
| 125 | diff-highlight       | 从首页能通过搜索进入该工具                                | PASS |     1304 |
| 126 | duplicate-lines      | 页面标题为该工具名                                        | PASS |     1077 |
| 127 | duplicate-lines      | 示例 → 运行 → 输出包含预期内容                            | PASS |     1140 |
| 128 | duplicate-lines      | 从首页能通过搜索进入该工具                                | PASS |     1256 |
| 129 | ecc-encrypt          | 页面标题为该工具名                                        | PASS |     1012 |
| 130 | ecc-encrypt          | 示例 → 运行 → 输出已知共享密钥                            | PASS |     1049 |
| 131 | ecc-encrypt          | 从首页能通过搜索进入该工具                                | PASS |     1215 |
| 132 | ecdsa-sign           | 页面标题为该工具名                                        | PASS |     1091 |
| 133 | ecdsa-sign           | 示例 → 运行 → 产出签名                                    | PASS |     1192 |
| 134 | ecdsa-sign           | 从首页能通过搜索进入该工具                                | PASS |     1227 |
| 135 | ed25519-sign         | 页面标题为该工具名                                        | PASS |      936 |
| 136 | ed25519-sign         | 示例 → 运行 → 输出已知签名                                | PASS |     1110 |
| 137 | ed25519-sign         | 从首页能通过搜索进入该工具                                | PASS |     1281 |
| 138 | emoji                | 页面标题为该工具名                                        | PASS |     1104 |
| 139 | emoji                | 示例 → 运行 → 输出包含预期内容                            | PASS |     1180 |
| 140 | emoji                | 从首页能通过搜索进入该工具                                | PASS |     1213 |
| 141 | encoding-convert     | 页面标题为该工具名                                        | PASS |     1058 |
| 142 | encoding-convert     | 示例 → GBK 十六进制字节                                   | PASS |     1129 |
| 143 | encoding-convert     | 切到解码方向后还原出中文                                  | PASS |     1095 |
| 144 | encoding-convert     | 切到不支持的字符集时给出错误提示                          | PASS |     1159 |
| 145 | encoding-convert     | 从首页能通过搜索进入该工具                                | PASS |     1206 |
| 146 | er-diagram           | 页面标题为该工具名                                        | PASS |     1060 |
| 147 | er-diagram           | 示例 → 生成 erDiagram 源码                                | PASS |     1091 |
| 148 | er-diagram           | 无建表语句时输出区给出错误提示                            | PASS |      998 |
| 149 | escape               | 页面标题为该工具名                                        | PASS |     1107 |
| 150 | escape               | 示例 → 运行 → 输出包含预期内容                            | PASS |      999 |
| 151 | escape               | 从首页能通过搜索进入该工具                                | PASS |     1180 |
| 152 | excel-to-csv         | 页面标题为该工具名                                        | PASS |     1078 |
| 153 | excel-to-csv         | 示例 → 转换 → 输出 CSV                                    | PASS |     1156 |
| 154 | excel-to-csv         | 切到 tsv 后输出制表符分隔的文本                           | PASS |     1079 |
| 155 | excel-to-csv         | 从首页能通过搜索进入该工具                                | PASS |     1301 |
| 156 | excel-to-json-xlsx   | 页面标题为该工具名                                        | PASS |     1061 |
| 157 | excel-to-json-xlsx   | 示例 → 生成 JSON                                          | PASS |     1096 |
| 158 | extract-column       | 页面标题为该工具名                                        | PASS |     1052 |
| 159 | extract-column       | 示例 → 运行 → 输出包含预期内容                            | PASS |     1093 |
| 160 | extract-column       | 从首页能通过搜索进入该工具                                | PASS |     1186 |
| 161 | file-hash            | 页面标题为该工具名                                        | PASS |     1071 |
| 162 | file-hash            | 示例 → 运行 → 输出 MD5 与 SHA-256                         | PASS |     1287 |
| 163 | file-hash            | 文件入口存在且可选文件                                    | PASS |     1171 |
| 164 | file-hash            | 从首页能通过搜索进入该工具                                | PASS |     1329 |
| 165 | fullwidth-halfwidth  | 页面标题为该工具名                                        | PASS |     1079 |
| 166 | fullwidth-halfwidth  | 示例 → 运行 → 输出包含预期内容                            | PASS |     1060 |
| 167 | fullwidth-halfwidth  | 从首页能通过搜索进入该工具                                | PASS |     1354 |
| 168 | graphql-formatter    | 页面标题为该工具名                                        | PASS |     1011 |
| 169 | graphql-formatter    | 示例 → 生成多行查询                                       | PASS |     1266 |
| 170 | graphql-formatter    | 非法输入时输出区给出错误提示                              | PASS |     1117 |
| 171 | graphql-schema       | 页面标题为该工具名                                        | PASS |     1036 |
| 172 | graphql-schema       | 示例 → 生成结构清单                                       | PASS |     1043 |
| 173 | graphql-schema       | 无法解析时输出区给出错误提示                              | PASS |     1064 |
| 174 | graphql-to-code      | 页面标题为该工具名                                        | PASS |     1126 |
| 175 | graphql-to-code      | 示例 → 输出 TS 变量与结果类型                             | PASS |     1176 |
| 176 | graphql-to-code      | 语法错误的查询给出错误提示                                | PASS |     1139 |
| 177 | graphql-to-code      | 从首页能通过搜索进入该工具                                | PASS |     1301 |
| 178 | hex                  | 页面标题为该工具名                                        | PASS |     1023 |
| 179 | hex                  | 示例 → 运行 → 输出包含预期内容                            | PASS |     1081 |
| 180 | hex                  | 从首页能通过搜索进入该工具                                | PASS |     1184 |
| 181 | hmac-calc            | 页面标题为该工具名                                        | PASS |      948 |
| 182 | hmac-calc            | 示例 → 运行 → 输出为标准向量                              | PASS |     1083 |
| 183 | hmac-calc            | 从首页能通过搜索进入该工具                                | PASS |     1276 |
| 184 | hotp-generate        | 页面标题为该工具名                                        | PASS |     1022 |
| 185 | hotp-generate        | 示例 → 输出 RFC 4226 的 755224                            | PASS |     1030 |
| 186 | hotp-generate        | 从首页能通过搜索进入该工具                                | PASS |     1106 |
| 187 | html-entity          | 页面标题为该工具名                                        | PASS |     1137 |
| 188 | html-entity          | 示例 → 运行 → 输出包含预期内容                            | PASS |     1236 |
| 189 | html-entity          | 从首页能通过搜索进入该工具                                | PASS |     1236 |
| 190 | html-to-markdown     | 页面标题为该工具名                                        | PASS |      978 |
| 191 | html-to-markdown     | 示例 → 运行 → 输出包含预期内容                            | PASS |     1148 |
| 192 | html-to-markdown     | 从首页能通过搜索进入该工具                                | PASS |     1206 |
| 193 | http-header-parser   | 页面标题为该工具名                                        | PASS |      993 |
| 194 | http-header-parser   | 示例 → 解析 → 输出含起始行与字段数                        | PASS |     1030 |
| 195 | http-header-parser   | 切到 json 格式后输出合法 JSON                             | PASS |     1090 |
| 196 | http-header-parser   | 非法输入时输出区给出错误提示                              | PASS |     1085 |
| 197 | http-header-parser   | 从首页能通过搜索进入该工具                                | PASS |     1180 |
| 198 | indent               | 页面标题为该工具名                                        | PASS |     1123 |
| 199 | indent               | 示例 → 运行 → 输出包含预期内容                            | PASS |     1074 |
| 200 | indent               | 从首页能通过搜索进入该工具                                | PASS |     1212 |
| 201 | ini-parse            | 页面标题为该工具名                                        | PASS |     1047 |
| 202 | ini-parse            | 示例 → 转换 → 输出 JSON                                   | PASS |     1108 |
| 203 | ini-parse            | 非法输入时输出区给出错误提示                              | PASS |      952 |
| 204 | ini-parse            | 从首页能通过搜索进入该工具                                | PASS |     1314 |
| 205 | invisible-chars      | 页面标题为该工具名                                        | PASS |     1061 |
| 206 | invisible-chars      | 示例 → 运行 → 输出包含预期内容                            | PASS |      984 |
| 207 | invisible-chars      | 从首页能通过搜索进入该工具                                | PASS |     1296 |
| 208 | js-escape            | 页面标题为该工具名                                        | PASS |     1020 |
| 209 | js-escape            | 示例 → 运行 → 输出包含预期内容                            | PASS |     1067 |
| 210 | js-escape            | 从首页能通过搜索进入该工具                                | PASS |     1269 |
| 211 | json-diff            | 页面标题为该工具名                                        | PASS |     1027 |
| 212 | json-diff            | 示例 → 对比 → 输出含差异行                                | PASS |     1035 |
| 213 | json-diff            | 两份相同 JSON 时提示内容相同                              | PASS |     1094 |
| 214 | json-diff            | 从首页能通过搜索进入该工具                                | PASS |     1133 |
| 215 | json-formatter       | 页面标题为该工具名                                        | PASS |     1030 |
| 216 | json-formatter       | 示例 → 格式化 → 输出包含格式化后的键                      | PASS |     1004 |
| 217 | json-formatter       | 非法输入时输出区给出错误提示                              | PASS |     1143 |
| 218 | json-formatter       | 清空按钮复位输入                                          | PASS |     1124 |
| 219 | json-formatter       | 从首页能通过搜索进入该工具                                | PASS |     1246 |
| 220 | json-merge           | 页面标题为该工具名                                        | PASS |      989 |
| 221 | json-merge           | 示例 → 合并 → 输出含两侧的字段                            | PASS |     1073 |
| 222 | json-merge           | 非法输入时输出区给出错误提示                              | PASS |     1047 |
| 223 | json-merge           | 从首页能通过搜索进入该工具                                | PASS |     1192 |
| 224 | json-minify          | 页面标题为该工具名                                        | PASS |      971 |
| 225 | json-minify          | 示例 → 压缩 → 输出为单行                                  | PASS |     1053 |
| 226 | json-minify          | 非法输入时输出区给出错误提示                              | PASS |     1072 |
| 227 | json-minify          | 从首页能通过搜索进入该工具                                | PASS |     1243 |
| 228 | json-schema-gen      | 页面标题为该工具名                                        | PASS |      926 |
| 229 | json-schema-gen      | 示例 → 生成 → 输出含 draft-07 的 $schema                  | PASS |     1052 |
| 230 | json-schema-gen      | 非法输入时输出区给出错误提示                              | PASS |     1018 |
| 231 | json-schema-gen      | 从首页能通过搜索进入该工具                                | PASS |     1210 |
| 232 | json-schema-validate | 页面标题为该工具名                                        | PASS |     1027 |
| 233 | json-schema-validate | 示例 → 校验 → 输出通过结论                                | PASS |     1212 |
| 234 | json-schema-validate | 数据改坏后输出区列出不符合项                              | PASS |     1162 |
| 235 | json-schema-validate | 从首页能通过搜索进入该工具                                | PASS |     1226 |
| 236 | json-sort            | 页面标题为该工具名                                        | PASS |     1012 |
| 237 | json-sort            | 示例 → 排序 → 输出键名按升序                              | PASS |     1012 |
| 238 | json-sort            | 非法输入时输出区给出错误提示                              | PASS |     1026 |
| 239 | json-sort            | 从首页能通过搜索进入该工具                                | PASS |     1324 |
| 240 | json-to-csv          | 页面标题为该工具名                                        | PASS |     1070 |
| 241 | json-to-csv          | 示例 → 生成 CSV                                           | PASS |     1127 |
| 242 | json-to-csv          | 非法输入时输出区给出错误提示                              | PASS |     1166 |
| 243 | json-to-go           | 页面标题为该工具名                                        | PASS |     1035 |
| 244 | json-to-go           | 示例 → 生成 Go 结构体                                     | PASS |     1048 |
| 245 | json-to-go           | 非法输入时输出区给出错误提示                              | PASS |     1121 |
| 246 | json-to-go           | 从首页能通过搜索进入该工具                                | PASS |     1326 |
| 247 | json-to-java         | 页面标题为该工具名                                        | PASS |     1020 |
| 248 | json-to-java         | 示例 → 生成 Java 类                                       | PASS |     1137 |
| 249 | json-to-java         | 非法输入时输出区给出错误提示                              | PASS |     1165 |
| 250 | json-to-python       | 页面标题为该工具名                                        | PASS |     1042 |
| 251 | json-to-python       | 示例 → 生成 Python 模型                                   | PASS |     1145 |
| 252 | json-to-python       | 非法输入时输出区给出错误提示                              | PASS |     1081 |
| 253 | json-to-rust         | 页面标题为该工具名                                        | PASS |     1161 |
| 254 | json-to-rust         | 示例 → 生成 Rust struct                                   | PASS |     1164 |
| 255 | json-to-rust         | 非法输入时输出区给出错误提示                              | PASS |     1201 |
| 256 | json-to-toml         | 页面标题为该工具名                                        | PASS |     1122 |
| 257 | json-to-toml         | 示例 → 生成 TOML                                          | PASS |     1165 |
| 258 | json-to-toml         | 非法输入时输出区给出错误提示                              | PASS |     1051 |
| 259 | json-to-ts           | 页面标题为该工具名                                        | PASS |     1088 |
| 260 | json-to-ts           | 示例 → 生成 TS 接口                                       | PASS |     1264 |
| 261 | json-to-ts           | 非法输入时输出区给出错误提示                              | PASS |     1119 |
| 262 | json-to-ts           | 从首页能通过搜索进入该工具                                | PASS |     1283 |
| 263 | json-to-xml          | 页面标题为该工具名                                        | PASS |      957 |
| 264 | json-to-xml          | 示例 → 生成 XML                                           | PASS |     1032 |
| 265 | json-to-xml          | 非法输入时输出区给出错误提示                              | PASS |     1115 |
| 266 | json-to-yaml         | 页面标题为该工具名                                        | PASS |     1117 |
| 267 | json-to-yaml         | 示例 → 生成 YAML                                          | PASS |     1194 |
| 268 | json-to-yaml         | 非法输入时输出区给出错误提示                              | PASS |     1052 |
| 269 | json-tree            | 页面标题为该工具名                                        | PASS |      900 |
| 270 | json-tree            | 示例 → 树形 → 输出根节点概要行                            | PASS |     1115 |
| 271 | json-tree            | 非法输入时输出区给出错误提示                              | PASS |     1118 |
| 272 | json-tree            | 从首页能通过搜索进入该工具                                | PASS |     1216 |
| 273 | json-validate        | 页面标题为该工具名                                        | PASS |     1116 |
| 274 | json-validate        | 示例 → 校验 → 输出含「JSON 合法」                         | PASS |     1160 |
| 275 | json-validate        | 非法输入时输出区给出带行列号的错误提示                    | PASS |     1093 |
| 276 | json-validate        | 从首页能通过搜索进入该工具                                | PASS |     1115 |
| 277 | jsonl                | 页面标题为该工具名                                        | PASS |     1085 |
| 278 | jsonl                | 示例 → 解析 → 输出 JSON 数组                              | PASS |     1074 |
| 279 | jsonl                | 坏行时输出区给出带行号的错误提示                          | PASS |     1197 |
| 280 | jsonl                | 从首页能通过搜索进入该工具                                | PASS |     1203 |
| 281 | jsonpath             | 页面标题为该工具名                                        | PASS |     1062 |
| 282 | jsonpath             | 示例 → 用默认表达式查出书名列表                           | PASS |      977 |
| 283 | jsonpath             | 非法输入时输出区给出错误提示                              | PASS |      956 |
| 284 | jsonpath             | 从首页能通过搜索进入该工具                                | PASS |     1286 |
| 285 | jwe-parse            | 页面标题为该工具名                                        | PASS |     1176 |
| 286 | jwe-parse            | 示例 → 运行 → 解密出明文                                  | PASS |     1275 |
| 287 | jwe-parse            | 从首页能通过搜索进入该工具                                | PASS |     1270 |
| 288 | jws-parse            | 页面标题为该工具名                                        | PASS |     1031 |
| 289 | jws-parse            | 示例 → 运行 → 验签通过                                    | PASS |     1104 |
| 290 | jws-parse            | 从首页能通过搜索进入该工具                                | PASS |     1177 |
| 291 | jwt-decode           | 页面标题为该工具名                                        | PASS |     1107 |
| 292 | jwt-decode           | 示例 → 输出包含 header 与 payload                         | PASS |     1068 |
| 293 | jwt-decode           | 从首页能通过搜索进入该工具                                | PASS |     1202 |
| 294 | jwt-generate         | 页面标题为该工具名                                        | PASS |     1090 |
| 295 | jwt-generate         | 示例 → 运行 → 输出已知令牌                                | PASS |     1111 |
| 296 | jwt-generate         | 从首页能通过搜索进入该工具                                | PASS |     1163 |
| 297 | key-generate         | 页面标题为该工具名                                        | PASS |     1158 |
| 298 | key-generate         | 示例 → 运行 → 输出 32 位十六进制密钥                      | PASS |     1317 |
| 299 | key-generate         | 从首页能通过搜索进入该工具                                | PASS |     1408 |
| 300 | keyword-density      | 页面标题为该工具名                                        | PASS |     1093 |
| 301 | keyword-density      | 示例 → 运行 → 输出包含预期内容                            | PASS |     1077 |
| 302 | keyword-density      | 从首页能通过搜索进入该工具                                | PASS |     1191 |
| 303 | line-ending          | 页面标题为该工具名                                        | PASS |     1054 |
| 304 | line-ending          | 示例 → 运行 → 输出包含预期内容                            | PASS |     1179 |
| 305 | line-ending          | 从首页能通过搜索进入该工具                                | PASS |     1194 |
| 306 | line-numbers         | 页面标题为该工具名                                        | PASS |     1173 |
| 307 | line-numbers         | 示例 → 运行 → 输出包含预期内容                            | PASS |     1056 |
| 308 | line-numbers         | 从首页能通过搜索进入该工具                                | PASS |     1213 |
| 309 | lorem                | 页面标题为该工具名                                        | PASS |     1011 |
| 310 | lorem                | 示例 → 运行 → 输出包含预期内容                            | PASS |     1085 |
| 311 | lorem                | 从首页能通过搜索进入该工具                                | PASS |     1340 |
| 312 | markdown-preview     | 页面标题为该工具名                                        | PASS |     1021 |
| 313 | markdown-preview     | 示例 → 运行 → 输出包含预期内容                            | PASS |     1117 |
| 314 | markdown-preview     | 从首页能通过搜索进入该工具                                | PASS |     1144 |
| 315 | markdown-to-html     | 页面标题为该工具名                                        | PASS |      979 |
| 316 | markdown-to-html     | 示例 → 运行 → 输出包含预期内容                            | PASS |     1088 |
| 317 | markdown-to-html     | 从首页能通过搜索进入该工具                                | PASS |     1208 |
| 318 | md5-hash             | 页面标题为该工具名                                        | PASS |     1066 |
| 319 | md5-hash             | 示例 → 运行 → 输出为 900150983cd24fb0d6963f7d28e17f72     | PASS |     1166 |
| 320 | md5-hash             | 从首页能通过搜索进入该工具                                | PASS |     1132 |
| 321 | messagepack          | 页面标题为该工具名                                        | PASS |     1033 |
| 322 | messagepack          | 示例 → 输出 hex 字节串                                    | PASS |     1127 |
| 323 | messagepack          | 解码模式下还原 JSON                                       | PASS |     1051 |
| 324 | messagepack          | 从首页能通过搜索进入该工具                                | PASS |     1289 |
| 325 | mime-encode          | 页面标题为该工具名                                        | PASS |     1027 |
| 326 | mime-encode          | 示例 → 运行 → 输出包含预期内容                            | PASS |     1100 |
| 327 | mime-encode          | 从首页能通过搜索进入该工具                                | PASS |     1367 |
| 328 | mime-lookup          | 页面标题为该工具名                                        | PASS |     1044 |
| 329 | mime-lookup          | 示例 → 扩展名查 MIME                                      | PASS |     1085 |
| 330 | mime-lookup          | 切到 MIME 反查模式后能反查扩展名                          | PASS |     1054 |
| 331 | mime-lookup          | 严格模式下未命中给出错误提示                              | PASS |     1059 |
| 332 | mime-lookup          | 从首页能通过搜索进入该工具                                | PASS |     1219 |
| 333 | mock-data            | 页面标题为该工具名                                        | PASS |     1045 |
| 334 | mock-data            | 示例 → 生成 5 条含中文姓名的 JSON                         | PASS |     1104 |
| 335 | mock-data            | 切换数量后数据条数变化                                    | PASS |     1029 |
| 336 | mock-data            | 未知占位符时输出区给出错误提示                            | PASS |     1039 |
| 337 | mock-data            | 从首页能通过搜索进入该工具                                | PASS |     1198 |
| 338 | multi-diff           | 页面标题为该工具名                                        | PASS |      986 |
| 339 | multi-diff           | 示例 → 运行 → 输出包含预期内容                            | PASS |     1007 |
| 340 | multi-diff           | 从首页能通过搜索进入该工具                                | PASS |     1348 |
| 341 | naming-convert       | 页面标题为该工具名                                        | PASS |     1001 |
| 342 | naming-convert       | 示例 → 运行 → 输出包含预期内容                            | PASS |     1018 |
| 343 | naming-convert       | 从首页能通过搜索进入该工具                                | PASS |     1200 |
| 344 | octal                | 页面标题为该工具名                                        | PASS |     1031 |
| 345 | octal                | 示例 → 运行 → 输出包含预期内容                            | PASS |     1151 |
| 346 | octal                | 从首页能通过搜索进入该工具                                | PASS |     1187 |
| 347 | otp-qr               | 页面标题为该工具名                                        | PASS |     1006 |
| 348 | otp-qr               | 示例 → 输出 otpauth:// URI                                | PASS |     1196 |
| 349 | otp-qr               | 从首页能通过搜索进入该工具                                | PASS |     1156 |
| 350 | parquet-view         | 页面标题为该工具名                                        | PASS |     1086 |
| 351 | parquet-view         | 存在 .parquet 文件上传入口                                | PASS |      959 |
| 352 | parquet-view         | 文本运行时提示改用文件上传                                | PASS |     1079 |
| 353 | passphrase           | 页面标题为该工具名                                        | PASS |      969 |
| 354 | passphrase           | 示例 → 运行 → 输出 4 段单词短语                           | PASS |     1014 |
| 355 | passphrase           | 从首页能通过搜索进入该工具                                | PASS |     1307 |
| 356 | password-generator   | 页面标题为该工具名                                        | PASS |     1075 |
| 357 | password-generator   | 示例 → 运行 → 输出一条密码                                | PASS |     1084 |
| 358 | password-generator   | 从首页能通过搜索进入该工具                                | PASS |     1317 |
| 359 | password-strength    | 页面标题为该工具名                                        | PASS |     1014 |
| 360 | password-strength    | 示例 → 输出强度结论                                       | PASS |      962 |
| 361 | password-strength    | 从首页能通过搜索进入该工具                                | PASS |     1143 |
| 362 | pbkdf2-derive        | 页面标题为该工具名                                        | PASS |     1134 |
| 363 | pbkdf2-derive        | 示例 → 运行 → 输出为十六进制派生结果                      | PASS |     1166 |
| 364 | pbkdf2-derive        | 从首页能通过搜索进入该工具                                | PASS |     1232 |
| 365 | pem-parse            | 页面标题为该工具名                                        | PASS |     1000 |
| 366 | pem-parse            | 示例 → 运行 → 输出证书主题与公钥位数                      | PASS |     1309 |
| 367 | pem-parse            | 从首页能通过搜索进入该工具                                | PASS |     1310 |
| 368 | pgp-tool             | 页面标题为该工具名                                        | PASS |     1000 |
| 369 | pgp-tool             | 示例 → 运行后给出结构总览                                 | PASS |     1118 |
| 370 | pgp-tool             | 非 armor 文本时输出区给出错误提示                         | PASS |     1183 |
| 371 | pinyin               | 页面标题为该工具名                                        | PASS |     1088 |
| 372 | pinyin               | 示例 → 运行 → 输出包含预期内容                            | PASS |     1058 |
| 373 | pinyin               | 从首页能通过搜索进入该工具                                | PASS |     1337 |
| 374 | prefix-suffix        | 页面标题为该工具名                                        | PASS |     1056 |
| 375 | prefix-suffix        | 示例 → 运行 → 输出包含预期内容                            | PASS |     1018 |
| 376 | prefix-suffix        | 从首页能通过搜索进入该工具                                | PASS |     1232 |
| 377 | properties-parse     | 页面标题为该工具名                                        | PASS |     1002 |
| 378 | properties-parse     | 示例 → 转换 → 输出还原转义后的 JSON                       | PASS |     1022 |
| 379 | properties-parse     | 非法输入时输出区给出错误提示                              | PASS |     1081 |
| 380 | properties-parse     | 从首页能通过搜索进入该工具                                | PASS |     1426 |
| 381 | protobuf-codec       | 页面标题为该工具名                                        | PASS |     1174 |
| 382 | protobuf-codec       | 示例 → 输出结构预览                                       | PASS |     1155 |
| 383 | protobuf-codec       | 编码模式下给出 hex 字节串                                 | PASS |     1188 |
| 384 | protobuf-codec       | 从首页能通过搜索进入该工具                                | PASS |     1210 |
| 385 | punycode             | 页面标题为该工具名                                        | PASS |     1045 |
| 386 | punycode             | 示例 → 运行 → 输出包含预期内容                            | PASS |     1094 |
| 387 | punycode             | 从首页能通过搜索进入该工具                                | PASS |     1263 |
| 388 | query-string         | 页面标题为该工具名                                        | PASS |      999 |
| 389 | query-string         | 示例 → 解析 → 输出包含解码后的中文                        | PASS |     1045 |
| 390 | query-string         | 生成模式下把 JSON 转成查询串                              | PASS |     1062 |
| 391 | query-string         | 从首页能通过搜索进入该工具                                | PASS |     1158 |
| 392 | quoted-printable     | 页面标题为该工具名                                        | PASS |     1009 |
| 393 | quoted-printable     | 示例 → 运行 → 输出包含预期内容                            | PASS |     1067 |
| 394 | quoted-printable     | 从首页能通过搜索进入该工具                                | PASS |     1282 |
| 395 | random-salt          | 页面标题为该工具名                                        | PASS |     1035 |
| 396 | random-salt          | 示例 → 运行 → 输出 32 位十六进制盐                        | PASS |     1113 |
| 397 | random-salt          | 从首页能通过搜索进入该工具                                | PASS |     1290 |
| 398 | readability          | 页面标题为该工具名                                        | PASS |     1020 |
| 399 | readability          | 示例 → 运行 → 输出包含预期内容                            | PASS |     1052 |
| 400 | readability          | 从首页能通过搜索进入该工具                                | PASS |     1204 |
| 401 | reading-time         | 页面标题为该工具名                                        | PASS |     1045 |
| 402 | reading-time         | 示例 → 运行 → 输出包含预期内容                            | PASS |     1106 |
| 403 | reading-time         | 从首页能通过搜索进入该工具                                | PASS |     1191 |
| 404 | regex-replace        | 页面标题为该工具名                                        | PASS |      934 |
| 405 | regex-replace        | 示例 → 运行 → 输出包含预期内容                            | PASS |     1040 |
| 406 | regex-replace        | 从首页能通过搜索进入该工具                                | PASS |     1285 |
| 407 | rewrite              | 页面标题为该工具名                                        | PASS |     1069 |
| 408 | rewrite              | 示例按钮填入正文（实际调用需自备接口，不在 E2E 里发请求） | PASS |     1153 |
| 409 | rewrite              | 从首页能通过搜索进入该工具                                | PASS |     1299 |
| 410 | rich-to-text         | 页面标题为该工具名                                        | PASS |      917 |
| 411 | rich-to-text         | 示例 → 运行 → 输出包含预期内容                            | PASS |     1107 |
| 412 | rich-to-text         | 从首页能通过搜索进入该工具                                | PASS |     1347 |
| 413 | rsa-encrypt          | 页面标题为该工具名                                        | PASS |      992 |
| 414 | rsa-encrypt          | 示例 → 运行 → 输出确定性签名                              | PASS |     1087 |
| 415 | rsa-encrypt          | 从首页能通过搜索进入该工具                                | PASS |     1214 |
| 416 | schema-diff          | 页面标题为该工具名                                        | PASS |      982 |
| 417 | schema-diff          | 示例 → 对比 → 输出类型变更与新增表                        | PASS |     1080 |
| 418 | schema-diff          | 切到 markdown 后输出表格                                  | PASS |     1044 |
| 419 | schema-diff          | 非法输入时输出区给出错误提示                              | PASS |     1149 |
| 420 | schema-diff          | 从首页能通过搜索进入该工具                                | PASS |     1283 |
| 421 | scrypt-derive        | 页面标题为该工具名                                        | PASS |      966 |
| 422 | scrypt-derive        | 示例 → 运行 → 输出为十六进制派生结果                      | PASS |     1228 |
| 423 | scrypt-derive        | 从首页能通过搜索进入该工具                                | PASS |     1276 |
| 424 | security-headers     | 页面标题为该工具名                                        | PASS |     1021 |
| 425 | security-headers     | 示例 → 生成检测报告                                       | PASS |     1021 |
| 426 | security-headers     | 无法解析时输出区给出错误提示                              | PASS |     1140 |
| 427 | sensitive-words      | 页面标题为该工具名                                        | PASS |     1044 |
| 428 | sensitive-words      | 示例 → 运行 → 输出包含预期内容                            | PASS |     1057 |
| 429 | sensitive-words      | 从首页能通过搜索进入该工具                                | PASS |     1193 |
| 430 | sentiment            | 页面标题为该工具名                                        | PASS |     1017 |
| 431 | sentiment            | 示例 → 运行 → 输出包含预期内容                            | PASS |     1219 |
| 432 | sentiment            | 从首页能通过搜索进入该工具                                | PASS |     1185 |
| 433 | sha1-hash            | 页面标题为该工具名                                        | PASS |      972 |
| 434 | sha1-hash            | 示例 → 运行 → 输出为标准向量                              | PASS |     1007 |
| 435 | sha1-hash            | 从首页能通过搜索进入该工具                                | PASS |     1166 |
| 436 | sha256-hash          | 页面标题为该工具名                                        | PASS |     1047 |
| 437 | sha256-hash          | 示例 → 运行 → 输出为标准向量                              | PASS |     1071 |
| 438 | sha256-hash          | 从首页能通过搜索进入该工具                                | PASS |     1268 |
| 439 | sha3-hash            | 页面标题为该工具名                                        | PASS |     1026 |
| 440 | sha3-hash            | 示例 → 运行 → 输出为标准向量                              | PASS |     1196 |
| 441 | sha3-hash            | 从首页能通过搜索进入该工具                                | PASS |     1282 |
| 442 | shuffle              | 页面标题为该工具名                                        | PASS |     1054 |
| 443 | shuffle              | 示例 → 运行 → 输出包含预期内容                            | PASS |     1009 |
| 444 | shuffle              | 从首页能通过搜索进入该工具                                | PASS |     1189 |
| 445 | slug                 | 页面标题为该工具名                                        | PASS |     1035 |
| 446 | slug                 | 示例 → 运行 → 输出包含预期内容                            | PASS |     1075 |
| 447 | slug                 | 从首页能通过搜索进入该工具                                | PASS |     1112 |
| 448 | sort                 | 页面标题为该工具名                                        | PASS |     1032 |
| 449 | sort                 | 示例 → 运行 → 输出包含预期内容                            | PASS |     1010 |
| 450 | sort                 | 从首页能通过搜索进入该工具                                | PASS |     1168 |
| 451 | split-columns        | 页面标题为该工具名                                        | PASS |      954 |
| 452 | split-columns        | 示例 → 运行 → 输出包含预期内容                            | PASS |     1117 |
| 453 | split-columns        | 从首页能通过搜索进入该工具                                | PASS |     1123 |
| 454 | sql-dialect          | 页面标题为该工具名                                        | PASS |     1067 |
| 455 | sql-dialect          | 示例 → 转 PostgreSQL → 输出含 SERIAL 与 OFFSET            | PASS |      988 |
| 456 | sql-dialect          | 非法输入时输出区给出错误提示                              | PASS |     1021 |
| 457 | sql-dialect          | 从首页能通过搜索进入该工具                                | PASS |     1132 |
| 458 | sql-escape           | 页面标题为该工具名                                        | PASS |      986 |
| 459 | sql-escape           | 示例 → 运行 → 输出包含预期内容                            | PASS |     1167 |
| 460 | sql-escape           | 从首页能通过搜索进入该工具                                | PASS |     1324 |
| 461 | sql-format           | 页面标题为该工具名                                        | PASS |     1066 |
| 462 | sql-format           | 示例 → 格式化 → 输出含换行后的 FROM 子句                  | PASS |     1013 |
| 463 | sql-format           | 非法输入时输出区给出错误提示                              | PASS |     1030 |
| 464 | sql-format           | 从首页能通过搜索进入该工具                                | PASS |     1110 |
| 465 | sql-minify           | 页面标题为该工具名                                        | PASS |     1007 |
| 466 | sql-minify           | 示例 → 压缩 → 输出为单行且不含注释                        | PASS |      999 |
| 467 | sql-minify           | 非法输入时输出区给出错误提示                              | PASS |     1108 |
| 468 | sql-minify           | 从首页能通过搜索进入该工具                                | PASS |     1218 |
| 469 | sql-to-json          | 页面标题为该工具名                                        | PASS |      921 |
| 470 | sql-to-json          | 示例 → 生成 $defs 结构                                    | PASS |     1054 |
| 471 | sql-to-json          | 无建表语句时输出区给出错误提示                            | PASS |     1125 |
| 472 | sql-to-orm           | 页面标题为该工具名                                        | PASS |     1119 |
| 473 | sql-to-orm           | 示例 → 生成 Sequelize 模型                                | PASS |     1041 |
| 474 | sql-to-orm           | 无法解析时输出区给出错误提示                              | PASS |     1029 |
| 475 | sqlite-viewer        | 页面标题为该工具名                                        | PASS |      969 |
| 476 | sqlite-viewer        | 存在 .sqlite 文件上传入口                                 | PASS |      981 |
| 477 | sqlite-viewer        | 文本运行时提示改用文件上传                                | PASS |     1165 |
| 478 | ssh-key              | 页面标题为该工具名                                        | PASS |      970 |
| 479 | ssh-key              | 示例 → 运行 → 输出 OpenSSH 公钥                           | PASS |     1038 |
| 480 | ssh-key              | 从首页能通过搜索进入该工具                                | PASS |     1318 |
| 481 | ssl-check            | 页面标题为该工具名                                        | PASS |     1156 |
| 482 | ssl-check            | 示例 → 运行后给出体检结论                                 | PASS |     1214 |
| 483 | ssl-check            | 非法 PEM 时输出区给出错误提示                             | PASS |     1299 |
| 484 | stt                  | 页面标题为该工具名                                        | PASS |     1039 |
| 485 | stt                  | 初始状态不请求麦克风，输出区给出待运行提示                | PASS |     1074 |
| 486 | stt                  | 从首页能通过搜索进入该工具                                | PASS |     1122 |
| 487 | summarize            | 页面标题为该工具名                                        | PASS |     1025 |
| 488 | summarize            | 示例按钮填入正文（实际调用需自备接口，不在 E2E 里发请求） | PASS |     1138 |
| 489 | summarize            | 从首页能通过搜索进入该工具                                | PASS |     1147 |
| 490 | symbols              | 页面标题为该工具名                                        | PASS |     1133 |
| 491 | symbols              | 示例 → 运行 → 输出包含预期内容                            | PASS |     1189 |
| 492 | symbols              | 从首页能通过搜索进入该工具                                | PASS |     1223 |
| 493 | table-to-text        | 页面标题为该工具名                                        | PASS |     1002 |
| 494 | table-to-text        | 示例 → 运行 → 输出包含预期内容                            | PASS |     1087 |
| 495 | table-to-text        | 从首页能通过搜索进入该工具                                | PASS |     1192 |
| 496 | tag-gen              | 页面标题为该工具名                                        | PASS |     1040 |
| 497 | tag-gen              | 示例按钮填入正文（实际调用需自备接口，不在 E2E 里发请求） | PASS |     1150 |
| 498 | tag-gen              | 从首页能通过搜索进入该工具                                | PASS |     1177 |
| 499 | template             | 页面标题为该工具名                                        | PASS |      971 |
| 500 | template             | 示例 → 运行 → 输出包含预期内容                            | PASS |     1077 |
| 501 | template             | 从首页能通过搜索进入该工具                                | PASS |     1398 |
| 502 | text-align           | 页面标题为该工具名                                        | PASS |     1061 |
| 503 | text-align           | 示例 → 运行 → 输出包含预期内容                            | PASS |     1009 |
| 504 | text-align           | 从首页能通过搜索进入该工具                                | PASS |     1342 |
| 505 | text-compare         | 页面标题为该工具名                                        | PASS |     1107 |
| 506 | text-compare         | 示例 → 运行 → 输出包含预期内容                            | PASS |      991 |
| 507 | text-compare         | 从首页能通过搜索进入该工具                                | PASS |     1269 |
| 508 | text-diff            | 页面标题为该工具名                                        | PASS |      992 |
| 509 | text-diff            | 示例 → 运行 → 输出包含预期内容                            | PASS |     1164 |
| 510 | text-diff            | 从首页能通过搜索进入该工具                                | PASS |     1227 |
| 511 | text-encrypt         | 页面标题为该工具名                                        | PASS |     1049 |
| 512 | text-encrypt         | 示例按钮填入正文（实际调用需自备接口，不在 E2E 里发请求） | PASS |     1066 |
| 513 | text-encrypt         | 从首页能通过搜索进入该工具                                | PASS |     1173 |
| 514 | text-hash            | 页面标题为该工具名                                        | PASS |      972 |
| 515 | text-hash            | 示例按钮填入正文（实际调用需自备接口，不在 E2E 里发请求） | PASS |      994 |
| 516 | text-hash            | 从首页能通过搜索进入该工具                                | PASS |     1261 |
| 517 | text-merge           | 页面标题为该工具名                                        | PASS |     1060 |
| 518 | text-merge           | 示例 → 运行 → 输出包含预期内容                            | PASS |     1088 |
| 519 | text-merge           | 从首页能通过搜索进入该工具                                | PASS |     1277 |
| 520 | text-pad             | 页面标题为该工具名                                        | PASS |     1092 |
| 521 | text-pad             | 示例 → 运行 → 输出包含预期内容                            | PASS |     1052 |
| 522 | text-pad             | 从首页能通过搜索进入该工具                                | PASS |     1235 |
| 523 | text-stats           | 页面标题为该工具名                                        | PASS |     1099 |
| 524 | text-stats           | 示例 → 运行 → 输出包含预期内容                            | PASS |     1745 |
| 525 | text-stats           | 从首页能通过搜索进入该工具                                | PASS |     1598 |
| 526 | text-to-qr           | 页面标题为该工具名                                        | PASS |     1293 |
| 527 | text-to-qr           | 示例 → 运行 → 输出包含预期内容                            | PASS |     1368 |
| 528 | text-to-qr           | 从首页能通过搜索进入该工具                                | PASS |     1288 |
| 529 | text-to-table        | 页面标题为该工具名                                        | PASS |     1034 |
| 530 | text-to-table        | 示例 → 运行 → 输出包含预期内容                            | PASS |     1090 |
| 531 | text-to-table        | 从首页能通过搜索进入该工具                                | PASS |     1244 |
| 532 | text-truncate        | 页面标题为该工具名                                        | PASS |     1110 |
| 533 | text-truncate        | 示例 → 运行 → 输出包含预期内容                            | PASS |     1238 |
| 534 | text-truncate        | 从首页能通过搜索进入该工具                                | PASS |     1238 |
| 535 | text-unwatermark     | 页面标题为该工具名                                        | PASS |     1040 |
| 536 | text-unwatermark     | 示例 → 运行 → 输出包含预期内容                            | PASS |     1121 |
| 537 | text-unwatermark     | 从首页能通过搜索进入该工具                                | PASS |     1319 |
| 538 | text-watermark       | 页面标题为该工具名                                        | PASS |     1111 |
| 539 | text-watermark       | 示例 → 运行 → 输出包含预期内容                            | PASS |     1308 |
| 540 | text-watermark       | 从首页能通过搜索进入该工具                                | PASS |     1383 |
| 541 | text-workbench       | 页面标题为该工具名                                        | PASS |     1160 |
| 542 | text-workbench       | 示例 → 运行 → 输出包含预期内容                            | PASS |     1122 |
| 543 | text-workbench       | 从首页能通过搜索进入该工具                                | PASS |     1324 |
| 544 | text-wrap            | 页面标题为该工具名                                        | PASS |      997 |
| 545 | text-wrap            | 示例 → 运行 → 输出包含预期内容                            | PASS |     1171 |
| 546 | text-wrap            | 从首页能通过搜索进入该工具                                | PASS |     1291 |
| 547 | title-gen            | 页面标题为该工具名                                        | PASS |     1048 |
| 548 | title-gen            | 示例按钮填入正文（实际调用需自备接口，不在 E2E 里发请求） | PASS |     1049 |
| 549 | title-gen            | 从首页能通过搜索进入该工具                                | PASS |     1244 |
| 550 | toml-parse           | 页面标题为该工具名                                        | PASS |      955 |
| 551 | toml-parse           | 示例 → 转换 → 输出 JSON                                   | PASS |     1191 |
| 552 | toml-parse           | 非法输入时输出区给出错误提示                              | PASS |     1081 |
| 553 | toml-parse           | 从首页能通过搜索进入该工具                                | PASS |     1255 |
| 554 | totp-generate        | 页面标题为该工具名                                        | PASS |      989 |
| 555 | totp-generate        | 示例 → 输出 6 位验证码                                    | PASS |     1053 |
| 556 | totp-generate        | 从首页能通过搜索进入该工具                                | PASS |     1288 |
| 557 | translate            | 页面标题为该工具名                                        | PASS |      940 |
| 558 | translate            | 示例按钮填入正文（实际调用需自备接口，不在 E2E 里发请求） | PASS |     1049 |
| 559 | translate            | 从首页能通过搜索进入该工具                                | PASS |     1270 |
| 560 | tts                  | 页面标题为该工具名                                        | PASS |     1006 |
| 561 | tts                  | 示例按钮填入正文（实际调用需自备接口，不在 E2E 里发请求） | PASS |     1019 |
| 562 | tts                  | 从首页能通过搜索进入该工具                                | PASS |     1204 |
| 563 | unicode-escape       | 页面标题为该工具名                                        | PASS |     1001 |
| 564 | unicode-escape       | 示例 → 运行 → 输出包含预期内容                            | PASS |     1025 |
| 565 | unicode-escape       | 从首页能通过搜索进入该工具                                | PASS |     1231 |
| 566 | unicode-lookup       | 页面标题为该工具名                                        | PASS |     1036 |
| 567 | unicode-lookup       | 示例 → 运行 → 输出包含预期内容                            | PASS |     1078 |
| 568 | unicode-lookup       | 从首页能通过搜索进入该工具                                | PASS |     1241 |
| 569 | url-codec            | 页面标题为该工具名                                        | PASS |      978 |
| 570 | url-codec            | 示例 → 运行 → 输出包含预期内容                            | PASS |     1180 |
| 571 | url-codec            | 从首页能通过搜索进入该工具                                | PASS |     1266 |
| 572 | url-parser           | 页面标题为该工具名                                        | PASS |     1035 |
| 573 | url-parser           | 示例 → 解析 → 输出包含主机名                              | PASS |     1009 |
| 574 | url-parser           | 无协议输入时输出区给出错误提示                            | PASS |     1061 |
| 575 | url-parser           | 从首页能通过搜索进入该工具                                | PASS |     1133 |
| 576 | uuencode-codec       | 页面标题为该工具名                                        | PASS |     1062 |
| 577 | uuencode-codec       | 示例 → 运行 → 输出包含预期内容                            | PASS |      970 |
| 578 | uuencode-codec       | 从首页能通过搜索进入该工具                                | PASS |     1384 |
| 579 | whitespace           | 页面标题为该工具名                                        | PASS |      972 |
| 580 | whitespace           | 示例 → 运行 → 输出包含预期内容                            | PASS |     1006 |
| 581 | whitespace           | 从首页能通过搜索进入该工具                                | PASS |     1184 |
| 582 | word-count           | 页面标题为该工具名                                        | PASS |     1060 |
| 583 | word-count           | 示例 → 运行 → 输出包含预期内容                            | PASS |     1154 |
| 584 | word-count           | 从首页能通过搜索进入该工具                                | PASS |     1170 |
| 585 | word-frequency       | 页面标题为该工具名                                        | PASS |      972 |
| 586 | word-frequency       | 示例 → 运行 → 输出包含预期内容                            | PASS |     1083 |
| 587 | word-frequency       | 从首页能通过搜索进入该工具                                | PASS |     1270 |
| 588 | xml-escape           | 页面标题为该工具名                                        | PASS |      982 |
| 589 | xml-escape           | 示例 → 运行 → 输出包含预期内容                            | PASS |     1141 |
| 590 | xml-escape           | 从首页能通过搜索进入该工具                                | PASS |     1143 |
| 591 | xml-formatter        | 页面标题为该工具名                                        | PASS |     1016 |
| 592 | xml-formatter        | 示例 → 格式化 → 输出带缩进                                | PASS |     1066 |
| 593 | xml-formatter        | 切到 minify 后输出压成单行                                | PASS |     1026 |
| 594 | xml-formatter        | 从首页能通过搜索进入该工具                                | PASS |     1143 |
| 595 | xml-to-json          | 页面标题为该工具名                                        | PASS |     1062 |
| 596 | xml-to-json          | 示例 → 转换 → 输出 JSON                                   | PASS |     1079 |
| 597 | xml-to-json          | 非法输入时输出区给出错误提示                              | PASS |     1197 |
| 598 | xml-to-json          | 从首页能通过搜索进入该工具                                | PASS |     1171 |
| 599 | xxhash-hash          | 页面标题为该工具名                                        | PASS |     1004 |
| 600 | xxhash-hash          | 示例 → 运行 → 输出 xxHash32                               | PASS |     1180 |
| 601 | xxhash-hash          | 从首页能通过搜索进入该工具                                | PASS |     1261 |
| 602 | yaml-formatter       | 页面标题为该工具名                                        | PASS |      952 |
| 603 | yaml-formatter       | 示例 → 格式化 → 输出保留注释与序列                        | PASS |     1056 |
| 604 | yaml-formatter       | 非法输入时输出区给出错误提示                              | PASS |     1101 |
| 605 | yaml-formatter       | 从首页能通过搜索进入该工具                                | PASS |     1192 |
| 606 | yaml-to-json         | 页面标题为该工具名                                        | PASS |     1057 |
| 607 | yaml-to-json         | 示例 → 转换 → 输出 JSON                                   | PASS |     1147 |
| 608 | yaml-to-json         | 非法输入时输出区给出错误提示                              | PASS |     1145 |
| 609 | yaml-to-json         | 从首页能通过搜索进入该工具                                | PASS |     1242 |
| 610 | yaml-to-xml          | 页面标题为该工具名                                        | PASS |     1061 |
| 611 | yaml-to-xml          | 示例 → 转换 → 输出 XML 根元素                             | PASS |     1045 |
| 612 | yaml-to-xml          | 非法输入时输出区给出错误提示                              | PASS |      987 |
| 613 | yaml-to-xml          | 从首页能通过搜索进入该工具                                | PASS |     1096 |
| 614 | zero-width           | 页面标题为该工具名                                        | PASS |      950 |
| 615 | zero-width           | 示例 → 运行 → 输出包含预期内容                            | PASS |     1223 |
| 616 | zero-width           | 从首页能通过搜索进入该工具                                | PASS |     1236 |
| 617 | zh-convert           | 页面标题为该工具名                                        | PASS |     1046 |
| 618 | zh-convert           | 示例 → 运行 → 输出包含预期内容                            | PASS |     1122 |
| 619 | zh-convert           | 从首页能通过搜索进入该工具                                | PASS |     1171 |
| 620 | zhuyin               | 页面标题为该工具名                                        | PASS |     1087 |
| 621 | zhuyin               | 示例 → 运行 → 输出包含预期内容                            | PASS |     1071 |
| 622 | zhuyin               | 从首页能通过搜索进入该工具                                | PASS |     1033 |

## 证据文件

- 全量 e2e 机读结果（最终）：`tmp/s2-e2e3-results.json`（622 passed）
- 历轮结果：`tmp/s2-e2e-results.json`（601）、`tmp/s2-e2e2-results.json`（618）
- HTTP/离线探测日志：`tmp/s2-http-probe.log`
- 全量 vitest 日志：`tmp/s2-vitest-all2.log`（3260 passed）
- 构建日志：`tmp/s2-build.log`
- 临时测试设施（测试后清理，不入库）：`vite.lan.config.ts`、`playwright.lan.config.ts`、`__probe_ctx.mjs`、`__probe_http.mjs`、`__gen_lan_cert.mjs`、`tmp/lan-{key,cert}.pem`
