/**
 * wrangler（#810）核心逻辑：常用命令字典、参数文本解析与命令拼装。
 * 纯函数，无 DOM / 网络依赖，可在 Node 下单测。
 */

export interface WranglerCommandDef {
  action: string
  title: string
  description: string
  example: string
  /** 必填参数名 */
  requiredArgs: readonly string[]
}

export const COMMANDS: readonly WranglerCommandDef[] = [
  {
    action: 'deploy',
    title: '发布 Worker',
    description: '将当前目录的 Worker 发布到 Cloudflare',
    example: 'npx wrangler deploy',
    requiredArgs: [],
  },
  {
    action: 'dev',
    title: '本地开发',
    description: '本地启动开发服务器，可指定端口',
    example: 'npx wrangler dev --port 8787',
    requiredArgs: [],
  },
  {
    action: 'tail',
    title: '实时日志',
    description: '查看已发布 Worker 的实时日志',
    example: 'npx wrangler tail',
    requiredArgs: [],
  },
  {
    action: 'kv-put',
    title: 'KV 写入',
    description: '向 KV 命名空间写入键值',
    example: 'npx wrangler kv:key put --binding=MY_KV mykey myvalue',
    requiredArgs: ['binding', 'key', 'value'],
  },
  {
    action: 'kv-get',
    title: 'KV 读取',
    description: '从 KV 命名空间读取键值',
    example: 'npx wrangler kv:key get --binding=MY_KV mykey',
    requiredArgs: ['binding', 'key'],
  },
  {
    action: 'd1-execute',
    title: 'D1 执行 SQL',
    description: '在 D1 数据库上执行一条 SQL',
    example: 'npx wrangler d1 execute app-db --command="SELECT 1"',
    requiredArgs: ['database', 'sql'],
  },
  {
    action: 'r2-upload',
    title: 'R2 上传文件',
    description: '上传本地文件到 R2 存储桶',
    example: 'npx wrangler r2 object put my-bucket/dist/app.js --file=dist/app.js',
    requiredArgs: ['bucket', 'file'],
  },
]

/** 按 action 取命令定义，未知 action 中文抛错 */
export function getCommandDef(action: string): WranglerCommandDef {
  const def = COMMANDS.find((c) => c.action === action)
  if (!def) throw new Error(`未知命令：${action}`)
  return def
}

/**
 * 解析参数文本：每行「key=value」，空行跳过；格式非法行中文抛错。
 * 后出现的同名参数覆盖先前的。
 */
export function parseArgsText(text: string): Record<string, string> {
  const args: Record<string, string> = {}
  const lines = text.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line === '') continue
    const eq = line.indexOf('=')
    if (eq <= 0) throw new Error(`第 ${i + 1} 行参数格式非法，应为「key=value」`)
    const key = line.slice(0, eq).trim()
    const value = line.slice(eq + 1).trim()
    args[key] = value
  }
  return args
}

function requireArg(args: Record<string, string>, key: string): string {
  const value = (args[key] ?? '').trim()
  if (value === '') throw new Error(`缺少必填参数：${key}`)
  return value
}

export type WranglerAction =
  | 'deploy'
  | 'dev'
  | 'tail'
  | 'kv-put'
  | 'kv-get'
  | 'd1-execute'
  | 'r2-upload'

/** 拼装完整命令；未知 action 或缺必填参数时中文抛错 */
export function buildCommand(action: string, args: Record<string, string>): string {
  getCommandDef(action)
  switch (action as WranglerAction) {
    case 'deploy': {
      const name = (args['name'] ?? '').trim()
      return 'npx wrangler deploy' + (name !== '' ? ` --name ${name}` : '')
    }
    case 'dev': {
      const port = (args['port'] ?? '').trim()
      if (port !== '' && !/^\d+$/.test(port)) throw new Error('port 须为数字')
      return 'npx wrangler dev' + (port !== '' ? ` --port ${port}` : '')
    }
    case 'tail':
      return 'npx wrangler tail'
    case 'kv-put': {
      const binding = requireArg(args, 'binding')
      const key = requireArg(args, 'key')
      const value = requireArg(args, 'value')
      return `npx wrangler kv:key put --binding=${binding} ${key} ${value}`
    }
    case 'kv-get': {
      const binding = requireArg(args, 'binding')
      const key = requireArg(args, 'key')
      return `npx wrangler kv:key get --binding=${binding} ${key}`
    }
    case 'd1-execute': {
      const database = requireArg(args, 'database')
      const sql = requireArg(args, 'sql')
      return `npx wrangler d1 execute ${database} --command="${sql}"`
    }
    case 'r2-upload': {
      const bucket = requireArg(args, 'bucket')
      const file = requireArg(args, 'file')
      return `npx wrangler r2 object put ${bucket}/${file} --file=${file}`
    }
  }
}

export const EXAMPLE_ARGS = ['binding=MY_KV', 'key=hello', 'value=world'].join('\n')
