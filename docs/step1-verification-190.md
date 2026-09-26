# 第 1 步 · 前 190 个工具逐项核查表

- 规划工具数：190；完成：190；未完成/缺失：0
- 判定项：八文件齐全 · meta.id 与 slug 一致 · catalog 已注册（路由 /tools/:slug）· Tool 默认导出 · T2 含 transform（语音 tts/stt 为 Web Speech API 运行时型，按实际调用判定）· 实现文件无真实 TODO/FIXME/占位（已剔除 \uXXXX、U+XXXX、手机号 X 通配、PEM 泛标签等合法记法）· 单测断言≥3 · 组件测试与 e2e 存在。

## 域1 文本与内容 #1-70

|   # | 名称             | slug                  | 状态 | 路由                       | 证据目录                               | 测试命令                                     | 问题 |
| --: | ---------------- | --------------------- | ---- | -------------------------- | -------------------------------------- | -------------------------------------------- | ---- |
|   1 | 字数统计         | `word-count`          | 完成 | /tools/word-count          | apps/web/src/tools/word-count          | npx vitest run src/tools/word-count          | —    |
|   2 | 中英文字数       | `cn-en-count`         | 完成 | /tools/cn-en-count         | apps/web/src/tools/cn-en-count         | npx vitest run src/tools/cn-en-count         | —    |
|   3 | 阅读时间         | `reading-time`        | 完成 | /tools/reading-time        | apps/web/src/tools/reading-time        | npx vitest run src/tools/reading-time        | —    |
|   4 | 可读性分析       | `readability`         | 完成 | /tools/readability         | apps/web/src/tools/readability         | npx vitest run src/tools/readability         | —    |
|   5 | 词频统计         | `word-frequency`      | 完成 | /tools/word-frequency      | apps/web/src/tools/word-frequency      | npx vitest run src/tools/word-frequency      | —    |
|   6 | 关键词密度       | `keyword-density`     | 完成 | /tools/keyword-density     | apps/web/src/tools/keyword-density     | npx vitest run src/tools/keyword-density     | —    |
|   7 | 敏感词检测       | `sensitive-words`     | 完成 | /tools/sensitive-words     | apps/web/src/tools/sensitive-words     | npx vitest run src/tools/sensitive-words     | —    |
|   8 | 情感分析         | `sentiment`           | 完成 | /tools/sentiment           | apps/web/src/tools/sentiment           | npx vitest run src/tools/sentiment           | —    |
|   9 | 大小写转换       | `case-convert`        | 完成 | /tools/case-convert        | apps/web/src/tools/case-convert        | npx vitest run src/tools/case-convert        | —    |
|  10 | 命名转换         | `naming-convert`      | 完成 | /tools/naming-convert      | apps/web/src/tools/naming-convert      | npx vitest run src/tools/naming-convert      | —    |
|  11 | 全角半角         | `fullwidth-halfwidth` | 完成 | /tools/fullwidth-halfwidth | apps/web/src/tools/fullwidth-halfwidth | npx vitest run src/tools/fullwidth-halfwidth | —    |
|  12 | 简繁转换         | `zh-convert`          | 完成 | /tools/zh-convert          | apps/web/src/tools/zh-convert          | npx vitest run src/tools/zh-convert          | —    |
|  13 | 拼音转换         | `pinyin`              | 完成 | /tools/pinyin              | apps/web/src/tools/pinyin              | npx vitest run src/tools/pinyin              | —    |
|  14 | 注音转换         | `zhuyin`              | 完成 | /tools/zhuyin              | apps/web/src/tools/zhuyin              | npx vitest run src/tools/zhuyin              | —    |
|  15 | Unicode 查询     | `unicode-lookup`      | 完成 | /tools/unicode-lookup      | apps/web/src/tools/unicode-lookup      | npx vitest run src/tools/unicode-lookup      | —    |
|  16 | 转义反转义       | `escape`              | 完成 | /tools/escape              | apps/web/src/tools/escape              | npx vitest run src/tools/escape              | —    |
|  17 | Markdown 预览    | `markdown-preview`    | 完成 | /tools/markdown-preview    | apps/web/src/tools/markdown-preview    | npx vitest run src/tools/markdown-preview    | —    |
|  18 | Markdown 转 HTML | `markdown-to-html`    | 完成 | /tools/markdown-to-html    | apps/web/src/tools/markdown-to-html    | npx vitest run src/tools/markdown-to-html    | —    |
|  19 | HTML 转 Markdown | `html-to-markdown`    | 完成 | /tools/html-to-markdown    | apps/web/src/tools/html-to-markdown    | npx vitest run src/tools/html-to-markdown    | —    |
|  20 | 富文本转纯文本   | `rich-to-text`        | 完成 | /tools/rich-to-text        | apps/web/src/tools/rich-to-text        | npx vitest run src/tools/rich-to-text        | —    |
|  21 | CSV 转 TSV       | `csv-to-tsv`          | 完成 | /tools/csv-to-tsv          | apps/web/src/tools/csv-to-tsv          | npx vitest run src/tools/csv-to-tsv          | —    |
|  22 | 表格转文本       | `table-to-text`       | 完成 | /tools/table-to-text       | apps/web/src/tools/table-to-text       | npx vitest run src/tools/table-to-text       | —    |
|  23 | 文本转表格       | `text-to-table`       | 完成 | /tools/text-to-table       | apps/web/src/tools/text-to-table       | npx vitest run src/tools/text-to-table       | —    |
|  24 | Slug 生成        | `slug`                | 完成 | /tools/slug                | apps/web/src/tools/slug                | npx vitest run src/tools/slug                | —    |
|  25 | 模板变量替换     | `template`            | 完成 | /tools/template            | apps/web/src/tools/template            | npx vitest run src/tools/template            | —    |
|  26 | Lorem 生成       | `lorem`               | 完成 | /tools/lorem               | apps/web/src/tools/lorem               | npx vitest run src/tools/lorem               | —    |
|  27 | 文本乱序         | `shuffle`             | 完成 | /tools/shuffle             | apps/web/src/tools/shuffle             | npx vitest run src/tools/shuffle             | —    |
|  28 | 文本去重         | `dedupe`              | 完成 | /tools/dedupe              | apps/web/src/tools/dedupe              | npx vitest run src/tools/dedupe              | —    |
|  29 | 文本排序         | `sort`                | 完成 | /tools/sort                | apps/web/src/tools/sort                | npx vitest run src/tools/sort                | —    |
|  30 | 缩进转换         | `indent`              | 完成 | /tools/indent              | apps/web/src/tools/indent              | npx vitest run src/tools/indent              | —    |
|  31 | 行号添加         | `line-numbers`        | 完成 | /tools/line-numbers        | apps/web/src/tools/line-numbers        | npx vitest run src/tools/line-numbers        | —    |
|  32 | 前后缀添加       | `prefix-suffix`       | 完成 | /tools/prefix-suffix       | apps/web/src/tools/prefix-suffix       | npx vitest run src/tools/prefix-suffix       | —    |
|  33 | 批量替换         | `batch-replace`       | 完成 | /tools/batch-replace       | apps/web/src/tools/batch-replace       | npx vitest run src/tools/batch-replace       | —    |
|  34 | 正则替换         | `regex-replace`       | 完成 | /tools/regex-replace       | apps/web/src/tools/regex-replace       | npx vitest run src/tools/regex-replace       | —    |
|  35 | 文本 Diff        | `text-diff`           | 完成 | /tools/text-diff           | apps/web/src/tools/text-diff           | npx vitest run src/tools/text-diff           | —    |
|  36 | 多文件 Diff      | `multi-diff`          | 完成 | /tools/multi-diff          | apps/web/src/tools/multi-diff          | npx vitest run src/tools/multi-diff          | —    |
|  37 | 文本合并         | `text-merge`          | 完成 | /tools/text-merge          | apps/web/src/tools/text-merge          | npx vitest run src/tools/text-merge          | —    |
|  38 | 文本分列         | `split-columns`       | 完成 | /tools/split-columns       | apps/web/src/tools/split-columns       | npx vitest run src/tools/split-columns       | —    |
|  39 | 列提取           | `extract-column`      | 完成 | /tools/extract-column      | apps/web/src/tools/extract-column      | npx vitest run src/tools/extract-column      | —    |
|  40 | 编码检测         | `charset-detect`      | 完成 | /tools/charset-detect      | apps/web/src/tools/charset-detect      | npx vitest run src/tools/charset-detect      | —    |
|  41 | 不可见字符       | `invisible-chars`     | 完成 | /tools/invisible-chars     | apps/web/src/tools/invisible-chars     | npx vitest run src/tools/invisible-chars     | —    |
|  42 | 零宽字符         | `zero-width`          | 完成 | /tools/zero-width          | apps/web/src/tools/zero-width          | npx vitest run src/tools/zero-width          | —    |
|  43 | BOM 处理         | `bom`                 | 完成 | /tools/bom                 | apps/web/src/tools/bom                 | npx vitest run src/tools/bom                 | —    |
|  44 | 换行符转换       | `line-ending`         | 完成 | /tools/line-ending         | apps/web/src/tools/line-ending         | npx vitest run src/tools/line-ending         | —    |
|  45 | 空白字符清理     | `whitespace`          | 完成 | /tools/whitespace          | apps/web/src/tools/whitespace          | npx vitest run src/tools/whitespace          | —    |
|  46 | 文本摘要         | `summarize`           | 完成 | /tools/summarize           | apps/web/src/tools/summarize           | npx vitest run src/tools/summarize           | —    |
|  47 | 文本改写         | `rewrite`             | 完成 | /tools/rewrite             | apps/web/src/tools/rewrite             | npx vitest run src/tools/rewrite             | —    |
|  48 | 翻译             | `translate`           | 完成 | /tools/translate           | apps/web/src/tools/translate           | npx vitest run src/tools/translate           | —    |
|  49 | 标题生成         | `title-gen`           | 完成 | /tools/title-gen           | apps/web/src/tools/title-gen           | npx vitest run src/tools/title-gen           | —    |
|  50 | 标签生成         | `tag-gen`             | 完成 | /tools/tag-gen             | apps/web/src/tools/tag-gen             | npx vitest run src/tools/tag-gen             | —    |
|  51 | 文本对比高亮     | `diff-highlight`      | 完成 | /tools/diff-highlight      | apps/web/src/tools/diff-highlight      | npx vitest run src/tools/diff-highlight      | —    |
|  52 | 文本统计图       | `text-stats`          | 完成 | /tools/text-stats          | apps/web/src/tools/text-stats          | npx vitest run src/tools/text-stats          | —    |
|  53 | 字符集查询       | `charset-lookup`      | 完成 | /tools/charset-lookup      | apps/web/src/tools/charset-lookup      | npx vitest run src/tools/charset-lookup      | —    |
|  54 | Emoji 查询       | `emoji`               | 完成 | /tools/emoji               | apps/web/src/tools/emoji               | npx vitest run src/tools/emoji               | —    |
|  55 | 特殊符号         | `symbols`             | 完成 | /tools/symbols             | apps/web/src/tools/symbols             | npx vitest run src/tools/symbols             | —    |
|  56 | 文本加密         | `text-encrypt`        | 完成 | /tools/text-encrypt        | apps/web/src/tools/text-encrypt        | npx vitest run src/tools/text-encrypt        | —    |
|  57 | 文本水印         | `text-watermark`      | 完成 | /tools/text-watermark      | apps/web/src/tools/text-watermark      | npx vitest run src/tools/text-watermark      | —    |
|  58 | 文本去水印       | `text-unwatermark`    | 完成 | /tools/text-unwatermark    | apps/web/src/tools/text-unwatermark    | npx vitest run src/tools/text-unwatermark    | —    |
|  59 | 重复行检测       | `duplicate-lines`     | 完成 | /tools/duplicate-lines     | apps/web/src/tools/duplicate-lines     | npx vitest run src/tools/duplicate-lines     | —    |
|  60 | 空行处理         | `blank-lines`         | 完成 | /tools/blank-lines         | apps/web/src/tools/blank-lines         | npx vitest run src/tools/blank-lines         | —    |
|  61 | 文本对齐         | `text-align`          | 完成 | /tools/text-align          | apps/web/src/tools/text-align          | npx vitest run src/tools/text-align          | —    |
|  62 | 文本换行         | `text-wrap`           | 完成 | /tools/text-wrap           | apps/web/src/tools/text-wrap           | npx vitest run src/tools/text-wrap           | —    |
|  63 | 文本截断         | `text-truncate`       | 完成 | /tools/text-truncate       | apps/web/src/tools/text-truncate       | npx vitest run src/tools/text-truncate       | —    |
|  64 | 文本填充         | `text-pad`            | 完成 | /tools/text-pad            | apps/web/src/tools/text-pad            | npx vitest run src/tools/text-pad            | —    |
|  65 | 文本比较         | `text-compare`        | 完成 | /tools/text-compare        | apps/web/src/tools/text-compare        | npx vitest run src/tools/text-compare        | —    |
|  66 | 文本哈希         | `text-hash`           | 完成 | /tools/text-hash           | apps/web/src/tools/text-hash           | npx vitest run src/tools/text-hash           | —    |
|  67 | 文本转二维码     | `text-to-qr`          | 完成 | /tools/text-to-qr          | apps/web/src/tools/text-to-qr          | npx vitest run src/tools/text-to-qr          | —    |
|  68 | 文本转语音       | `tts`                 | 完成 | /tools/tts                 | apps/web/src/tools/tts                 | npx vitest run src/tools/tts                 | —    |
|  69 | 语音转文本       | `stt`                 | 完成 | /tools/stt                 | apps/web/src/tools/stt                 | npx vitest run src/tools/stt                 | —    |
|  70 | 文本工作台       | `text-workbench`      | 完成 | /tools/text-workbench      | apps/web/src/tools/text-workbench      | npx vitest run src/tools/text-workbench      | —    |

