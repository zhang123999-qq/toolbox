import type { GroupDef, GroupId } from './types'

/**
 * 4 大组定义（用户心智分组）
 * 工具数来源：docs/catalog/README.md「大组归属汇总」
 */
export const GROUPS: readonly GroupDef[] = [
  { id: 'dev', name: '开发编码', description: '文本、编码、数据格式、运维、时间、网络' },
  { id: 'design', name: '设计媒体', description: '随机设计、图片、音视频、可视化、游戏' },
  { id: 'office', name: '办公文档', description: 'PDF 与 Office 文档处理' },
  { id: 'life', name: '生活学习', description: '数学、AI、Web3、无障碍、自动化、扩展、边缘、教育' },
]

const GROUP_MAP: ReadonlyMap<GroupId, GroupDef> = new Map(GROUPS.map((g) => [g.id, g]))

export function getGroup(id: GroupId): GroupDef {
  const group = GROUP_MAP.get(id)
  if (!group) throw new Error(`[catalog] 未知大组: ${id}`)
  return group
}
