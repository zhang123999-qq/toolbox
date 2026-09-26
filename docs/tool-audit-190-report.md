# 前 190 个工具 · 查漏补缺审查与修复清单

> 范围：`docs/tools/01-文本与内容.md`（#1–70）、`02-编码加密安全.md`（#71–130）、`03-数据格式.md`（#131–190）。
> 方法：逐个比对工具定义（meta 的名称 / inputs / outputs / options / tags / feasibility）与 schema、utils、Tool.tsx 实现，识别「完全未实现 / 实现不完整 / 接口契约不一致」三类问题并修复；沿用现有结构、命名与已装依赖，未引入新技术栈或新 npm 依赖。

## 一、总览

| 处理结果                                            |    数量 |
| --------------------------------------------------- | ------: |
| 已补全（全新建 / 半成品补齐到可用）                 |      16 |
| 部分修复（实现补全 / 错误处理边界 / meta 契约对齐） |      28 |
| 本已完整，审查通过无需改动                          |     146 |
| **合计**                                            | **190** |

## 二、已补全工具明细（16）

|   # | 工具           | slug                 | 类型       | 具体改动                                                                                                                                                                                       |
| --: | -------------- | -------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 110 | CSR 生成       | `csr-generate`       | 全新建     | node-forge 异步生成 PKCS#10 CSR：主题 DN、SAN（DNS/IP/邮箱）、RSA 密钥位数、可选附带私钥；八件齐全，异步 transform，组件测试 30s 超时。                                                        |
| 112 | PGP 工具       | `pgp-tool`           | 全新建     | openpgp 未安装且禁加依赖，落为纯 TS「OpenPGP Armor 结构检查器」：Radix64/base64、RFC4880 CRC24、新旧 packet 头/varint、算法 OID、UID 解析；README 明确不做加解密/签名。                        |
| 128 | CORS 检测      | `cors-check`         | 全新建     | 规划为 D 级在线检测，离线化为「粘贴 CORS 响应头 → 规则分析」（Origin/凭证/通配符/Missing 判定）；feasibility A、api:false、同步 run。                                                          |
| 129 | 安全头检测     | `security-headers`   | 全新建     | 规划为 D 级，离线化为「粘贴安全响应头 → 逐项检查 + 评分 + 修复建议」（HSTS/CSP/X-Frame-Options 等）；feasibility A、api:false。                                                                |
| 130 | SSL 检测       | `ssl-check`          | 全新建     | 规划为 D 级在线抓证书，离线化为「粘贴 PEM 证书 → 体检」：有效期(>30/≤30/过期)、自签名、弱签名算法(md5/sha1)、RSA<2048、SAN 缺失；node-forge，now 可注入。                                      |
| 142 | JSON 转 Go     | `json-to-go`         | 半成品补齐 | JSON→Go struct：更早轮补核心实现，本轮补齐缺失的 README；八件齐全。                                                                                                                            |
| 149 | JSON 转 TOML   | `json-to-toml`       | 全新建     | JSON→TOML：纯 TS 发射器（表/数组/字符串转义/数值与日期），无新依赖。                                                                                                                           |
| 164 | Excel 转 JSON  | `excel-to-json-xlsx` | 全新建     | Excel/CSV/TSV/TXT → JSON：带表头对象数组或二维数组；自研最小 zip(deflate-raw)+XML 读取首个 sheet；前导零(如 007)保留字符串、空/重名表头归一；fileInput(.xlsx 等)，20MiB 上限。                 |
| 168 | SQL 转 ORM     | `sql-to-orm`         | 半成品补齐 | SQL→ORM：补齐此前缺失的 6 个文件；CREATE TABLE 用括号配平扫描（支持嵌套/注释），渲染 TS 接口/Prisma/TypeORM 等；singularize 用 endsWith 实现。                                                 |
| 169 | SQL 转 JSON    | `sql-to-json`        | 全新建     | SQL DDL → JSON Schema draft 2020-12：每表进 $defs，整数/小数/布尔/时间/UUID/JSON/BLOB 类型映射，VARCHAR 长度→maxLength，NOT NULL→required，DEFAULT→default，PK/UNIQUE/AUTOINCREMENT→x-* 注解。 |
| 170 | GraphQL 格式化 | `graphql-formatter`  | 全新建     | 纯 TS 词法级 GraphQL 美化器：逗号保留为 token、"(" 紧贴前名、冒号后粘附、顶层定义强制换行；deps:[]。                                                                                           |
| 171 | GraphQL Schema | `graphql-schema`     | 全新建     | 解析 GraphQL SDL：按花括号净值识别顶层定义，汇总 type/input/interface/enum/union/scalar/schema（含 extend）输出 Markdown。                                                                     |
| 176 | Avro 解析      | `avro-parse`         | 半成品补齐 | Avro 解析：补齐 Tool/test/Tool.test/e2e/README；record 字段节点直接作为目标类型，schema 树解析 + JSON 编解码演示。                                                                             |
| 177 | Parquet 查看   | `parquet-view`       | 全新建     | parquet-wasm 缺失，纯 TS 读尾部 PAR1 + Thrift Compact 解码 FileMetaData（版本/行数/row group/created_by/schema 树）；不读列数据；fileInput .parquet，30MiB 上限。                              |
| 184 | SQLite 查看器  | `sqlite-viewer`      | 全新建     | sql.js 缺失，纯 TS 读 SQLite 文件：magic+页头+遍历 table b-tree(0x0d/0x05)+record varint/serial type，输出 sqlite_master 的表/视图/索引/触发器及 DDL；不执行 SQL；fileInput，30MiB。           |
| 185 | ER 图          | `er-diagram`         | 全新建     | SQL DDL → Mermaid erDiagram 源码（不引 mermaid 库）：认可选 CONSTRAINT 前缀的表级外键与列级 REFERENCES，关系 parent                                                                            |     | --o{child，字段标 PK/FK，非法标识符归一。 |

## 三、部分修复工具明细（28）

|   # | 工具             | slug                | 具体改动                                                                                                                                                                                                                                                                                     |
| --: | ---------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  33 | 批量替换         | `batch-replace`     | 补空输入边界处理：空/纯空白文本提前返回，避免无意义替换与异常。                                                                                                                                                                                                                              |
|  34 | 正则替换         | `regex-replace`     | 正则错误处理：对 new RegExp 非法模式做 try/catch，抛出可读错误而非整体崩溃。                                                                                                                                                                                                                 |
|  35 | 文本 Diff        | `text-diff`         | meta 契约修正：inputs 补登 textB（对比的第二段文本）。                                                                                                                                                                                                                                       |
|  37 | 文本合并         | `text-merge`        | meta 契约修正：inputs 补登 textB、textC（三方合并输入）。                                                                                                                                                                                                                                    |
|  90 | AES 加密         | `aes-encrypt`       | meta 契约修正：inputs 补登实现中实际存在的 key、iv（原仅声明 text），与 inputSchema 对齐。                                                                                                                                                                                                   |
|  91 | DES 加密         | `des-encrypt`       | meta 契约修正：inputs 补登 key、iv。                                                                                                                                                                                                                                                         |
|  92 | RSA 加密         | `rsa-encrypt`       | meta 契约修正：inputs 补登 publicKey、privateKey、signature（加解密/验签多输入）。                                                                                                                                                                                                           |
|  93 | ECC 加密         | `ecc-encrypt`       | meta 契约修正：inputs 补登 publicKey、privateKey。                                                                                                                                                                                                                                           |
|  94 | ECDSA 签名       | `ecdsa-sign`        | meta 契约修正：inputs 补登 privateKey、publicKey、signature。                                                                                                                                                                                                                                |
|  95 | Ed25519          | `ed25519-sign`      | meta 契约修正：inputs 补登 privateKey、publicKey、signature。                                                                                                                                                                                                                                |
|  96 | HMAC             | `hmac-calc`         | meta 契约修正：inputs 补登 key（HMAC 密钥）。                                                                                                                                                                                                                                                |
|  97 | PBKDF2           | `pbkdf2-derive`     | meta 契约修正：inputs 补登 salt。                                                                                                                                                                                                                                                            |
|  98 | Bcrypt           | `bcrypt-hash`       | meta 契约修正：inputs 补登 hash（校验方向第二输入）；并按「代码事实优先」将 feasibility 由 B 改为 A（纯 JS bcryptjs，无需 WASM），同步更新头注释。                                                                                                                                           |
|  99 | Scrypt           | `scrypt-derive`     | meta 契约修正：inputs 补登 salt。                                                                                                                                                                                                                                                            |
| 100 | Argon2           | `argon2-hash`       | meta 契约修正：tags 删除多余的 wasm，收敛到 ≤5 硬契约；并修复生产构建——argon2-browser CJS 主入口静态 require 含顶层 await 的 .wasm 触发 rolldown REQUIRE_TLA，改为动态 import 自包含 dist/argon2-bundled.min.js（wasm 已 base64 内联），同步更新两处测试的 vi.mock 路径与 ambient 类型声明。 |
| 102 | JWT 生成         | `jwt-generate`      | meta 契约修正：inputs 补登 secret（签名密钥）。                                                                                                                                                                                                                                              |
| 103 | JWE 解析         | `jwe-parse`         | meta 契约修正：inputs 补登 secret（解密密钥）。                                                                                                                                                                                                                                              |
| 104 | JWS 解析         | `jws-parse`         | meta 契约修正：inputs 补登 secret。                                                                                                                                                                                                                                                          |
| 106 | HOTP 生成        | `hotp-generate`     | meta 契约修正：inputs 补登 counter（HOTP 计数器）。                                                                                                                                                                                                                                          |
| 107 | OTP 二维码       | `otp-qr`            | meta 契约修正：inputs 补登 issuer、account、counter；tags 删除 2fa 收敛到 ≤5。                                                                                                                                                                                                               |
| 108 | 密钥生成         | `key-generate`      | meta 契约修正：tags 删除多余的 ed25519，收敛到 ≤5。                                                                                                                                                                                                                                          |
| 109 | PEM 解析         | `pem-parse`         | 实现补全 + 本轮重构：完善 PEM/证书/私钥/公钥/CSR 解析与详情格式化；本轮把演示证书、属性(CN/O 等)格式化、天数差上提至 lib/x509，供 ssl-check 复用（消除跨工具 import），本工具改为再导出，保持对外 API 与 instanceof 不变。                                                                   |
| 113 | 密码强度         | `password-strength` | 实现补全：接入 zxcvbn 真正估算口令强度与多场景破解时长，并结构化输出评分/反馈/建议（此前结果未真正按真实攻击模型计算与格式化）。                                                                                                                                                             |
| 123 | BLAKE3           | `blake3-hash`       | 错误处理补全：对 BigInt 运算路径增加输入校验与 try/catch，非法输入给出可读错误而非抛崩。                                                                                                                                                                                                     |
| 126 | 校验和           | `checksum`          | meta 契约修正：tags 删除多余的 verify，收敛到 ≤5。                                                                                                                                                                                                                                           |
| 139 | JSON Schema 生成 | `json-schema-gen`   | 实现补全：从 JSON 样例反推 JSON Schema（可选 draft-07 / 2020-12），补全类型推断与结果格式化。                                                                                                                                                                                                |
| 151 | BigJSON 流式     | `big-json`          | 实现补全（受限落地）：规划依赖 Node stream + 流式 JSON parser（浏览器不可用且禁加依赖），降级为自研单遍字符扫描——规模统计、键路径抽样、首个语法错误行列定位，常数内存、遇第一个错误即停；README 注明边界。                                                                                   |
| 173 | Protobuf 编解码  | `protobuf-codec`    | 实现补全（受限落地）：解析 .proto 的 message/enum 结构（字段类型、字段号、wire type），并对手工字段值/字节串做 varint/zigzag 编解码演示；README 明确非完整 protobuf 运行时。                                                                                                                 |

## 四、逐工具处理结果（全 190）

### 域 1 · 文本与内容（#1–#70）

|   # | 工具             | slug                  | 处理结果 | 改动点                                                                         |
| --: | ---------------- | --------------------- | -------- | ------------------------------------------------------------------------------ |
|   1 | 字数统计         | `word-count`          | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|   2 | 中英文字数       | `cn-en-count`         | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|   3 | 阅读时间         | `reading-time`        | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|   4 | 可读性分析       | `readability`         | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|   5 | 词频统计         | `word-frequency`      | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|   6 | 关键词密度       | `keyword-density`     | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|   7 | 敏感词检测       | `sensitive-words`     | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|   8 | 情感分析         | `sentiment`           | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|   9 | 大小写转换       | `case-convert`        | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  10 | 命名转换         | `naming-convert`      | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  11 | 全角半角         | `fullwidth-halfwidth` | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  12 | 简繁转换         | `zh-convert`          | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  13 | 拼音转换         | `pinyin`              | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  14 | 注音转换         | `zhuyin`              | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  15 | Unicode 查询     | `unicode-lookup`      | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  16 | 转义反转义       | `escape`              | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  17 | Markdown 预览    | `markdown-preview`    | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  18 | Markdown 转 HTML | `markdown-to-html`    | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  19 | HTML 转 Markdown | `html-to-markdown`    | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  20 | 富文本转纯文本   | `rich-to-text`        | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  21 | CSV 转 TSV       | `csv-to-tsv`          | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  22 | 表格转文本       | `table-to-text`       | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  23 | 文本转表格       | `text-to-table`       | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  24 | Slug 生成        | `slug`                | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  25 | 模板变量替换     | `template`            | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  26 | Lorem 生成       | `lorem`               | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  27 | 文本乱序         | `shuffle`             | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  28 | 文本去重         | `dedupe`              | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  29 | 文本排序         | `sort`                | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  30 | 缩进转换         | `indent`              | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  31 | 行号添加         | `line-numbers`        | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  32 | 前后缀添加       | `prefix-suffix`       | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  33 | 批量替换         | `batch-replace`       | 部分修复 | 补空输入边界处理：空/纯空白文本提前返回，避免无意义替换与异常。                |
|  34 | 正则替换         | `regex-replace`       | 部分修复 | 正则错误处理：对 new RegExp 非法模式做 try/catch，抛出可读错误而非整体崩溃。   |
|  35 | 文本 Diff        | `text-diff`           | 部分修复 | meta 契约修正：inputs 补登 textB（对比的第二段文本）。                         |
|  36 | 多文件 Diff      | `multi-diff`          | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  37 | 文本合并         | `text-merge`          | 部分修复 | meta 契约修正：inputs 补登 textB、textC（三方合并输入）。                      |
|  38 | 文本分列         | `split-columns`       | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  39 | 列提取           | `extract-column`      | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  40 | 编码检测         | `charset-detect`      | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  41 | 不可见字符       | `invisible-chars`     | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  42 | 零宽字符         | `zero-width`          | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  43 | BOM 处理         | `bom`                 | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  44 | 换行符转换       | `line-ending`         | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  45 | 空白字符清理     | `whitespace`          | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  46 | 文本摘要         | `summarize`           | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  47 | 文本改写         | `rewrite`             | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  48 | 翻译             | `translate`           | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  49 | 标题生成         | `title-gen`           | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  50 | 标签生成         | `tag-gen`             | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  51 | 文本对比高亮     | `diff-highlight`      | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  52 | 文本统计图       | `text-stats`          | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  53 | 字符集查询       | `charset-lookup`      | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  54 | Emoji 查询       | `emoji`               | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  55 | 特殊符号         | `symbols`             | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  56 | 文本加密         | `text-encrypt`        | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  57 | 文本水印         | `text-watermark`      | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  58 | 文本去水印       | `text-unwatermark`    | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  59 | 重复行检测       | `duplicate-lines`     | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  60 | 空行处理         | `blank-lines`         | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  61 | 文本对齐         | `text-align`          | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  62 | 文本换行         | `text-wrap`           | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  63 | 文本截断         | `text-truncate`       | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  64 | 文本填充         | `text-pad`            | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  65 | 文本比较         | `text-compare`        | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  66 | 文本哈希         | `text-hash`           | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  67 | 文本转二维码     | `text-to-qr`          | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  68 | 文本转语音       | `tts`                 | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  69 | 语音转文本       | `stt`                 | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |
|  70 | 文本工作台       | `text-workbench`      | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动） |

### 域 2 · 编码 / 加密 / 安全（#71–#130）

|   # | 工具             | slug                 | 处理结果 | 改动点                                                                                                                                                                                                                                                                                       |
| --: | ---------------- | -------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|  71 | Base64 编解码    | `base64-encode`      | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
|  72 | Base32 编解码    | `base32`             | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
|  73 | Base58 编解码    | `base58`             | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
|  74 | Base85 编解码    | `base85-codec`       | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
|  75 | URL 编解码       | `url-codec`          | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
|  76 | HTML 实体        | `html-entity`        | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
|  77 | Unicode 转义     | `unicode-escape`     | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
|  78 | JS 转义          | `js-escape`          | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
|  79 | CSS 转义         | `css-escape`         | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
|  80 | SQL 转义         | `sql-escape`         | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
|  81 | XML 转义         | `xml-escape`         | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
|  82 | Hex 编解码       | `hex`                | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
|  83 | 二进制转换       | `binary`             | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
|  84 | 八进制转换       | `octal`              | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
|  85 | Data URL         | `data-url`           | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
|  86 | Punycode         | `punycode`           | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
|  87 | Quoted-Printable | `quoted-printable`   | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
|  88 | MIME 编码        | `mime-encode`        | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
|  89 | UUencode         | `uuencode-codec`     | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
|  90 | AES 加密         | `aes-encrypt`        | 部分修复 | meta 契约修正：inputs 补登实现中实际存在的 key、iv（原仅声明 text），与 inputSchema 对齐。                                                                                                                                                                                                   |
|  91 | DES 加密         | `des-encrypt`        | 部分修复 | meta 契约修正：inputs 补登 key、iv。                                                                                                                                                                                                                                                         |
|  92 | RSA 加密         | `rsa-encrypt`        | 部分修复 | meta 契约修正：inputs 补登 publicKey、privateKey、signature（加解密/验签多输入）。                                                                                                                                                                                                           |
|  93 | ECC 加密         | `ecc-encrypt`        | 部分修复 | meta 契约修正：inputs 补登 publicKey、privateKey。                                                                                                                                                                                                                                           |
|  94 | ECDSA 签名       | `ecdsa-sign`         | 部分修复 | meta 契约修正：inputs 补登 privateKey、publicKey、signature。                                                                                                                                                                                                                                |
|  95 | Ed25519          | `ed25519-sign`       | 部分修复 | meta 契约修正：inputs 补登 privateKey、publicKey、signature。                                                                                                                                                                                                                                |
|  96 | HMAC             | `hmac-calc`          | 部分修复 | meta 契约修正：inputs 补登 key（HMAC 密钥）。                                                                                                                                                                                                                                                |
|  97 | PBKDF2           | `pbkdf2-derive`      | 部分修复 | meta 契约修正：inputs 补登 salt。                                                                                                                                                                                                                                                            |
|  98 | Bcrypt           | `bcrypt-hash`        | 部分修复 | meta 契约修正：inputs 补登 hash（校验方向第二输入）；并按「代码事实优先」将 feasibility 由 B 改为 A（纯 JS bcryptjs，无需 WASM），同步更新头注释。                                                                                                                                           |
|  99 | Scrypt           | `scrypt-derive`      | 部分修复 | meta 契约修正：inputs 补登 salt。                                                                                                                                                                                                                                                            |
| 100 | Argon2           | `argon2-hash`        | 部分修复 | meta 契约修正：tags 删除多余的 wasm，收敛到 ≤5 硬契约；并修复生产构建——argon2-browser CJS 主入口静态 require 含顶层 await 的 .wasm 触发 rolldown REQUIRE_TLA，改为动态 import 自包含 dist/argon2-bundled.min.js（wasm 已 base64 内联），同步更新两处测试的 vi.mock 路径与 ambient 类型声明。 |
| 101 | JWT 解析         | `jwt-decode`         | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
| 102 | JWT 生成         | `jwt-generate`       | 部分修复 | meta 契约修正：inputs 补登 secret（签名密钥）。                                                                                                                                                                                                                                              |
| 103 | JWE 解析         | `jwe-parse`          | 部分修复 | meta 契约修正：inputs 补登 secret（解密密钥）。                                                                                                                                                                                                                                              |
| 104 | JWS 解析         | `jws-parse`          | 部分修复 | meta 契约修正：inputs 补登 secret。                                                                                                                                                                                                                                                          |
| 105 | TOTP 生成        | `totp-generate`      | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
| 106 | HOTP 生成        | `hotp-generate`      | 部分修复 | meta 契约修正：inputs 补登 counter（HOTP 计数器）。                                                                                                                                                                                                                                          |
| 107 | OTP 二维码       | `otp-qr`             | 部分修复 | meta 契约修正：inputs 补登 issuer、account、counter；tags 删除 2fa 收敛到 ≤5。                                                                                                                                                                                                               |
| 108 | 密钥生成         | `key-generate`       | 部分修复 | meta 契约修正：tags 删除多余的 ed25519，收敛到 ≤5。                                                                                                                                                                                                                                          |
| 109 | PEM 解析         | `pem-parse`          | 部分修复 | 实现补全 + 本轮重构：完善 PEM/证书/私钥/公钥/CSR 解析与详情格式化；本轮把演示证书、属性(CN/O 等)格式化、天数差上提至 lib/x509，供 ssl-check 复用（消除跨工具 import），本工具改为再导出，保持对外 API 与 instanceof 不变。                                                                   |
| 110 | CSR 生成         | `csr-generate`       | 已补全   | 【全新建】node-forge 异步生成 PKCS#10 CSR：主题 DN、SAN（DNS/IP/邮箱）、RSA 密钥位数、可选附带私钥；八件齐全，异步 transform，组件测试 30s 超时。                                                                                                                                            |
| 111 | SSH 密钥         | `ssh-key`            | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
| 112 | PGP 工具         | `pgp-tool`           | 已补全   | 【全新建】openpgp 未安装且禁加依赖，落为纯 TS「OpenPGP Armor 结构检查器」：Radix64/base64、RFC4880 CRC24、新旧 packet 头/varint、算法 OID、UID 解析；README 明确不做加解密/签名。                                                                                                            |
| 113 | 密码强度         | `password-strength`  | 部分修复 | 实现补全：接入 zxcvbn 真正估算口令强度与多场景破解时长，并结构化输出评分/反馈/建议（此前结果未真正按真实攻击模型计算与格式化）。                                                                                                                                                             |
| 114 | 密码生成         | `password-generator` | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
| 115 | 密码短语         | `passphrase`         | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
| 116 | 随机盐           | `random-salt`        | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
| 117 | MD5              | `md5-hash`           | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
| 118 | SHA1             | `sha1-hash`          | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
| 119 | SHA256           | `sha256-hash`        | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
| 120 | SHA3             | `sha3-hash`          | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
| 121 | CRC              | `crc-checksum`       | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
| 122 | BLAKE2           | `blake2-hash`        | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
| 123 | BLAKE3           | `blake3-hash`        | 部分修复 | 错误处理补全：对 BigInt 运算路径增加输入校验与 try/catch，非法输入给出可读错误而非抛崩。                                                                                                                                                                                                     |
| 124 | xxHash           | `xxhash-hash`        | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
| 125 | 文件哈希         | `file-hash`          | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
| 126 | 校验和           | `checksum`           | 部分修复 | meta 契约修正：tags 删除多余的 verify，收敛到 ≤5。                                                                                                                                                                                                                                           |
| 127 | CSP 生成         | `csp`                | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                                                                                                               |
| 128 | CORS 检测        | `cors-check`         | 已补全   | 【全新建】规划为 D 级在线检测，离线化为「粘贴 CORS 响应头 → 规则分析」（Origin/凭证/通配符/Missing 判定）；feasibility A、api:false、同步 run。                                                                                                                                              |
| 129 | 安全头检测       | `security-headers`   | 已补全   | 【全新建】规划为 D 级，离线化为「粘贴安全响应头 → 逐项检查 + 评分 + 修复建议」（HSTS/CSP/X-Frame-Options 等）；feasibility A、api:false。                                                                                                                                                    |
| 130 | SSL 检测         | `ssl-check`          | 已补全   | 【全新建】规划为 D 级在线抓证书，离线化为「粘贴 PEM 证书 → 体检」：有效期(>30/≤30/过期)、自签名、弱签名算法(md5/sha1)、RSA<2048、SAN 缺失；node-forge，now 可注入。                                                                                                                          |

### 域 3 · 数据格式（#131–#190）

|   # | 工具               | slug                   | 处理结果 | 改动点                                                                                                                                                                                                     |
| --: | ------------------ | ---------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 131 | JSON 格式化        | `json-formatter`       | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 132 | JSON 校验          | `json-validate`        | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 133 | JSON 压缩          | `json-minify`          | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 134 | JSON 树形查看      | `json-tree`            | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 135 | JSON 排序          | `json-sort`            | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 136 | JSON Diff          | `json-diff`            | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 137 | JSON Merge         | `json-merge`           | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 138 | JSONPath           | `jsonpath`             | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 139 | JSON Schema 生成   | `json-schema-gen`      | 部分修复 | 实现补全：从 JSON 样例反推 JSON Schema（可选 draft-07 / 2020-12），补全类型推断与结果格式化。                                                                                                              |
| 140 | JSON Schema 校验   | `json-schema-validate` | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 141 | JSON 转 TypeScript | `json-to-ts`           | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 142 | JSON 转 Go         | `json-to-go`           | 已补全   | 【半成品补齐】JSON→Go struct：更早轮补核心实现，本轮补齐缺失的 README；八件齐全。                                                                                                                          |
| 143 | JSON 转 Java       | `json-to-java`         | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 144 | JSON 转 Rust       | `json-to-rust`         | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 145 | JSON 转 Python     | `json-to-python`       | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 146 | JSON 转 CSV        | `json-to-csv`          | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 147 | JSON 转 YAML       | `json-to-yaml`         | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 148 | JSON 转 XML        | `json-to-xml`          | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 149 | JSON 转 TOML       | `json-to-toml`         | 已补全   | 【全新建】JSON→TOML：纯 TS 发射器（表/数组/字符串转义/数值与日期），无新依赖。                                                                                                                             |
| 150 | JSON Lines         | `jsonl`                | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 151 | BigJSON 流式       | `big-json`             | 部分修复 | 实现补全（受限落地）：规划依赖 Node stream + 流式 JSON parser（浏览器不可用且禁加依赖），降级为自研单遍字符扫描——规模统计、键路径抽样、首个语法错误行列定位，常数内存、遇第一个错误即停；README 注明边界。 |
| 152 | YAML 格式化        | `yaml-formatter`       | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 153 | YAML 转 JSON       | `yaml-to-json`         | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 154 | YAML 转 XML        | `yaml-to-xml`          | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 155 | TOML 解析          | `toml-parse`           | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 156 | INI 解析           | `ini-parse`            | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 157 | Properties 解析    | `properties-parse`     | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 158 | XML 格式化         | `xml-formatter`        | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 159 | XML 转 JSON        | `xml-to-json`          | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 160 | CSV 格式化         | `csv-formatter`        | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 161 | CSV 转 JSON        | `csv-to-json`          | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 162 | CSV 转 Excel       | `csv-to-excel`         | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 163 | Excel 转 CSV       | `excel-to-csv`         | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 164 | Excel 转 JSON      | `excel-to-json-xlsx`   | 已补全   | 【全新建】Excel/CSV/TSV/TXT → JSON：带表头对象数组或二维数组；自研最小 zip(deflate-raw)+XML 读取首个 sheet；前导零(如 007)保留字符串、空/重名表头归一；fileInput(.xlsx 等)，20MiB 上限。                   |
| 165 | SQL 格式化         | `sql-format`           | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 166 | SQL 压缩           | `sql-minify`           | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 167 | SQL 方言转换       | `sql-dialect`          | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 168 | SQL 转 ORM         | `sql-to-orm`           | 已补全   | 【半成品补齐】SQL→ORM：补齐此前缺失的 6 个文件；CREATE TABLE 用括号配平扫描（支持嵌套/注释），渲染 TS 接口/Prisma/TypeORM 等；singularize 用 endsWith 实现。                                               |
| 169 | SQL 转 JSON        | `sql-to-json`          | 已补全   | 【全新建】SQL DDL → JSON Schema draft 2020-12：每表进 $defs，整数/小数/布尔/时间/UUID/JSON/BLOB 类型映射，VARCHAR 长度→maxLength，NOT NULL→required，DEFAULT→default，PK/UNIQUE/AUTOINCREMENT→x-* 注解。   |
| 170 | GraphQL 格式化     | `graphql-formatter`    | 已补全   | 【全新建】纯 TS 词法级 GraphQL 美化器：逗号保留为 token、"(" 紧贴前名、冒号后粘附、顶层定义强制换行；deps:[]。                                                                                             |
| 171 | GraphQL Schema     | `graphql-schema`       | 已补全   | 【全新建】解析 GraphQL SDL：按花括号净值识别顶层定义，汇总 type/input/interface/enum/union/scalar/schema（含 extend）输出 Markdown。                                                                       |
| 172 | GraphQL 转代码     | `graphql-to-code`      | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 173 | Protobuf 编解码    | `protobuf-codec`       | 部分修复 | 实现补全（受限落地）：解析 .proto 的 message/enum 结构（字段类型、字段号、wire type），并对手工字段值/字节串做 varint/zigzag 编解码演示；README 明确非完整 protobuf 运行时。                               |
| 174 | MessagePack        | `messagepack`          | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 175 | BSON 编解码        | `bson-codec`           | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 176 | Avro 解析          | `avro-parse`           | 已补全   | 【半成品补齐】Avro 解析：补齐 Tool/test/Tool.test/e2e/README；record 字段节点直接作为目标类型，schema 树解析 + JSON 编解码演示。                                                                           |
| 177 | Parquet 查看       | `parquet-view`         | 已补全   | 【全新建】parquet-wasm 缺失，纯 TS 读尾部 PAR1 + Thrift Compact 解码 FileMetaData（版本/行数/row group/created_by/schema 树）；不读列数据；fileInput .parquet，30MiB 上限。                                |
| 178 | Query String       | `query-string`         | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 179 | Cookie 解析        | `cookie-parse`         | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 180 | HTTP Header        | `http-header-parser`   | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 181 | MIME 查询          | `mime-lookup`          | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 182 | URL 解析           | `url-parser`           | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 183 | Data URL 解析      | `data-url-parser`      | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 184 | SQLite 查看器      | `sqlite-viewer`        | 已补全   | 【全新建】sql.js 缺失，纯 TS 读 SQLite 文件：magic+页头+遍历 table b-tree(0x0d/0x05)+record varint/serial type，输出 sqlite_master 的表/视图/索引/触发器及 DDL；不执行 SQL；fileInput，30MiB。             |
| 185 | ER 图              | `er-diagram`           | 已补全   | 【全新建】SQL DDL → Mermaid erDiagram 源码（不引 mermaid 库）：认可选 CONSTRAINT 前缀的表级外键与列级 REFERENCES，关系 parent                                                                              |     | --o{child，字段标 PK/FK，非法标识符归一。 |
| 186 | Schema Diff        | `schema-diff`          | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 187 | Mock 数据          | `mock-data`            | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 188 | 数据转换工作台     | `data-workbench`       | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 189 | 编码转换           | `encoding-convert`     | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |
| 190 | 二进制查看         | `binary-viewer`        | 本已完整 | —（经审查八件齐全、meta/schema/Tool 契约一致、有错误处理与测试覆盖，无需改动）                                                                                                                             |

## 五、跨工具 / 基础设施改动（服务多个工具，不计入单工具分类）

- 新增公共层 `apps/web/src/lib/sql-ddl.ts`（Column/Table 类型、去注释、顶层切分、CREATE TABLE 解析）、`lib/x509.ts`（演示证书、属性 DN 格式化、天数差）、`lib/spreadsheet.ts`（分隔符猜测、CSV/TSV 解析、最小 zip/deflate-raw 与 xlsx XML 读取、文件入口）。
  - 据此消除 `check:source-org` 报告的 5 处 `../<tool>/utils` 跨工具 import：sql-to-orm、sql-to-json、er-diagram 改用 `lib/sql-ddl`；ssl-check、pem-parse 改用 `lib/x509`；excel-to-csv、excel-to-json-xlsx 改用 `lib/spreadsheet`。工具对外 API（含错误类 instanceof、再导出名）保持不变。
- `TwoColumn` 模板与 i18n（messages.zh.ts / en.ts）补齐新能力所需的 option 文案与文件上传入口支持；选项 label 全部走 `t('option.xxx')`，messages.zh.ts 为 key 真源。
- `pnpm generate:catalog` 重新生成 `packages/catalog/src/tools.generated.ts`，确认 190 个 slug 全部注册。
- 删除早期临时探针 `tools/__probe/` 与根目录临时文件 `pem-tmp.txt`。

## 六、离线化 / 裁剪说明（均已在各自 README 与 meta 头注释写明偏差）

受「纯前端、零新增网络/wasm 依赖」约束，以下规划为联网或重型依赖（D/B）的工具做了等价的离线化或范围裁剪，功能可在浏览器本地独立运行：

- `cors-check`(#128)、`security-headers`(#129)、`ssl-check`(#130)：由在线检测改为「粘贴响应头 / PEM 证书 → 本地规则分析」。
- `pgp-tool`(#112)：仅做 OpenPGP Armor/Packet 结构检查，不做加解密签名。
- `parquet-view`(#177)：仅读页脚 FileMetaData，不读列数据。
- `sqlite-viewer`(#184)：仅枚举 sqlite_master 及 DDL，不执行 SQL。
- `er-diagram`(#185)：产出 Mermaid 源码文本，不在站内渲染。
- `big-json`(#151)、`protobuf-codec`(#173)：分别降级为单遍扫描 / 结构解析 + 编解码演示。

## 七、验证结果（全部通过）

| 门禁 / 回归       | 命令                                   | 结果                                                 |
| ----------------- | -------------------------------------- | ---------------------------------------------------- |
| 目录/八文件完整性 | 盘点脚本（190 目录 × 8 文件）          | 190/190 齐全，0 个桩实现/待实现/TODO                 |
| 工具元数据门禁    | `pnpm check:tools`                     | 通过                                                 |
| 源码组织门禁      | `pnpm check:source-org`                | 通过，跨工具 import 违规 0                           |
| 类型检查          | `pnpm --filter @toolbox/web typecheck` | 通过（0 error）                                      |
| 全量单元/组件/E2E | `vitest run`                           | **3255 passed（565 文件）**，0 失败                  |
| 生产构建          | `pnpm build`（turbo）                  | 1/1 successful；仅 chunk >500kB 的体积告警（非错误） |
| 注册完整性        | catalog 190 条                         | 13 个新 slug 全部在册                                |

> 说明：构建期另修复了 argon2-hash 的生产打包失败（REQUIRE_TLA），改用 argon2-browser 自带的自包含 bundled 产物，详见 #100 改动点。语音类 `tts`(#68)/`stt`(#69) 基于浏览器 Web Speech API，其 utils 为运行时辅助函数（无同步文本 `transform`），属该类工具的既有形态，非漏实现；二者八件齐全、测试通过。
