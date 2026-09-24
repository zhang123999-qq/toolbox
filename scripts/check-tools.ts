/**
 * 元数据校验（DEVELOPMENT.md §9：pnpm check:tools）
 *
 * 校验内容：
 *  1. 20 域真源表合计是否为 870、各组工具数是否匹配
 *  2. 每个工具的 16 字段契约（Zod Schema）
 *  3. slug 唯一性
 *  4. 模板 T1-T6 合法性（由 Schema 保证）
 */
import {
  CATEGORIES,
  GROUPS,
  PLANNED_TOTAL_TOOLS,
  TOOLS,
  categoriesOfGroup,
} from '@toolbox/catalog'
import { validateTool } from '@toolbox/catalog/schema'

let failures = 0

function fail(message: string): void {
  failures += 1
  console.error(`  ✗ ${message}`)
}

console.log('=== 1. 真源表校验 ===')
if (PLANNED_TOTAL_TOOLS !== 870) {
  fail(`20 域规划工具总数应为 870，实际 ${PLANNED_TOTAL_TOOLS}`)
} else {
  console.log(`  ✓ 20 域合计 ${PLANNED_TOTAL_TOOLS}`)
}

const expectedGroupCount: Record<string, number> = {
  dev: 360,
  design: 200,
  office: 60,
  life: 250,
}
for (const group of GROUPS) {
  const total = categoriesOfGroup(group.id).reduce((sum, c) => sum + c.plannedTools, 0)
  const expected = expectedGroupCount[group.id] ?? 0
  if (total !== expected) {
    fail(`大组 ${group.id} 工具数应为 ${expected}，实际 ${total}`)
  } else {
    console.log(`  ✓ ${group.id} = ${total}`)
  }
}

if (CATEGORIES.length !== 20) {
  fail(`域数量应为 20，实际 ${CATEGORIES.length}`)
} else {
  console.log('  ✓ 域数量 20')
}

console.log('=== 2. 工具元数据契约 ===')
console.log(`  已注册 ${TOOLS.length} 个工具`)

const seen = new Set<string>()
for (const tool of TOOLS) {
  const errors = validateTool(tool)
  if (errors.length) {
    fail(`[${tool.id}] 元数据不合法：`)
    for (const error of errors) fail(`      - ${error}`)
    continue
  }
  if (seen.has(tool.slug)) {
    fail(`[${tool.id}] slug 重复：${tool.slug}`)
  }
  seen.add(tool.slug)
  console.log(`  ✓ ${tool.id} (${tool.category}/${tool.group} ${tool.priority}${tool.feasibility} ${tool.template})`)
}

console.log('=== 结果 ===')
if (failures > 0) {
  console.error(`校验失败：${failures} 项`)
  process.exit(1)
}
console.log('全部通过 ✅')
