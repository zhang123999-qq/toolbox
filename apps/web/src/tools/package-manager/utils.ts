import type { PackageManagerInput, PackageManagerOptions } from './schema'

const MAX_INPUT = 200_000

/** 三类包管理器的命令对照：动作 → 各管理器的子命令 */
export const COMMANDS: ReadonlyArray<readonly [string, string, string, string]> = [
  ['安装全部依赖', 'npm install', 'yarn', 'pnpm install'],
  ['安装依赖包', 'npm add <pkg>', 'yarn add <pkg>', 'pnpm add <pkg>'],
  ['安装为 devDependency', 'npm install -D <pkg>', 'yarn add -D <pkg>', 'pnpm add -D <pkg>'],
  ['全局安装', 'npm install -g <pkg>', 'yarn global add <pkg>', 'pnpm add -g <pkg>'],
  ['卸载依赖', 'npm uninstall <pkg>', 'yarn remove <pkg>', 'pnpm remove <pkg>'],
  ['更新依赖', 'npm update <pkg>', 'yarn upgrade <pkg>', 'pnpm update <pkg>'],
  ['检查过期依赖', 'npm outdated', 'yarn outdated', 'pnpm outdated'],
  ['安装指定版本', 'npm install <pkg>@<ver>', 'yarn add <pkg>@<ver>', 'pnpm add <pkg>@<ver>'],
  ['运行 script', 'npm run <script>', 'yarn <script>', 'pnpm <script>'],
  ['执行 bin', 'npx <cmd>', 'yarn <cmd>', 'pnpm dlx <cmd>'],
  ['全局链接包', 'npm link', 'yarn link', 'pnpm link'],
  ['取消链接', 'npm unlink', 'yarn unlink', 'pnpm unlink'],
  ['发布到 registry', 'npm publish', 'yarn publish', 'pnpm publish'],
  ['查看包信息', 'npm info <pkg>', 'yarn info <pkg>', 'pnpm info <pkg>'],
  ['列出已装依赖', 'npm ls', 'yarn list', 'pnpm list'],
  ['清理缓存', 'npm cache clean --force', 'yarn cache clean', 'pnpm store prune'],
  ['重建原生模块', 'npm rebuild', 'yarn rebuild', 'pnpm rebuild'],
  ['审计漏洞', 'npm audit', 'yarn audit', 'pnpm audit'],
  ['修复漏洞', 'npm audit fix', 'yarn npm audit --fix', 'pnpm audit --fix'],
  ['初始化项目', 'npm init', 'yarn init', 'pnpm init'],
] as const

const PM_COL: Record<PackageManagerOptions['pm'], 1 | 2 | 3> = {
  npm: 1,
  yarn: 2,
  pnpm: 3,
}

export function buildCheatsheet(pm: PackageManagerOptions['pm']): string {
  if (!['npm', 'yarn', 'pnpm'].includes(pm)) {
    throw new Error('不支持的包管理器：' + pm)
  }
  const col = PM_COL[pm]
  const lines: string[] = []
  lines.push(`# ${pm} 常用命令速查`)
  lines.push('')
  lines.push('| 动作 | 命令 |')
  lines.push('| ---- | ---- |')
  for (const row of COMMANDS) {
    lines.push(`| ${row[0]} | \`${row[col]}\` |`)
  }
  return lines.join('\n')
}

export function transform(input: PackageManagerInput, options: PackageManagerOptions): string {
  if (input.text === '') return ''
  if (input.text.length > MAX_INPUT) throw new Error('输入超过 200,000 字符上限')
  return buildCheatsheet(options.pm)
}
