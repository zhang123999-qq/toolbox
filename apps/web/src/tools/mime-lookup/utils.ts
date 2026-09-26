import type { MimeLookupInput, MimeLookupOptions } from './schema'

/** 输入非法时抛出，由 UI 捕获展示 */
export class MimeLookupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MimeLookupError'
  }
}

/** 与 schema 保持一致的输入上限 */
const MAX_INPUT = 10_000

/** 模糊搜索的返回上限：再多就淹没目标，用户应继续补关键词而不是翻列表 */
const SEARCH_LIMIT = 20

/** 一条对照记录：扩展名、MIME 类型、中文说明 */
export interface MimeEntry {
  readonly ext: string
  readonly mime: string
  readonly label: string
}

/**
 * 内置对照表（扩展名 → MIME）。
 * 口径以 IANA media-types 与 nginx mime.types 的交集为准：两者冲突的地方
 * （如 `.ts`）采用 nginx 口径并在说明里标注歧义，详见 README「限制」。
 */
const TABLE: readonly (readonly [string, string, string])[] = [
  // —— 文本 / 标记 / 数据 ——
  ['txt', 'text/plain', '纯文本'],
  ['text', 'text/plain', '纯文本'],
  ['log', 'text/plain', '日志文件'],
  ['conf', 'text/plain', '配置文件'],
  ['ini', 'text/plain', 'INI 配置'],
  ['html', 'text/html', 'HTML 文档'],
  ['htm', 'text/html', 'HTML 文档'],
  ['css', 'text/css', 'CSS 样式表'],
  ['csv', 'text/csv', 'CSV 表格'],
  ['tsv', 'text/tab-separated-values', 'TSV 表格'],
  ['md', 'text/markdown', 'Markdown 文档'],
  ['markdown', 'text/markdown', 'Markdown 文档'],
  ['xml', 'application/xml', 'XML 数据'],
  ['xsl', 'application/xml', 'XSL 样式表'],
  ['json', 'application/json', 'JSON 数据'],
  ['jsonld', 'application/ld+json', 'JSON-LD 数据'],
  ['geojson', 'application/geo+json', 'GeoJSON 数据'],
  ['yaml', 'application/yaml', 'YAML 数据'],
  ['yml', 'application/yaml', 'YAML 数据'],
  ['toml', 'application/toml', 'TOML 配置'],
  ['sql', 'application/sql', 'SQL 脚本'],
  ['graphql', 'application/graphql', 'GraphQL 查询'],
  ['vtt', 'text/vtt', 'WebVTT 字幕'],
  ['srt', 'application/x-subrip', 'SRT 字幕'],
  ['ics', 'text/calendar', '日历事件'],
  ['vcf', 'text/vcard', '电子名片'],
  ['rtf', 'application/rtf', 'RTF 文档'],

  // —— 源码 ——
  ['js', 'text/javascript', 'JavaScript 源码'],
  ['mjs', 'text/javascript', 'JavaScript 模块'],
  ['cjs', 'text/javascript', 'CommonJS 模块'],
  ['jsx', 'text/jsx', 'JSX 源码'],
  ['tsx', 'text/tsx', 'TSX 源码'],
  ['ts', 'video/mp2t', 'MPEG-TS 传输流（也可能是 TypeScript 源码）'],
  ['py', 'text/x-python', 'Python 源码'],
  ['rb', 'text/x-ruby', 'Ruby 源码'],
  ['php', 'application/x-httpd-php', 'PHP 源码'],
  ['java', 'text/x-java-source', 'Java 源码'],
  ['class', 'application/java-vm', 'Java 字节码'],
  ['go', 'text/x-go', 'Go 源码'],
  ['rs', 'text/x-rust', 'Rust 源码'],
  ['c', 'text/x-c', 'C 源码'],
  ['h', 'text/x-c', 'C 头文件'],
  ['cpp', 'text/x-c++', 'C++ 源码'],
  ['cc', 'text/x-c++', 'C++ 源码'],
  ['hpp', 'text/x-c++', 'C++ 头文件'],
  ['cs', 'text/x-csharp', 'C# 源码'],
  ['swift', 'text/x-swift', 'Swift 源码'],
  ['kt', 'text/x-kotlin', 'Kotlin 源码'],
  ['scala', 'text/x-scala', 'Scala 源码'],
  ['lua', 'text/x-lua', 'Lua 源码'],
  ['pl', 'text/x-perl', 'Perl 脚本'],
  ['sh', 'application/x-sh', 'Shell 脚本'],
  ['bash', 'application/x-sh', 'Bash 脚本'],
  ['proto', 'text/x-protobuf', 'Protobuf 定义'],
  ['wasm', 'application/wasm', 'WebAssembly 模块'],

  // —— 图片 ——
  ['png', 'image/png', 'PNG 图片'],
  ['apng', 'image/apng', 'APNG 动图'],
  ['jpg', 'image/jpeg', 'JPEG 图片'],
  ['jpeg', 'image/jpeg', 'JPEG 图片'],
  ['jpe', 'image/jpeg', 'JPEG 图片'],
  ['gif', 'image/gif', 'GIF 动图'],
  ['webp', 'image/webp', 'WebP 图片'],
  ['avif', 'image/avif', 'AVIF 图片'],
  ['jxl', 'image/jxl', 'JPEG XL 图片'],
  ['heic', 'image/heic', 'HEIC 图片'],
  ['heif', 'image/heif', 'HEIF 图片'],
  ['bmp', 'image/bmp', 'BMP 位图'],
  ['ico', 'image/vnd.microsoft.icon', 'ICO 图标'],
  ['cur', 'image/vnd.microsoft.icon', 'Windows 光标'],
  ['tif', 'image/tiff', 'TIFF 图片'],
  ['tiff', 'image/tiff', 'TIFF 图片'],
  ['svg', 'image/svg+xml', 'SVG 矢量图'],
  ['svgz', 'image/svg+xml', 'Gzip 压缩的 SVG'],
  ['psd', 'image/vnd.adobe.photoshop', 'Photoshop 源文件'],
  ['ai', 'application/postscript', 'Illustrator 源文件'],
  ['eps', 'application/postscript', 'EPS 图形'],
  ['ps', 'application/postscript', 'PostScript 文档'],
  ['dwg', 'image/vnd.dwg', 'AutoCAD 图纸'],
  ['emf', 'image/emf', '增强型图元文件'],
  ['wmf', 'image/wmf', 'Windows 图元文件'],

  // —— 音频 / 视频 ——
  ['mp3', 'audio/mpeg', 'MP3 音频'],
  ['m4a', 'audio/mp4', 'AAC 音频'],
  ['aac', 'audio/aac', 'AAC 音频'],
  ['wav', 'audio/wav', 'WAV 音频'],
  ['flac', 'audio/flac', 'FLAC 无损音频'],
  ['ape', 'audio/x-ape', 'APE 无损音频'],
  ['ogg', 'audio/ogg', 'Ogg 音频'],
  ['oga', 'audio/ogg', 'Ogg 音频'],
  ['opus', 'audio/opus', 'Opus 音频'],
  ['weba', 'audio/webm', 'WebM 音频'],
  ['mid', 'audio/midi', 'MIDI 音乐'],
  ['midi', 'audio/midi', 'MIDI 音乐'],
  ['amr', 'audio/amr', 'AMR 语音'],
  ['mp4', 'video/mp4', 'MP4 视频'],
  ['m4v', 'video/x-m4v', 'MPEG-4 视频'],
  ['webm', 'video/webm', 'WebM 视频'],
  ['mkv', 'video/x-matroska', 'Matroska 视频'],
  ['avi', 'video/x-msvideo', 'AVI 视频'],
  ['mov', 'video/quicktime', 'QuickTime 视频'],
  ['qt', 'video/quicktime', 'QuickTime 视频'],
  ['wmv', 'video/x-ms-wmv', 'WMV 视频'],
  ['flv', 'video/x-flv', 'FLV 视频'],
  ['ogv', 'video/ogg', 'Ogg 视频'],
  ['m3u8', 'application/vnd.apple.mpegurl', 'HLS 播放列表'],
  ['mpd', 'application/dash+xml', 'DASH 清单'],

  // —— 字体 ——
  ['woff', 'font/woff', 'WOFF 字体'],
  ['woff2', 'font/woff2', 'WOFF2 字体'],
  ['ttf', 'font/ttf', 'TrueType 字体'],
  ['otf', 'font/otf', 'OpenType 字体'],
  ['eot', 'application/vnd.ms-fontobject', 'EOT 字体'],

  // —— 文档 / 表格 / 演示 ——
  ['pdf', 'application/pdf', 'PDF 文档'],
  ['doc', 'application/msword', 'Word 97-2003 文档'],
  ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'Word 文档'],
  ['xls', 'application/vnd.ms-excel', 'Excel 97-2003 工作簿'],
  ['xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Excel 工作簿'],
  ['ppt', 'application/vnd.ms-powerpoint', 'PowerPoint 97-2003 演示'],
  [
    'pptx',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'PowerPoint 演示',
  ],
  ['odt', 'application/vnd.oasis.opendocument.text', 'OpenDocument 文本'],
  ['ods', 'application/vnd.oasis.opendocument.spreadsheet', 'OpenDocument 表格'],
  ['odp', 'application/vnd.oasis.opendocument.presentation', 'OpenDocument 演示'],
  ['epub', 'application/epub+zip', 'EPUB 电子书'],
  ['mobi', 'application/x-mobipocket-ebook', 'Mobi 电子书'],
  ['numbers', 'application/x-iwork-numbers-sffnumbers', 'Numbers 表格'],
  ['pages', 'application/x-iwork-pages-sffpages', 'Pages 文稿'],
  ['key', 'application/x-iwork-keynote-sffkey', 'Keynote 演示'],

  // —— 压缩包 / 安装包 ——
  ['zip', 'application/zip', 'ZIP 压缩包'],
  ['rar', 'application/vnd.rar', 'RAR 压缩包'],
  ['7z', 'application/x-7z-compressed', '7-Zip 压缩包'],
  ['gz', 'application/gzip', 'Gzip 压缩包'],
  ['tgz', 'application/gzip', 'Gzip 压缩包'],
  ['bz2', 'application/x-bzip2', 'Bzip2 压缩包'],
  ['xz', 'application/x-xz', 'XZ 压缩包'],
  ['zst', 'application/zstd', 'Zstd 压缩包'],
  ['lz4', 'application/x-lz4', 'LZ4 压缩包'],
  ['tar', 'application/x-tar', 'Tar 归档'],
  ['jar', 'application/java-archive', 'JAR 包'],
  ['apk', 'application/vnd.android.package-archive', 'Android 安装包'],
  ['ipa', 'application/octet-stream', 'iOS 安装包（通用二进制流）'],
  ['deb', 'application/vnd.debian.binary-package', 'Debian 包'],
  ['rpm', 'application/x-rpm', 'RPM 包'],
  ['dmg', 'application/x-apple-diskimage', 'macOS 磁盘镜像'],
  ['iso', 'application/x-iso9660-image', 'ISO 光盘镜像'],
  ['msi', 'application/x-msdownload', 'Windows 安装包'],
  ['exe', 'application/x-msdownload', 'Windows 可执行程序'],
  ['dll', 'application/x-msdownload', 'Windows 动态库'],
  ['whl', 'application/zip', 'Python Wheel 包'],
  ['torrent', 'application/x-bittorrent', 'BT 种子'],

  // —— 证书 / 密钥 / 二进制 ——
  ['pem', 'application/x-pem-file', 'PEM 证书或密钥'],
  ['crt', 'application/x-x509-ca-cert', 'X.509 证书'],
  ['cer', 'application/x-x509-ca-cert', 'X.509 证书'],
  ['der', 'application/x-x509-ca-cert', 'X.509 证书（DER）'],
  ['pfx', 'application/x-pkcs12', 'PKCS#12 证书'],
  ['p12', 'application/x-pkcs12', 'PKCS#12 证书'],
  ['pub', 'application/x-ssh-public-key', 'SSH 公钥'],
  ['bin', 'application/octet-stream', '二进制数据'],
  ['dat', 'application/octet-stream', '二进制数据'],
  ['hex', 'application/octet-stream', '十六进制记录'],
  ['sqlite', 'application/vnd.sqlite3', 'SQLite 数据库'],
  ['db', 'application/vnd.sqlite3', 'SQLite 数据库'],
  ['gltf', 'model/gltf+json', 'glTF 三维模型'],
  ['glb', 'model/gltf-binary', 'glTF 二进制三维模型'],
]

