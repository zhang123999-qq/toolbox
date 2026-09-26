import type { HttpStatusInput, HttpStatusOptions } from './schema'

interface StatusEntry {
  code: number
  en: string
  zh: string
  category: string
}

const CATEGORY_OF = (code: number): string => {
  const c = Math.floor(code / 100)
  switch (c) {
    case 1:
      return '1xx 信息'
    case 2:
      return '2xx 成功'
    case 3:
      return '3xx 重定向'
    case 4:
      return '4xx 客户端错误'
    case 5:
      return '5xx 服务端错误'
    default:
      return '未知'
  }
}

/** [码, 英文名, 中文释义] */
const TABLE: ReadonlyArray<readonly [number, string, string]> = [
  [100, 'Continue', '请求已收到，客户端应继续发送请求体'],
  [101, 'Switching Protocols', '服务器切换到请求头指定的协议（如升级 WebSocket）'],
  [102, 'Processing', '服务器已收到并正在处理请求，暂无响应结果'],
  [103, 'Early Hints', '提前返回部分响应头，便于客户端预热'],
  [200, 'OK', '请求成功'],
  [201, 'Created', '请求成功并创建了新资源（如 POST 新建）'],
  [202, 'Accepted', '已接受请求但尚未处理完成（异步任务）'],
  [203, 'Non-Authoritative Information', '返回的元信息来自本地副本，非源站原始数据'],
  [204, 'No Content', '成功但无返回体'],
  [205, 'Reset Content', '成功，要求客户端重置文档视图'],
  [206, 'Partial Content', '成功返回部分内容（断点续传 / Range 请求）'],
  [207, 'Multi-Status', '多个状态码的聚合响应（WebDAV）'],
  [208, 'Already Reported', '同一集合内成员已枚举，不再重复'],
  [226, 'IM Used', '响应来自实例操纵（RFC 3229）'],
  [300, 'Multiple Choices', '有多个可选响应，需客户端选择'],
  [301, 'Moved Permanently', '资源永久移动到新 URL（SEO 权重转移）'],
  [302, 'Found', '资源临时在其他 URL，客户端下次仍用原 URL'],
  [303, 'See Other', '改用 GET 访问另一个 URL（POST 后跳转）'],
  [304, 'Not Modified', '资源未修改，使用本地缓存'],
  [305, 'Use Proxy', '需通过代理访问（已废弃）'],
  [307, 'Temporary Redirect', '临时重定向，请求方法与 body 不变'],
  [308, 'Permanent Redirect', '永久重定向，请求方法与 body 不变'],
  [400, 'Bad Request', '请求语法错误，服务器无法理解'],
  [401, 'Unauthorized', '未认证或认证失败（未登录 / Token 失效）'],
  [402, 'Payment Required', '需付费才能访问（预留，少用）'],
  [403, 'Forbidden', '服务器拒绝执行，即使已认证也无权访问'],
  [404, 'Not Found', '资源不存在'],
  [405, 'Method Not Allowed', '请求方法不被允许（如对只读资源 POST）'],
  [406, 'Not Acceptable', '响应内容无法满足 Accept 头要求'],
  [407, 'Proxy Authentication Required', '需先通过代理认证'],
  [408, 'Request Timeout', '服务器等待请求超时'],
  [409, 'Conflict', '请求与资源当前状态冲突（如版本冲突）'],
  [410, 'Gone', '资源已永久删除'],
  [411, 'Length Required', '需要 Content-Length 头'],
  [412, 'Precondition Failed', '请求头前置条件判断失败'],
  [413, 'Payload Too Large', '请求体过大'],
  [414, 'URI Too Long', '请求 URI 过长'],
  [415, 'Unsupported Media Type', '不支持的媒体类型'],
  [416, 'Range Not Satisfiable', '请求的 Range 无法满足'],
  [417, 'Expectation Failed', 'Expect 头要求无法满足'],
  [418, "I'm a teapot", '愚人节彩蛋：服务器是茶壶，不能煮咖啡'],
  [421, 'Misdirected Request', '请求发往了无法产生响应的服务器'],
  [422, 'Unprocessable Entity', '语法正确但语义错误（表单校验失败常见）'],
  [423, 'Locked', '资源被锁定（WebDAV）'],
  [424, 'Failed Dependency', '依赖的另一请求失败'],
  [425, 'Too Early', '服务器担心重放，拒绝处理'],
  [426, 'Upgrade Required', '客户端应升级协议'],
  [428, 'Precondition Required', '请求需带条件头'],
  [429, 'Too Many Requests', '触发限流（频率过高）'],
  [431, 'Request Header Fields Too Large', '请求头字段过大'],
  [451, 'Unavailable For Legal Reasons', '因法律原因不可用（如被版权方要求下架）'],
  [500, 'Internal Server Error', '服务器内部错误（未捕获异常）'],
  [501, 'Not Implemented', '服务器不支持该功能'],
  [502, 'Bad Gateway', '网关/代理从上游收到无效响应'],
  [503, 'Service Unavailable', '服务暂不可用（维护 / 过载）'],
  [504, 'Gateway Timeout', '网关等待上游超时'],
  [505, 'HTTP Version Not Supported', '不支持的 HTTP 版本'],
  [506, 'Variant Also Negotiates', '内容协商循环配置错误'],
  [507, 'Insufficient Storage', '存储空间不足（WebDAV）'],
  [508, 'Loop Detected', '检测到无限重定向循环'],
  [510, 'Not Extended', '扩展策略未满足'],
  [511, 'Network Authentication Required', '需先通过网络认证（如 captive portal）'],
]

const INDEX: ReadonlyMap<number, StatusEntry> = new Map(
  TABLE.map(([code, en, zh]) => [code, { code, en, zh, category: CATEGORY_OF(code) }]),
)

function formatEntry(e: StatusEntry): string {
  return `${e.code} ${e.en}（${e.zh}）— ${e.category}`
}

/** 按码号或关键词查询 */
export function lookup(query: string): StatusEntry[] {
  const q = query.trim()
  if (q === '') return []
  // 纯数字：精确查码号
  if (/^\d{3}$/.test(q)) {
    const hit = INDEX.get(Number(q))
    return hit ? [hit] : []
  }
  // 否则按关键词在英文名 / 中文释义里过滤
  const lower = q.toLowerCase()
  return TABLE.map(([code, en, zh]) => ({ code, en, zh, category: CATEGORY_OF(code) })).filter(
    (e) => e.en.toLowerCase().includes(lower) || e.zh.includes(q),
  )
}

/** T2 同步入口 */
export function transform(input: HttpStatusInput, _options: HttpStatusOptions): string {
  const query = input.text.trim()
  if (query === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  const results = lookup(query)
  if (results.length === 0) throw new Error('未找到匹配的状态码：' + query)
  if (/^\d{3}$/.test(query)) return results.map(formatEntry).join('\n')
  const capped = results.slice(0, 20)
  const head = `共 ${results.length} 条匹配，列出前 ${capped.length} 条：\n`
  return head + capped.map(formatEntry).join('\n')
}
