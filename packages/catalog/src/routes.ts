import type { ToolMeta } from './types'
import { TOOLS } from './tools.generated'

/** 工具页路由（/tools/:slug） */
export interface ToolRoute {
  readonly path: string
  readonly tool: ToolMeta
}

/**
 * 路由由 catalog 生成，禁止手写。
 * 见 DEVELOPMENT.md 红线第 1 条。
 */
export const TOOL_ROUTES: readonly ToolRoute[] = TOOLS.map((tool) => ({
  path: `/tools/${tool.slug}`,
  tool,
}))

export function matchToolRoute(slug: string): ToolMeta | undefined {
  return TOOLS.find((t) => t.slug === slug)
}
