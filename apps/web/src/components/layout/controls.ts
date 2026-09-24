/**
 * 偏好控件（语言 / 主题）的统一外观
 *
 * 抽成常量而不是组件，是因为两者的语义差别大（分段控件 vs 开关按钮），
 * 但外观必须一致：同高（h-8）、同圆角、同边框色，桌面与移动端同一套。
 * 颜色成对给出明暗两版，避免各处漏写 dark: 变体。
 */
export const CONTROL_BASE =
  'inline-flex h-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'

/** 方形图标按钮（主题开关） */
export const CONTROL_ICON_BUTTON = `${CONTROL_BASE} w-8 shrink-0 p-0`

/**
 * 分段控件外壳（语言切换）
 * 与图标按钮同高同边框，但不带 hover 底色——底色变化应发生在单段上，
 * 否则鼠标划过整组时会整体变色。
 */
export const CONTROL_GROUP =
  'inline-flex h-8 shrink-0 items-center overflow-hidden rounded-md border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900'

/** 分段控件里的单段（语言切换） */
export const CONTROL_SEGMENT =
  'inline-flex h-full items-center px-2 text-xs font-medium transition focus-visible:outline-2'

/** 分段控件中「当前选中」的样式 */
export const CONTROL_SEGMENT_ACTIVE =
  'bg-brand text-white dark:bg-brand dark:text-white'

export const CONTROL_SEGMENT_IDLE =
  'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800'
