import type { OAuthInput, OAuthOptions } from './schema'

const MAX_INPUT = 200_000

const EXAMPLE_BASE = 'https://auth.example.com'
const EXAMPLE_CLIENT = 'your-client-id'
const EXAMPLE_REDIRECT = 'https://yourapp.example.com/callback'

/** 授权码流程 */
function authorizationCode(): string {
  return [
    'OAuth 2.0 授权码流程（Authorization Code）—— 最常用，适合有后端的 Web/移动应用',
    '',
    '步骤：',
    '1. 把用户浏览器重定向到授权端点：',
    `   ${EXAMPLE_BASE}/authorize?response_type=code&client_id=${EXAMPLE_CLIENT}&redirect_uri=${encodeURIComponent(EXAMPLE_REDIRECT)}&scope=openid%20profile&state=RANDOM123`,
    '2. 用户登录并同意授权后，授权服务器重定向回 redirect_uri，并带上 ?code=...&state=...',
    '3. 校验 state 与发起时一致（防 CSRF），后端用 code 换 token：',
    `   POST ${EXAMPLE_BASE}/oauth/token`,
    '     Content-Type: application/x-www-form-urlencoded',
    `     grant_type=authorization_code&code=收到的code&redirect_uri=${encodeURIComponent(EXAMPLE_REDIRECT)}&client_id=${EXAMPLE_CLIENT}&client_secret=你的密钥`,
    '4. 后端拿到 access_token（+ refresh_token），可安全存储；绝不能让前端碰到 client_secret',
    '',
    '参数表：',
    '  response_type=code   固定值，告诉授权服务器返回授权码',
    '  client_id            应用在授权服务器注册得到的 ID',
    '  redirect_uri         必须与注册时完全一致（含协议/端口/路径）',
    '  scope                请求的权限范围，空格用 %20 或 + 分隔',
    '  state                随机串，回调时原样带回，防 CSRF，必须校验',
    '  code_challenge       PKCE：公共客户端（SPA/App）强烈建议带上',
  ].join('\n')
}

/** 隐式流程（已不推荐） */
function implicit(): string {
  return [
    'OAuth 2.0 隐式流程（Implicit）—— 旧版 SPA 用，现已不推荐，建议改用授权码 + PKCE',
    '',
    '步骤：',
    '1. 把用户重定向到授权端点，直接拿 token：',
    `   ${EXAMPLE_BASE}/authorize?response_type=token&client_id=${EXAMPLE_CLIENT}&redirect_uri=${encodeURIComponent(EXAMPLE_REDIRECT)}&scope=openid&state=RANDOM123`,
    '2. 授权后授权服务器把 access_token 放在 URL 的 fragment（#access_token=...）里重定向回来',
    '3. 前端从 location.hash 里取出 token；没有 refresh_token，过期需重新登录',
    '',
    '为什么不推荐：',
    '  - token 暴露在 URL fragment / 浏览器历史里',
    '  - 无法做客户端认证',
    '  OAuth 2.1 已删除该流程，新应用请用授权码 + PKCE。',
  ].join('\n')
}

/** 客户端凭证流程 */
function clientCredentials(): string {
  return [
    'OAuth 2.0 客户端凭证流程（Client Credentials）—— 机器对机器，没有用户参与',
    '',
    '步骤：',
    '1. 后端直接用 client_id + client_secret 换 token，不经过用户浏览器：',
    `   POST ${EXAMPLE_BASE}/oauth/token`,
    '     Content-Type: application/x-www-form-urlencoded',
    `     grant_type=client_credentials&client_id=${EXAMPLE_CLIENT}&client_secret=你的密钥&scope=read:data`,
    '2. 响应里拿到 access_token，缓存到过期前复用：',
    '   { "access_token": "...", "expires_in": 3600, "token_type": "Bearer" }',
    '3. 调业务 API 时带上：Authorization: Bearer <access_token>',
    '',
    '适用场景：',
    '  - 后端服务之间互相调用（如定时任务同步数据）',
    '  - 没有最终用户、纯服务账号鉴权',
    '安全提醒：client_secret 只存在于后端，绝不能下发到浏览器或 App 客户端。',
  ].join('\n')
}

export function renderFlow(flow: string): string {
  switch (flow) {
    case 'authorization-code':
      return authorizationCode()
    case 'implicit':
      return implicit()
    case 'client-credentials':
      return clientCredentials()
    default:
      throw new Error('不支持的流程：' + flow)
  }
}

export function transform(input: OAuthInput, options: OAuthOptions): string {
  if (input.text === '') return ''
  if (input.text.length > MAX_INPUT) {
    throw new Error(`输入超过 ${MAX_INPUT.toLocaleString('en-US')} 字符上限`)
  }
  return renderFlow(options.flow)
}