## 域2 编码加密安全 #71-130

|   # | 名称             | slug                 | 状态 | 路由                      | 证据目录                              | 测试命令                                    | 问题 |
| --: | ---------------- | -------------------- | ---- | ------------------------- | ------------------------------------- | ------------------------------------------- | ---- |
|  71 | Base64 编解码    | `base64-encode`      | 完成 | /tools/base64-encode      | apps/web/src/tools/base64-encode      | npx vitest run src/tools/base64-encode      | —    |
|  72 | Base32 编解码    | `base32`             | 完成 | /tools/base32             | apps/web/src/tools/base32             | npx vitest run src/tools/base32             | —    |
|  73 | Base58 编解码    | `base58`             | 完成 | /tools/base58             | apps/web/src/tools/base58             | npx vitest run src/tools/base58             | —    |
|  74 | Base85 编解码    | `base85-codec`       | 完成 | /tools/base85-codec       | apps/web/src/tools/base85-codec       | npx vitest run src/tools/base85-codec       | —    |
|  75 | URL 编解码       | `url-codec`          | 完成 | /tools/url-codec          | apps/web/src/tools/url-codec          | npx vitest run src/tools/url-codec          | —    |
|  76 | HTML 实体        | `html-entity`        | 完成 | /tools/html-entity        | apps/web/src/tools/html-entity        | npx vitest run src/tools/html-entity        | —    |
|  77 | Unicode 转义     | `unicode-escape`     | 完成 | /tools/unicode-escape     | apps/web/src/tools/unicode-escape     | npx vitest run src/tools/unicode-escape     | —    |
|  78 | JS 转义          | `js-escape`          | 完成 | /tools/js-escape          | apps/web/src/tools/js-escape          | npx vitest run src/tools/js-escape          | —    |
|  79 | CSS 转义         | `css-escape`         | 完成 | /tools/css-escape         | apps/web/src/tools/css-escape         | npx vitest run src/tools/css-escape         | —    |
|  80 | SQL 转义         | `sql-escape`         | 完成 | /tools/sql-escape         | apps/web/src/tools/sql-escape         | npx vitest run src/tools/sql-escape         | —    |
|  81 | XML 转义         | `xml-escape`         | 完成 | /tools/xml-escape         | apps/web/src/tools/xml-escape         | npx vitest run src/tools/xml-escape         | —    |
|  82 | Hex 编解码       | `hex`                | 完成 | /tools/hex                | apps/web/src/tools/hex                | npx vitest run src/tools/hex                | —    |
|  83 | 二进制转换       | `binary`             | 完成 | /tools/binary             | apps/web/src/tools/binary             | npx vitest run src/tools/binary             | —    |
|  84 | 八进制转换       | `octal`              | 完成 | /tools/octal              | apps/web/src/tools/octal              | npx vitest run src/tools/octal              | —    |
|  85 | Data URL         | `data-url`           | 完成 | /tools/data-url           | apps/web/src/tools/data-url           | npx vitest run src/tools/data-url           | —    |
|  86 | Punycode         | `punycode`           | 完成 | /tools/punycode           | apps/web/src/tools/punycode           | npx vitest run src/tools/punycode           | —    |
|  87 | Quoted-Printable | `quoted-printable`   | 完成 | /tools/quoted-printable   | apps/web/src/tools/quoted-printable   | npx vitest run src/tools/quoted-printable   | —    |
|  88 | MIME 编码        | `mime-encode`        | 完成 | /tools/mime-encode        | apps/web/src/tools/mime-encode        | npx vitest run src/tools/mime-encode        | —    |
|  89 | UUencode         | `uuencode-codec`     | 完成 | /tools/uuencode-codec     | apps/web/src/tools/uuencode-codec     | npx vitest run src/tools/uuencode-codec     | —    |
|  90 | AES 加密         | `aes-encrypt`        | 完成 | /tools/aes-encrypt        | apps/web/src/tools/aes-encrypt        | npx vitest run src/tools/aes-encrypt        | —    |
|  91 | DES 加密         | `des-encrypt`        | 完成 | /tools/des-encrypt        | apps/web/src/tools/des-encrypt        | npx vitest run src/tools/des-encrypt        | —    |
|  92 | RSA 加密         | `rsa-encrypt`        | 完成 | /tools/rsa-encrypt        | apps/web/src/tools/rsa-encrypt        | npx vitest run src/tools/rsa-encrypt        | —    |
|  93 | ECC 加密         | `ecc-encrypt`        | 完成 | /tools/ecc-encrypt        | apps/web/src/tools/ecc-encrypt        | npx vitest run src/tools/ecc-encrypt        | —    |
|  94 | ECDSA 签名       | `ecdsa-sign`         | 完成 | /tools/ecdsa-sign         | apps/web/src/tools/ecdsa-sign         | npx vitest run src/tools/ecdsa-sign         | —    |
|  95 | Ed25519          | `ed25519-sign`       | 完成 | /tools/ed25519-sign       | apps/web/src/tools/ed25519-sign       | npx vitest run src/tools/ed25519-sign       | —    |
|  96 | HMAC             | `hmac-calc`          | 完成 | /tools/hmac-calc          | apps/web/src/tools/hmac-calc          | npx vitest run src/tools/hmac-calc          | —    |
|  97 | PBKDF2           | `pbkdf2-derive`      | 完成 | /tools/pbkdf2-derive      | apps/web/src/tools/pbkdf2-derive      | npx vitest run src/tools/pbkdf2-derive      | —    |
|  98 | Bcrypt           | `bcrypt-hash`        | 完成 | /tools/bcrypt-hash        | apps/web/src/tools/bcrypt-hash        | npx vitest run src/tools/bcrypt-hash        | —    |
|  99 | Scrypt           | `scrypt-derive`      | 完成 | /tools/scrypt-derive      | apps/web/src/tools/scrypt-derive      | npx vitest run src/tools/scrypt-derive      | —    |
| 100 | Argon2           | `argon2-hash`        | 完成 | /tools/argon2-hash        | apps/web/src/tools/argon2-hash        | npx vitest run src/tools/argon2-hash        | —    |
| 101 | JWT 解析         | `jwt-decode`         | 完成 | /tools/jwt-decode         | apps/web/src/tools/jwt-decode         | npx vitest run src/tools/jwt-decode         | —    |
| 102 | JWT 生成         | `jwt-generate`       | 完成 | /tools/jwt-generate       | apps/web/src/tools/jwt-generate       | npx vitest run src/tools/jwt-generate       | —    |
| 103 | JWE 解析         | `jwe-parse`          | 完成 | /tools/jwe-parse          | apps/web/src/tools/jwe-parse          | npx vitest run src/tools/jwe-parse          | —    |
| 104 | JWS 解析         | `jws-parse`          | 完成 | /tools/jws-parse          | apps/web/src/tools/jws-parse          | npx vitest run src/tools/jws-parse          | —    |
| 105 | TOTP 生成        | `totp-generate`      | 完成 | /tools/totp-generate      | apps/web/src/tools/totp-generate      | npx vitest run src/tools/totp-generate      | —    |
| 106 | HOTP 生成        | `hotp-generate`      | 完成 | /tools/hotp-generate      | apps/web/src/tools/hotp-generate      | npx vitest run src/tools/hotp-generate      | —    |
| 107 | OTP 二维码       | `otp-qr`             | 完成 | /tools/otp-qr             | apps/web/src/tools/otp-qr             | npx vitest run src/tools/otp-qr             | —    |
| 108 | 密钥生成         | `key-generate`       | 完成 | /tools/key-generate       | apps/web/src/tools/key-generate       | npx vitest run src/tools/key-generate       | —    |
| 109 | PEM 解析         | `pem-parse`          | 完成 | /tools/pem-parse          | apps/web/src/tools/pem-parse          | npx vitest run src/tools/pem-parse          | —    |
| 110 | CSR 生成         | `csr-generate`       | 完成 | /tools/csr-generate       | apps/web/src/tools/csr-generate       | npx vitest run src/tools/csr-generate       | —    |
| 111 | SSH 密钥         | `ssh-key`            | 完成 | /tools/ssh-key            | apps/web/src/tools/ssh-key            | npx vitest run src/tools/ssh-key            | —    |
| 112 | PGP 工具         | `pgp-tool`           | 完成 | /tools/pgp-tool           | apps/web/src/tools/pgp-tool           | npx vitest run src/tools/pgp-tool           | —    |
| 113 | 密码强度         | `password-strength`  | 完成 | /tools/password-strength  | apps/web/src/tools/password-strength  | npx vitest run src/tools/password-strength  | —    |
| 114 | 密码生成         | `password-generator` | 完成 | /tools/password-generator | apps/web/src/tools/password-generator | npx vitest run src/tools/password-generator | —    |
| 115 | 密码短语         | `passphrase`         | 完成 | /tools/passphrase         | apps/web/src/tools/passphrase         | npx vitest run src/tools/passphrase         | —    |
| 116 | 随机盐           | `random-salt`        | 完成 | /tools/random-salt        | apps/web/src/tools/random-salt        | npx vitest run src/tools/random-salt        | —    |
| 117 | MD5              | `md5-hash`           | 完成 | /tools/md5-hash           | apps/web/src/tools/md5-hash           | npx vitest run src/tools/md5-hash           | —    |
| 118 | SHA1             | `sha1-hash`          | 完成 | /tools/sha1-hash          | apps/web/src/tools/sha1-hash          | npx vitest run src/tools/sha1-hash          | —    |
| 119 | SHA256           | `sha256-hash`        | 完成 | /tools/sha256-hash        | apps/web/src/tools/sha256-hash        | npx vitest run src/tools/sha256-hash        | —    |
| 120 | SHA3             | `sha3-hash`          | 完成 | /tools/sha3-hash          | apps/web/src/tools/sha3-hash          | npx vitest run src/tools/sha3-hash          | —    |
| 121 | CRC              | `crc-checksum`       | 完成 | /tools/crc-checksum       | apps/web/src/tools/crc-checksum       | npx vitest run src/tools/crc-checksum       | —    |
| 122 | BLAKE2           | `blake2-hash`        | 完成 | /tools/blake2-hash        | apps/web/src/tools/blake2-hash        | npx vitest run src/tools/blake2-hash        | —    |
| 123 | BLAKE3           | `blake3-hash`        | 完成 | /tools/blake3-hash        | apps/web/src/tools/blake3-hash        | npx vitest run src/tools/blake3-hash        | —    |
| 124 | xxHash           | `xxhash-hash`        | 完成 | /tools/xxhash-hash        | apps/web/src/tools/xxhash-hash        | npx vitest run src/tools/xxhash-hash        | —    |
| 125 | 文件哈希         | `file-hash`          | 完成 | /tools/file-hash          | apps/web/src/tools/file-hash          | npx vitest run src/tools/file-hash          | —    |
| 126 | 校验和           | `checksum`           | 完成 | /tools/checksum           | apps/web/src/tools/checksum           | npx vitest run src/tools/checksum           | —    |
| 127 | CSP 生成         | `csp`                | 完成 | /tools/csp                | apps/web/src/tools/csp                | npx vitest run src/tools/csp                | —    |
| 128 | CORS 检测        | `cors-check`         | 完成 | /tools/cors-check         | apps/web/src/tools/cors-check         | npx vitest run src/tools/cors-check         | —    |
| 129 | 安全头检测       | `security-headers`   | 完成 | /tools/security-headers   | apps/web/src/tools/security-headers   | npx vitest run src/tools/security-headers   | —    |
| 130 | SSL 检测         | `ssl-check`          | 完成 | /tools/ssl-check          | apps/web/src/tools/ssl-check          | npx vitest run src/tools/ssl-check          | —    |

