/**
 * svg-game —— 全局编号 #795
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 *
 * SVG 游戏资源：
 * SPRITE_TEMPLATES 内置 8 种游戏精灵（角色/道具/地形）SVG 模板；
 * renderSpriteTemplate 按 id 与主/副配色渲染完整 SVG 字符串（颜色替换）；
 * listSpriteTemplates 列出模板元信息；renderAllSprites 批量渲染。
 * 与 svg-gen 的定位区分：本工具是参数化的游戏精灵模板库，
 * 非通用图案（点阵/条纹/棋盘）生成器。
 * 无任何运行时依赖。
 */

const HEX_RE = /^#[0-9a-fA-F]{6}$/

/** 精灵分类 */
export type SpriteCategory = '角色' | '道具' | '地形' | '特效'

export interface SpriteColors {
  primary: string
  secondary: string
}

export interface SpriteTemplate {
  id: string
  name: string
  nameEn: string
  category: SpriteCategory
  defaultPrimary: string
  defaultSecondary: string
  /** 用已校验的颜色渲染精灵 SVG 片段（不含外层 svg 标签） */
  render: (primary: string, secondary: string) => string
}

export interface SpriteTemplateInfo {
  id: string
  name: string
  nameEn: string
  category: SpriteCategory
  defaultPrimary: string
  defaultSecondary: string
}

function validateHex(color: string, label: string): void {
  if (!HEX_RE.test(color)) throw new Error(`${label}须为 #rrggbb 格式的颜色`)
}

