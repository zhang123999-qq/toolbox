import type { ToolMeta } from '@toolbox/catalog'

/**
 * binary-viewer —— 全局编号 #190
 * 域：encoding（编码 / 加密 / 安全）｜大组：dev｜优先级：P2｜可行性：A｜模板：T2
 * 来源：docs/tools/03-数据格式.md
 */
export const meta: ToolMeta = {
  id: 'binary-viewer',
  slug: 'binary-viewer',
  title: '二进制查看',
  description: '以十六进制 + ASCII 双栏方式查看文件字节，统计字节分布，也支持把 hex 文本还原',
  titleEn: 'Binary Viewer',
  descriptionEn: 'Hex + ASCII dump of file bytes with statistics, or restore bytes pasted as hex',

  category: 'encoding',
  group: 'dev',
  tags: ['binary', 'hex', 'file'],

  priority: 'P2',
  feasibility: 'A',
  template: 'T2',

  inputs: ['text', 'file'],
  outputs: ['text'],
  options: ['direction', 'columns'],

  deps: [],
  worker: false,
  wasm: false,
  api: false,
}