## 域3 数据格式 #131-190

|   # | 名称               | slug                   | 状态 | 路由                        | 证据目录                                | 测试命令                                      | 问题 |
| --: | ------------------ | ---------------------- | ---- | --------------------------- | --------------------------------------- | --------------------------------------------- | ---- |
| 131 | JSON 格式化        | `json-formatter`       | 完成 | /tools/json-formatter       | apps/web/src/tools/json-formatter       | npx vitest run src/tools/json-formatter       | —    |
| 132 | JSON 校验          | `json-validate`        | 完成 | /tools/json-validate        | apps/web/src/tools/json-validate        | npx vitest run src/tools/json-validate        | —    |
| 133 | JSON 压缩          | `json-minify`          | 完成 | /tools/json-minify          | apps/web/src/tools/json-minify          | npx vitest run src/tools/json-minify          | —    |
| 134 | JSON 树形查看      | `json-tree`            | 完成 | /tools/json-tree            | apps/web/src/tools/json-tree            | npx vitest run src/tools/json-tree            | —    |
| 135 | JSON 排序          | `json-sort`            | 完成 | /tools/json-sort            | apps/web/src/tools/json-sort            | npx vitest run src/tools/json-sort            | —    |
| 136 | JSON Diff          | `json-diff`            | 完成 | /tools/json-diff            | apps/web/src/tools/json-diff            | npx vitest run src/tools/json-diff            | —    |
| 137 | JSON Merge         | `json-merge`           | 完成 | /tools/json-merge           | apps/web/src/tools/json-merge           | npx vitest run src/tools/json-merge           | —    |
| 138 | JSONPath           | `jsonpath`             | 完成 | /tools/jsonpath             | apps/web/src/tools/jsonpath             | npx vitest run src/tools/jsonpath             | —    |
| 139 | JSON Schema 生成   | `json-schema-gen`      | 完成 | /tools/json-schema-gen      | apps/web/src/tools/json-schema-gen      | npx vitest run src/tools/json-schema-gen      | —    |
| 140 | JSON Schema 校验   | `json-schema-validate` | 完成 | /tools/json-schema-validate | apps/web/src/tools/json-schema-validate | npx vitest run src/tools/json-schema-validate | —    |
| 141 | JSON 转 TypeScript | `json-to-ts`           | 完成 | /tools/json-to-ts           | apps/web/src/tools/json-to-ts           | npx vitest run src/tools/json-to-ts           | —    |
| 142 | JSON 转 Go         | `json-to-go`           | 完成 | /tools/json-to-go           | apps/web/src/tools/json-to-go           | npx vitest run src/tools/json-to-go           | —    |
| 143 | JSON 转 Java       | `json-to-java`         | 完成 | /tools/json-to-java         | apps/web/src/tools/json-to-java         | npx vitest run src/tools/json-to-java         | —    |
| 144 | JSON 转 Rust       | `json-to-rust`         | 完成 | /tools/json-to-rust         | apps/web/src/tools/json-to-rust         | npx vitest run src/tools/json-to-rust         | —    |
| 145 | JSON 转 Python     | `json-to-python`       | 完成 | /tools/json-to-python       | apps/web/src/tools/json-to-python       | npx vitest run src/tools/json-to-python       | —    |
| 146 | JSON 转 CSV        | `json-to-csv`          | 完成 | /tools/json-to-csv          | apps/web/src/tools/json-to-csv          | npx vitest run src/tools/json-to-csv          | —    |
| 147 | JSON 转 YAML       | `json-to-yaml`         | 完成 | /tools/json-to-yaml         | apps/web/src/tools/json-to-yaml         | npx vitest run src/tools/json-to-yaml         | —    |
| 148 | JSON 转 XML        | `json-to-xml`          | 完成 | /tools/json-to-xml          | apps/web/src/tools/json-to-xml          | npx vitest run src/tools/json-to-xml          | —    |
| 149 | JSON 转 TOML       | `json-to-toml`         | 完成 | /tools/json-to-toml         | apps/web/src/tools/json-to-toml         | npx vitest run src/tools/json-to-toml         | —    |
| 150 | JSON Lines         | `jsonl`                | 完成 | /tools/jsonl                | apps/web/src/tools/jsonl                | npx vitest run src/tools/jsonl                | —    |
| 151 | BigJSON 流式       | `big-json`             | 完成 | /tools/big-json             | apps/web/src/tools/big-json             | npx vitest run src/tools/big-json             | —    |
| 152 | YAML 格式化        | `yaml-formatter`       | 完成 | /tools/yaml-formatter       | apps/web/src/tools/yaml-formatter       | npx vitest run src/tools/yaml-formatter       | —    |
| 153 | YAML 转 JSON       | `yaml-to-json`         | 完成 | /tools/yaml-to-json         | apps/web/src/tools/yaml-to-json         | npx vitest run src/tools/yaml-to-json         | —    |
| 154 | YAML 转 XML        | `yaml-to-xml`          | 完成 | /tools/yaml-to-xml          | apps/web/src/tools/yaml-to-xml          | npx vitest run src/tools/yaml-to-xml          | —    |
| 155 | TOML 解析          | `toml-parse`           | 完成 | /tools/toml-parse           | apps/web/src/tools/toml-parse           | npx vitest run src/tools/toml-parse           | —    |
| 156 | INI 解析           | `ini-parse`            | 完成 | /tools/ini-parse            | apps/web/src/tools/ini-parse            | npx vitest run src/tools/ini-parse            | —    |
| 157 | Properties 解析    | `properties-parse`     | 完成 | /tools/properties-parse     | apps/web/src/tools/properties-parse     | npx vitest run src/tools/properties-parse     | —    |
| 158 | XML 格式化         | `xml-formatter`        | 完成 | /tools/xml-formatter        | apps/web/src/tools/xml-formatter        | npx vitest run src/tools/xml-formatter        | —    |
| 159 | XML 转 JSON        | `xml-to-json`          | 完成 | /tools/xml-to-json          | apps/web/src/tools/xml-to-json          | npx vitest run src/tools/xml-to-json          | —    |
| 160 | CSV 格式化         | `csv-formatter`        | 完成 | /tools/csv-formatter        | apps/web/src/tools/csv-formatter        | npx vitest run src/tools/csv-formatter        | —    |
| 161 | CSV 转 JSON        | `csv-to-json`          | 完成 | /tools/csv-to-json          | apps/web/src/tools/csv-to-json          | npx vitest run src/tools/csv-to-json          | —    |
| 162 | CSV 转 Excel       | `csv-to-excel`         | 完成 | /tools/csv-to-excel         | apps/web/src/tools/csv-to-excel         | npx vitest run src/tools/csv-to-excel         | —    |
| 163 | Excel 转 CSV       | `excel-to-csv`         | 完成 | /tools/excel-to-csv         | apps/web/src/tools/excel-to-csv         | npx vitest run src/tools/excel-to-csv         | —    |
| 164 | Excel 转 JSON      | `excel-to-json-xlsx`   | 完成 | /tools/excel-to-json-xlsx   | apps/web/src/tools/excel-to-json-xlsx   | npx vitest run src/tools/excel-to-json-xlsx   | —    |
| 165 | SQL 格式化         | `sql-format`           | 完成 | /tools/sql-format           | apps/web/src/tools/sql-format           | npx vitest run src/tools/sql-format           | —    |
| 166 | SQL 压缩           | `sql-minify`           | 完成 | /tools/sql-minify           | apps/web/src/tools/sql-minify           | npx vitest run src/tools/sql-minify           | —    |
| 167 | SQL 方言转换       | `sql-dialect`          | 完成 | /tools/sql-dialect          | apps/web/src/tools/sql-dialect          | npx vitest run src/tools/sql-dialect          | —    |
| 168 | SQL 转 ORM         | `sql-to-orm`           | 完成 | /tools/sql-to-orm           | apps/web/src/tools/sql-to-orm           | npx vitest run src/tools/sql-to-orm           | —    |
| 169 | SQL 转 JSON        | `sql-to-json`          | 完成 | /tools/sql-to-json          | apps/web/src/tools/sql-to-json          | npx vitest run src/tools/sql-to-json          | —    |
| 170 | GraphQL 格式化     | `graphql-formatter`    | 完成 | /tools/graphql-formatter    | apps/web/src/tools/graphql-formatter    | npx vitest run src/tools/graphql-formatter    | —    |
| 171 | GraphQL Schema     | `graphql-schema`       | 完成 | /tools/graphql-schema       | apps/web/src/tools/graphql-schema       | npx vitest run src/tools/graphql-schema       | —    |
| 172 | GraphQL 转代码     | `graphql-to-code`      | 完成 | /tools/graphql-to-code      | apps/web/src/tools/graphql-to-code      | npx vitest run src/tools/graphql-to-code      | —    |
| 173 | Protobuf 编解码    | `protobuf-codec`       | 完成 | /tools/protobuf-codec       | apps/web/src/tools/protobuf-codec       | npx vitest run src/tools/protobuf-codec       | —    |
| 174 | MessagePack        | `messagepack`          | 完成 | /tools/messagepack          | apps/web/src/tools/messagepack          | npx vitest run src/tools/messagepack          | —    |
| 175 | BSON 编解码        | `bson-codec`           | 完成 | /tools/bson-codec           | apps/web/src/tools/bson-codec           | npx vitest run src/tools/bson-codec           | —    |
| 176 | Avro 解析          | `avro-parse`           | 完成 | /tools/avro-parse           | apps/web/src/tools/avro-parse           | npx vitest run src/tools/avro-parse           | —    |
| 177 | Parquet 查看       | `parquet-view`         | 完成 | /tools/parquet-view         | apps/web/src/tools/parquet-view         | npx vitest run src/tools/parquet-view         | —    |
| 178 | Query String       | `query-string`         | 完成 | /tools/query-string         | apps/web/src/tools/query-string         | npx vitest run src/tools/query-string         | —    |
| 179 | Cookie 解析        | `cookie-parse`         | 完成 | /tools/cookie-parse         | apps/web/src/tools/cookie-parse         | npx vitest run src/tools/cookie-parse         | —    |
| 180 | HTTP Header        | `http-header-parser`   | 完成 | /tools/http-header-parser   | apps/web/src/tools/http-header-parser   | npx vitest run src/tools/http-header-parser   | —    |
| 181 | MIME 查询          | `mime-lookup`          | 完成 | /tools/mime-lookup          | apps/web/src/tools/mime-lookup          | npx vitest run src/tools/mime-lookup          | —    |
| 182 | URL 解析           | `url-parser`           | 完成 | /tools/url-parser           | apps/web/src/tools/url-parser           | npx vitest run src/tools/url-parser           | —    |
| 183 | Data URL 解析      | `data-url-parser`      | 完成 | /tools/data-url-parser      | apps/web/src/tools/data-url-parser      | npx vitest run src/tools/data-url-parser      | —    |
| 184 | SQLite 查看器      | `sqlite-viewer`        | 完成 | /tools/sqlite-viewer        | apps/web/src/tools/sqlite-viewer        | npx vitest run src/tools/sqlite-viewer        | —    |
| 185 | ER 图              | `er-diagram`           | 完成 | /tools/er-diagram           | apps/web/src/tools/er-diagram           | npx vitest run src/tools/er-diagram           | —    |
| 186 | Schema Diff        | `schema-diff`          | 完成 | /tools/schema-diff          | apps/web/src/tools/schema-diff          | npx vitest run src/tools/schema-diff          | —    |
| 187 | Mock 数据          | `mock-data`            | 完成 | /tools/mock-data            | apps/web/src/tools/mock-data            | npx vitest run src/tools/mock-data            | —    |
| 188 | 数据转换工作台     | `data-workbench`       | 完成 | /tools/data-workbench       | apps/web/src/tools/data-workbench       | npx vitest run src/tools/data-workbench       | —    |
| 189 | 编码转换           | `encoding-convert`     | 完成 | /tools/encoding-convert     | apps/web/src/tools/encoding-convert     | npx vitest run src/tools/encoding-convert     | —    |
| 190 | 二进制查看         | `binary-viewer`        | 完成 | /tools/binary-viewer        | apps/web/src/tools/binary-viewer        | npx vitest run src/tools/binary-viewer        | —    |