/** 史莱姆 */
function renderSlime(p: string, s: string): string {
  return [
    `<ellipse cx="32" cy="40" rx="22" ry="18" fill="${p}"/>`,
    `<ellipse cx="24" cy="32" rx="7" ry="5" fill="#ffffff" opacity="0.55"/>`,
    `<circle cx="24" cy="40" r="5" fill="#ffffff"/>`,
    `<circle cx="40" cy="40" r="5" fill="#ffffff"/>`,
    `<circle cx="25" cy="41" r="2.4" fill="#1e293b"/>`,
    `<circle cx="41" cy="41" r="2.4" fill="#1e293b"/>`,
    `<path d="M26 50 Q32 54 38 50" stroke="${s}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  ].join('')
}

/** 金币 */
function renderCoin(p: string, s: string): string {
  return [
    `<circle cx="32" cy="32" r="20" fill="${p}"/>`,
    `<circle cx="32" cy="32" r="15" fill="none" stroke="${s}" stroke-width="3"/>`,
    `<path d="M32 22 L35 29 L42 29 L36.5 33.5 L38.5 41 L32 36.5 L25.5 41 L27.5 33.5 L22 29 L29 29 Z" fill="${s}"/>`,
  ].join('')
}

/** 树 */
function renderTree(p: string, s: string): string {
  return [
    `<rect x="28" y="38" width="8" height="16" rx="2" fill="${s}"/>`,
    `<circle cx="32" cy="26" r="16" fill="${p}"/>`,
    `<circle cx="22" cy="32" r="10" fill="${p}"/>`,
    `<circle cx="42" cy="32" r="10" fill="${p}"/>`,
    `<circle cx="26" cy="20" r="4" fill="#ffffff" opacity="0.35"/>`,
  ].join('')
}

/** 剑 */
function renderSword(p: string, s: string): string {
  return [
    `<polygon points="32,4 38,14 35,44 29,44 26,14" fill="${s}"/>`,
    `<polygon points="32,4 35,14 33,44 29,44 26,14" fill="#ffffff" opacity="0.35"/>`,
    `<rect x="20" y="44" width="24" height="5" rx="2" fill="${p}"/>`,
    `<rect x="29" y="49" width="6" height="10" rx="2" fill="${p}"/>`,
    `<circle cx="32" cy="60" r="3" fill="${s}"/>`,
  ].join('')
}

/** 宝箱 */
function renderChest(p: string, s: string): string {
  return [
    `<rect x="14" y="26" width="36" height="24" rx="3" fill="${p}"/>`,
    `<rect x="14" y="26" width="36" height="10" rx="3" fill="${s}" opacity="0.45"/>`,
    `<rect x="30" y="20" width="4" height="30" fill="${s}" opacity="0.6"/>`,
    `<rect x="27" y="32" width="10" height="9" rx="2" fill="${s}"/>`,
    `<circle cx="32" cy="36.5" r="2" fill="#1e293b"/>`,
  ].join('')
}

/** 红心 */
function renderHeart(p: string, s: string): string {
  return [
    `<path d="M32 54 C16 42 10 30 14 22 C17 15 26 15 32 24 C38 15 47 15 50 22 C54 30 48 42 32 54 Z" fill="${p}"/>`,
    `<ellipse cx="24" cy="26" rx="4" ry="6" fill="${s}" opacity="0.6" transform="rotate(-20 24 26)"/>`,
  ].join('')
}

/** 幽灵 */
function renderGhost(p: string, s: string): string {
  return [
    `<path d="M18 54 L18 30 C18 18 24 10 32 10 C40 10 46 18 46 30 L46 54 L40 48 L34 54 L28 48 L22 54 Z" fill="${p}"/>`,
    `<circle cx="26" cy="28" r="4" fill="#ffffff"/>`,
    `<circle cx="38" cy="28" r="4" fill="#ffffff"/>`,
    `<circle cx="26" cy="28" r="1.8" fill="${s}"/>`,
    `<circle cx="38" cy="28" r="1.8" fill="${s}"/>`,
  ].join('')
}

/** 药水瓶 */
function renderPotion(p: string, s: string): string {
  return [
    `<rect x="28" y="8" width="8" height="8" rx="2" fill="${s}"/>`,
    `<path d="M28 16 L24 28 C18 36 20 48 32 48 C44 48 46 36 40 28 L36 16 Z" fill="${p}" opacity="0.9"/>`,
    `<path d="M24 34 C22 40 26 45 32 45 C38 45 42 40 40 34 Z" fill="${s}"/>`,
    `<rect x="24" y="24" width="4" height="10" rx="2" fill="#ffffff" opacity="0.5"/>`,
  ].join('')
}

export const SPRITE_TEMPLATES: SpriteTemplate[] = [
  {
    id: 'slime',
    name: '史莱姆',
    nameEn: 'Slime',
    category: '角色',
    defaultPrimary: '#4ade80',
    defaultSecondary: '#166534',
    render: renderSlime,
  },
  {
    id: 'ghost',
    name: '幽灵',
    nameEn: 'Ghost',
    category: '角色',
    defaultPrimary: '#e2e8f0',
    defaultSecondary: '#0f172a',
    render: renderGhost,
  },
  {
    id: 'coin',
    name: '金币',
    nameEn: 'Coin',
    category: '道具',
    defaultPrimary: '#fbbf24',
    defaultSecondary: '#b45309',
    render: renderCoin,
  },
  {
    id: 'sword',
    name: '剑',
    nameEn: 'Sword',
    category: '道具',
    defaultPrimary: '#78350f',
    defaultSecondary: '#cbd5e1',
    render: renderSword,
  },
  {
    id: 'chest',
    name: '宝箱',
    nameEn: 'Chest',
    category: '道具',
    defaultPrimary: '#b45309',
    defaultSecondary: '#fbbf24',
    render: renderChest,
  },
  {
    id: 'potion',
    name: '药水',
    nameEn: 'Potion',
    category: '道具',
    defaultPrimary: '#a78bfa',
    defaultSecondary: '#4c1d95',
    render: renderPotion,
  },
  {
    id: 'heart',
    name: '红心',
    nameEn: 'Heart',
    category: '特效',
    defaultPrimary: '#ef4444',
    defaultSecondary: '#fecaca',
    render: renderHeart,
  },
  {
    id: 'tree',
    name: '树',
    nameEn: 'Tree',
    category: '地形',
    defaultPrimary: '#22c55e',
    defaultSecondary: '#78350f',
    render: renderTree,
  },
]

/** 列出全部模板元信息（不含渲染函数） */
export function listSpriteTemplates(): SpriteTemplateInfo[] {
  return SPRITE_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    nameEn: t.nameEn,
    category: t.category,
    defaultPrimary: t.defaultPrimary,
    defaultSecondary: t.defaultSecondary,
  }))
}

/** 按 id 查找模板，未知 id 中文报错 */
export function getSpriteTemplate(id: string): SpriteTemplate {
  const t = SPRITE_TEMPLATES.find((x) => x.id === id)
  if (!t) throw new Error(`未知精灵模板：${id}`)
  return t
}

function resolveColors(t: SpriteTemplate, colors?: Partial<SpriteColors>): SpriteColors {
  const primary = colors?.primary ?? t.defaultPrimary
  const secondary = colors?.secondary ?? t.defaultSecondary
  validateHex(primary, '主色')
  validateHex(secondary, '副色')
  return { primary, secondary }
}

/**
 * 渲染单个精灵为完整 SVG 字符串。
 * colors 可部分覆盖，未提供时用模板默认值。
 */
export function renderSpriteTemplate(id: string, colors?: Partial<SpriteColors>): string {
  const t = getSpriteTemplate(id)
  const { primary, secondary } = resolveColors(t, colors)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">${t.render(primary, secondary)}</svg>`
}

/** 批量渲染全部模板（用于导出预览） */
export function renderAllSprites(
  colors?: Partial<SpriteColors>,
): Array<{ id: string; svg: string }> {
  return SPRITE_TEMPLATES.map((t) => ({ id: t.id, svg: renderSpriteTemplate(t.id, colors) }))
}