/** 表里的同一 MIME 会映射回多个扩展名，预建两棵索引避免每次查询都全表扫 */
interface Index {
  readonly extMap: ReadonlyMap<string, MimeEntry>
  readonly mimeMap: ReadonlyMap<string, readonly MimeEntry[]>
  readonly entries: readonly MimeEntry[]
}

let cached: Index | null = null

/** 构建（并缓存）双向索引；表是模块级常量，索引只算一次 */
function index(): Index {
  if (cached) return cached
  const extMap = new Map<string, MimeEntry>()
  const mimeMap = new Map<string, MimeEntry[]>()
  const entries: MimeEntry[] = []
  for (const [ext, mime, label] of TABLE) {
    const entry: MimeEntry = { ext, mime, label }
    entries.push(entry)
    if (!extMap.has(ext)) extMap.set(ext, entry)
    const bucket = mimeMap.get(mime) ?? []
    bucket.push(entry)
    mimeMap.set(mime, bucket)
  }
  cached = { extMap, mimeMap, entries }
  return cached
}

/** 收录记录总数，写进报错文案让用户知道表的规模 */
export function tableSize(): number {
  return index().entries.length
}

/** 标准化扩展名：去掉前导点、周边空白与通配符 `*`，统一小写 */
export function normalizeExt(raw: string): string {
  return raw
    .trim()
    .replace(/^\*?\.?/, '')
    .toLowerCase()
}

