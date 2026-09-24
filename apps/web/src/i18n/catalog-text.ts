/**
 * catalog 数据的本地化取词
 *
 * group / category / feasibility 都是**有限枚举**，因此它们的双语名称
 * 放在 i18n 层（见 messages.zh.ts 的注释），catalog 保持纯数据。
 * 工具标题与描述是**逐条内容**，天然属于各工具自己的 meta.ts，
 * 故在 ToolMeta 上加了可选的 titleEn / descriptionEn，缺英文时回落中文。
 */
import type { CategoryId, Feasibility, GroupId, ToolMeta } from '@toolbox/catalog'
import type { Locale, Translate } from './index'

export function groupName(t: Translate, id: GroupId): string {
  return t(`group.${id}.name`)
}

export function groupDescription(t: Translate, id: GroupId): string {
  return t(`group.${id}.desc`)
}

export function categoryName(t: Translate, id: CategoryId): string {
  return t(`category.${id}.name`)
}

export function feasibilityLabel(t: Translate, feasibility: Feasibility): string {
  return t(`feasibility.${feasibility}`)
}

type LocalizedTool = Pick<ToolMeta, 'title' | 'description'> &
  Partial<Pick<ToolMeta, 'titleEn' | 'descriptionEn'>>

export function toolTitle(locale: Locale, tool: LocalizedTool): string {
  return locale === 'en' ? (tool.titleEn ?? tool.title) : tool.title
}

export function toolDescription(locale: Locale, tool: LocalizedTool): string {
  return locale === 'en' ? (tool.descriptionEn ?? tool.description) : tool.description
}
