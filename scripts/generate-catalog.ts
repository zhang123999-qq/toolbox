/**
 * 扫描 apps/web/src/tools/*\/meta.ts，重建 packages/catalog/src/tools.generated.ts
 *
 * 用法：pnpm generate:catalog
 * 新增工具只需建目录 + 写 meta.ts，跑本脚本后路由/首页/搜索/sitemap 全部自动生效。
 */
import { readdirSync, writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const TOOLS_DIR = path.resolve('apps/web/src/tools')
const OUTPUT = path.resolve('packages/catalog/src/tools.generated.ts')

interface LoadedMeta {
  id: string
  slug: string
  title: string
  description: string
  /** 可选英文文案（types.ts 中为可选字段，缺省表示回落中文） */
  titleEn?: string
  descriptionEn?: string
  category: string
  group: string
  tags: readonly string[]
  priority: string
  feasibility: string
  template: string
  inputs: readonly string[]
  outputs: readonly string[]
  options: readonly string[]
  deps: readonly string[]
  worker: boolean
  wasm: boolean
  api: boolean
}

async function loadMetas(): Promise<LoadedMeta[]> {
  const dirs = readdirSync(TOOLS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  const metas: LoadedMeta[] = []
  for (const dir of dirs) {
    const metaPath = path.join(TOOLS_DIR, dir, 'meta.ts')
    const url = pathToFileURL(metaPath).href
    const mod: unknown = await import(url)
    const meta = (mod as { meta?: LoadedMeta }).meta
    if (!meta) {
      console.warn(`[generate-catalog] 跳过 ${dir}：未导出 meta`)
      continue
    }
    metas.push(meta)
    console.log(`[generate-catalog] + ${meta.id}`)
  }
  return metas
}

const q = (value: string): string => `'${value.replace(/'/g, "\\'")}'`
const arr = (items: readonly (string | number)[]): string =>
  `[${items.map((i) => (typeof i === 'number' ? String(i) : q(String(i)))).join(', ')}]`

function render(metas: LoadedMeta[]): string {
  const entries = metas
    .map((m) => {
      const fields = [
        `id: ${q(m.id)}`,
        `slug: ${q(m.slug)}`,
        `title: ${q(m.title)}`,
        `description: ${q(m.description)}`,
        // 可选字段：仅在 meta.ts 里写了才输出，避免给 870 条都塞一串 undefined
        ...(m.titleEn ? [`titleEn: ${q(m.titleEn)}`] : []),
        ...(m.descriptionEn ? [`descriptionEn: ${q(m.descriptionEn)}`] : []),
        `category: ${q(m.category)}`,
        `group: ${q(m.group)}`,
        `tags: ${arr(m.tags)}`,
        `priority: ${q(m.priority)}`,
        `feasibility: ${q(m.feasibility)}`,
        `template: ${q(m.template)}`,
        `inputs: ${arr(m.inputs)}`,
        `outputs: ${arr(m.outputs)}`,
        `options: ${arr(m.options)}`,
        `deps: ${arr(m.deps)}`,
        `worker: ${m.worker}`,
        `wasm: ${m.wasm}`,
        `api: ${m.api}`,
      ]
      return `  {\n${fields.map((f) => `    ${f},`).join('\n')}\n  },`
    })
    .join('\n')

  // 头部**不写生成时间**：否则每次 `pnpm generate:catalog` 都会让这个文件产生一行
  // 无意义的时间戳 diff，既污染提交、又让人分不清「真改了内容」还是「只是重跑了一遍」。
  // 改了任何 meta.ts 后重跑本脚本即可，差异就是真实的元数据变化。
  return `/**
 * 工具注册表 —— 由 scripts/generate-catalog.ts 自动生成，请勿手工编辑。
 * 改了任何 meta.ts 后请重跑：pnpm generate:catalog
 * 工具数：${metas.length}
 */
import type { ToolMeta } from './types'

export const TOOLS: readonly ToolMeta[] = [
${entries}
]

const TOOL_MAP: ReadonlyMap<string, ToolMeta> = new Map(TOOLS.map((t) => [t.id, t]))

export function getTool(id: string): ToolMeta | undefined {
  return TOOL_MAP.get(id)
}

export function toolsOfCategory(category: string): readonly ToolMeta[] {
  return TOOLS.filter((t) => t.category === category)
}

export const TOOL_COUNT = TOOLS.length
`
}

async function main(): Promise<void> {
  const metas = await loadMetas()
  writeFileSync(OUTPUT, render(metas), 'utf8')
  console.log(
    `[generate-catalog] 已写入 ${metas.length} 条 → packages/catalog/src/tools.generated.ts`,
  )
}

main().catch((error: unknown) => {
  console.error('[generate-catalog] 失败:', error)
  process.exit(1)
})