/** 标准化 MIME：去掉 `;charset=utf-8` 一类的参数、首尾空白，统一小写 */
export function normalizeMime(raw: string): string {
  const head = raw.split(';')[0] ?? ''
  return head.trim().toLowerCase()
}

/** 按扩展名查 MIME；未收录返回 undefined */
export function findByExt(ext: string): MimeEntry | undefined {
  return index().extMap.get(normalizeExt(ext))
}

/** 按 MIME 反查扩展名；按表中的出现顺序返回，未收录返回空数组 */
export function findByMime(mime: string): readonly MimeEntry[] {
  return index().mimeMap.get(normalizeMime(mime)) ?? []
}

/** 未收录时的兜底信息，带 media-type 的通用默认值，避免出现「查到却没有类型」的空档 */
const FALLBACK_MIME: Record<string, string> = {
  text: 'text/plain',
  image: 'image/*',
  audio: 'audio/*',
  video: 'video/*',
  font: 'font/*',
  model: 'model/*',
  application: 'application/octet-stream',
}

/**
 * 模糊搜索：依次按「扩展名完全相等 → MIME 完全相等 → 扩展名前缀 → MIME 前缀 →
 * 说明含关键词」五档排序去重取前若干条。这样 `js` 一定排在 `json` 前面。
 */
export function searchMime(query: string, limit: number): readonly MimeEntry[] {
  const key = query.trim().toLowerCase()
  if (key === '') return []
  const { entries } = index()

  const score = (entry: MimeEntry): number => {
    if (entry.ext === key) return 0
    if (entry.mime === key) return 1
    if (entry.ext.startsWith(key)) return 2
    if (entry.mime.startsWith(key)) return 3
    if (entry.label.includes(key) || entry.mime.includes(key)) return 4
    return Number.POSITIVE_INFINITY
  }

  return entries
    .map((entry) => ({ entry, rank: score(entry) }))
    .filter((item) => Number.isFinite(item.rank))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map((item) => item.entry)
}

/** 未收录提示：能判断出主类型时给出通用默认值，否则如实说明未收录 */
function missLine(kind: 'ext' | 'mime', value: string, strict: boolean): string {
  if (kind === 'ext') {
    if (strict) {
      throw new MimeLookupError(
        `未收录的扩展名：${value}（工具内置 ${tableSize()} 条对照记录；可关闭「严格模式」改为输出“未收录”）`,
      )
    }
    return `${value} → 未收录（浏览器兜底可用 ${FALLBACK_MIME.application ?? 'application/octet-stream'}）`
  }
  if (strict) {
    throw new MimeLookupError(`未收录的 MIME 类型：${value}（内置表中没有对应的扩展名）`)
  }
  const topLevel = normalizeMime(value).split('/')[0] ?? ''
  const fallback = FALLBACK_MIME[topLevel]
  return fallback === undefined ? `${value} → 未收录` : `${value} → 未收录（建议 ${fallback}）`
}

/** 一次查询可能被拆成多行，空行直接跳过 */
function queryLines(text: string): readonly string[] {
  return text
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '')
}

/** 扩展名 → MIME，多行逐个查，行之间用   分隔段 */
function lookupByExt(text: string, strict: boolean): string {
  const lines: string[] = []
  for (const line of queryLines(text)) {
    const entry = findByExt(line)
    if (!entry) {
      lines.push(missLine('ext', line, strict))
      continue
    }
    lines.push(`${entry.ext} → ${entry.mime}   ${entry.label}`)
  }
  return lines.join('\n')
}

/** MIME → 扩展名：同一类型可能有多个扩展名，全部列出并注明别名关系 */
function lookupByMime(text: string, strict: boolean): string {
  const lines: string[] = []
  for (const line of queryLines(text)) {
    const entries = findByMime(line)
    if (entries.length === 0) {
      lines.push(missLine('mime', line, strict))
      continue
    }
    const exts = entries.map((entry) => '.' + entry.ext).join(' ')
    lines.push(`${normalizeMime(line)} → ${exts}   ${entries[0]?.label ?? ''}`.trimEnd())
  }
  return lines.join('\n')
}

/** 模糊搜索：每个关键词一段，段首标注命中条数 */
function lookupBySearch(text: string, strict: boolean): string {
  const blocks: string[] = []
  for (const line of queryLines(text)) {
    const hits = searchMime(line, SEARCH_LIMIT)
    if (hits.length === 0) {
      if (strict) throw new MimeLookupError(`没有匹配“${line}”的记录，换个关键词试试`)
      blocks.push(`“${line}” → 无匹配`)
      continue
    }
    const width = hits.reduce((max, entry) => Math.max(max, entry.mime.length), 0)
    const rows = hits.map(
      (entry) => `  .${entry.ext.padEnd(6, ' ')} ${entry.mime.padEnd(width, ' ')}   ${entry.label}`,
    )
    blocks.push([`“${line}” 命中 ${hits.length} 条：`, ...rows].join('\n'))
  }
  return blocks.join('\n\n')
}

/**
 * MIME 查询 —— 纯函数，不依赖 React / DOM，可独立单测。
 * 空输入返回空串；超长输入按此项目的统一口径抛错。
 */
export function transform(input: MimeLookupInput, options: MimeLookupOptions): string {
  if (!input.text.trim()) return ''
  if (input.text.length > MAX_INPUT) {
    throw new MimeLookupError('输入超过 10,000 字符上限')
  }

  if (options.mode === 'mime2ext') return lookupByMime(input.text, options.strict)
  if (options.mode === 'search') return lookupBySearch(input.text, options.strict)
  return lookupByExt(input.text, options.strict)
}
