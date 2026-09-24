import type { SymbolsInput, SymbolsOptions } from './schema'

/** 一个符号条目：字符、分类、名称、搜索关键词 */
export interface SymbolItem {
  readonly char: string
  readonly group: string
  readonly name: string
  readonly keywords: string
}

/** 内置符号表：按用途分组，覆盖数学、箭头、货币、制表等常见需求 */
export const SYMBOLS: readonly SymbolItem[] = [
  { char: '＋', group: 'math', name: '全角加号', keywords: 'plus 加 加号' },
  { char: '－', group: 'math', name: '全角减号', keywords: 'minus 减 减号' },
  { char: '×', group: 'math', name: '乘号', keywords: 'multiply 乘 times' },
  { char: '÷', group: 'math', name: '除号', keywords: 'divide 除' },
  { char: '±', group: 'math', name: '正负号', keywords: 'plus minus 正负' },
  { char: '≈', group: 'math', name: '约等于', keywords: 'approx 约等于' },
  { char: '≠', group: 'math', name: '不等于', keywords: 'not equal 不等于' },
  { char: '≤', group: 'math', name: '小于等于', keywords: 'less equal 小于等于' },
  { char: '≥', group: 'math', name: '大于等于', keywords: 'greater equal 大于等于' },
  { char: '∞', group: 'math', name: '无穷', keywords: 'infinity 无穷' },
  { char: '√', group: 'math', name: '根号', keywords: 'sqrt 根号 平方根' },
  { char: '∑', group: 'math', name: '求和', keywords: 'sum 求和 sigma' },
  { char: '∏', group: 'math', name: '求积', keywords: 'product 连乘' },
  { char: '∫', group: 'math', name: '积分', keywords: 'integral 积分' },
  { char: '∂', group: 'math', name: '偏导', keywords: 'partial 偏微分' },
  { char: '△', group: 'math', name: '三角形', keywords: 'triangle 三角' },
  { char: '°', group: 'math', name: '度', keywords: 'degree 度' },
  { char: '∠', group: 'math', name: '角', keywords: 'angle 角' },
  { char: '⊥', group: 'math', name: '垂直', keywords: 'perpendicular 垂直' },
  { char: '∥', group: 'math', name: '平行', keywords: 'parallel 平行' },
  { char: '←', group: 'arrow', name: '左箭头', keywords: 'left arrow 箭头 左' },
  { char: '→', group: 'arrow', name: '右箭头', keywords: 'right arrow 箭头 右' },
  { char: '↑', group: 'arrow', name: '上箭头', keywords: 'up arrow 箭头 上' },
  { char: '↓', group: 'arrow', name: '下箭头', keywords: 'down arrow 箭头 下' },
  { char: '↔', group: 'arrow', name: '左右箭头', keywords: 'left right arrow 双向' },
  { char: '↕', group: 'arrow', name: '上下箭头', keywords: 'up down arrow 双向' },
  { char: '⇐', group: 'arrow', name: '左双线箭头', keywords: 'left double arrow 推出' },
  { char: '⇒', group: 'arrow', name: '右双线箭头', keywords: 'right double arrow 推出 implies' },
  { char: '⇄', group: 'arrow', name: '左右双线', keywords: 'swap 交换 双向' },
  { char: '↩', group: 'arrow', name: '回车箭头', keywords: 'enter return 返回' },
  { char: '¥', group: 'currency', name: '人民币', keywords: 'yuan cny rmb 元 人民币' },
  { char: '￥', group: 'currency', name: '全角人民币', keywords: 'yuan 元 全角' },
  { char: '$', group: 'currency', name: '美元', keywords: 'dollar usd 美元' },
  { char: '€', group: 'currency', name: '欧元', keywords: 'euro eur 欧元' },
  { char: '£', group: 'currency', name: '英镑', keywords: 'pound gbp 英镑' },
  { char: '₩', group: 'currency', name: '韩元', keywords: 'won krw 韩元' },
  { char: '₽', group: 'currency', name: '卢布', keywords: 'ruble rub 卢布' },
  { char: '¢', group: 'currency', name: '分', keywords: 'cent 分' },
  { char: '°', group: 'unit', name: '度', keywords: 'degree 温度 度' },
  { char: '℃', group: 'unit', name: '摄氏度', keywords: 'celsius 温度 摄氏' },
  { char: '℉', group: 'unit', name: '华氏度', keywords: 'fahrenheit 温度 华氏' },
  { char: '′', group: 'unit', name: '分（角分）', keywords: 'prime 角分' },
  { char: '″', group: 'unit', name: '秒（角秒）', keywords: 'double prime 角秒' },
  { char: '№', group: 'unit', name: '编号', keywords: 'numero number 编号' },
  { char: '℡', group: 'unit', name: '电话', keywords: 'tel 电话' },
  { char: '™', group: 'unit', name: '商标', keywords: 'trademark 商标' },
  { char: '©', group: 'unit', name: '版权', keywords: 'copyright 版权' },
  { char: '®', group: 'unit', name: '注册商标', keywords: 'registered 注册商标' },
  { char: '…', group: 'punct', name: '省略号', keywords: 'ellipsis 省略号 省略' },
  { char: '·', group: 'punct', name: '间隔号', keywords: 'dot 中点 间隔号' },
  { char: '—', group: 'punct', name: '破折号', keywords: 'em dash 破折号' },
  { char: '–', group: 'punct', name: '连接号', keywords: 'en dash 连接号' },
  { char: '「', group: 'punct', name: '左引号', keywords: 'quote 引号 左' },
  { char: '」', group: 'punct', name: '右引号', keywords: 'quote 引号 右' },
  { char: '『', group: 'punct', name: '左双引号', keywords: 'quote 双引号 左' },
  { char: '』', group: 'punct', name: '右双引号', keywords: 'quote 双引号 右' },
  { char: '《', group: 'punct', name: '左书名号', keywords: 'book title 书名号 左' },
  { char: '》', group: 'punct', name: '右书名号', keywords: 'book title 书名号 右' },
  { char: '─', group: 'box', name: '横线', keywords: 'box drawing 制表 横' },
  { char: '│', group: 'box', name: '竖线', keywords: 'box drawing 制表 竖' },
  { char: '┌', group: 'box', name: '左上拐角', keywords: 'box drawing 制表 角' },
  { char: '┐', group: 'box', name: '右上拐角', keywords: 'box drawing 制表 角' },
  { char: '└', group: 'box', name: '左下拐角', keywords: 'box drawing 制表 角' },
  { char: '┘', group: 'box', name: '右下拐角', keywords: 'box drawing 制表 角' },
  { char: '├', group: 'box', name: '左 T 形', keywords: 'box drawing 制表 T' },
  { char: '┤', group: 'box', name: '右 T 形', keywords: 'box drawing 制表 T' },
  { char: '★', group: 'star', name: '实心星', keywords: 'star 星 实心' },
  { char: '☆', group: 'star', name: '空心星', keywords: 'star 星 空心' },
  { char: '✦', group: 'star', name: '四角星', keywords: 'star 星 闪光' },
  { char: '✧', group: 'star', name: '空心四角星', keywords: 'star 星 闪光' },
  { char: '✪', group: 'star', name: '圆内星', keywords: 'star 星 圆' },
  { char: '✓', group: 'check', name: '对勾', keywords: 'check 对 勾 完成' },
  { char: '✔', group: 'check', name: '粗对勾', keywords: 'check 对 完成' },
  { char: '✗', group: 'check', name: '叉', keywords: 'cross 错 叉 失败' },
  { char: '✘', group: 'check', name: '粗叉', keywords: 'cross 错 失败' },
  { char: '☐', group: 'check', name: '空方框', keywords: 'checkbox 复选框 空' },
  { char: '☑', group: 'check', name: '勾选框', keywords: 'checkbox 复选框 勾' },
  { char: '①', group: 'number', name: '圈一', keywords: 'circled one 序号 圈' },
  { char: '②', group: 'number', name: '圈二', keywords: 'circled two 序号 圈' },
  { char: '③', group: 'number', name: '圈三', keywords: 'circled three 序号 圈' },
  { char: '½', group: 'number', name: '二分之一', keywords: 'half 分数 一半' },
  { char: '¼', group: 'number', name: '四分之一', keywords: 'quarter 分数' },
  { char: '¾', group: 'number', name: '四分之三', keywords: 'three quarters 分数' },
  { char: '‰', group: 'number', name: '千分号', keywords: 'permille 千分号' },
  { char: 'α', group: 'greek', name: '阿尔法', keywords: 'alpha 希腊 阿尔法' },
  { char: 'β', group: 'greek', name: '贝塔', keywords: 'beta 希腊 贝塔' },
  { char: 'γ', group: 'greek', name: '伽马', keywords: 'gamma 希腊 伽马' },
  { char: 'δ', group: 'greek', name: '德尔塔', keywords: 'delta 希腊 德尔塔' },
  { char: 'θ', group: 'greek', name: '西塔', keywords: 'theta 希腊 西塔' },
  { char: 'λ', group: 'greek', name: '兰姆达', keywords: 'lambda 希腊 兰姆达' },
  { char: 'μ', group: 'greek', name: '缪', keywords: 'mu 希腊 微' },
  { char: 'π', group: 'greek', name: '派', keywords: 'pi 圆周率 希腊' },
  { char: 'σ', group: 'greek', name: '西格玛', keywords: 'sigma 希腊 西格玛' },
  { char: 'ω', group: 'greek', name: '欧米伽', keywords: 'omega 希腊 欧米伽' },
  { char: 'Ⅰ', group: 'roman', name: '罗马数字 1', keywords: 'roman one 罗马 一' },
  { char: 'Ⅱ', group: 'roman', name: '罗马数字 2', keywords: 'roman two 罗马 二' },
  { char: 'Ⅲ', group: 'roman', name: '罗马数字 3', keywords: 'roman three 罗马 三' },
  { char: 'Ⅳ', group: 'roman', name: '罗马数字 4', keywords: 'roman four 罗马 四' },
  { char: 'Ⅴ', group: 'roman', name: '罗马数字 5', keywords: 'roman five 罗马 五' },
  { char: 'Ⅹ', group: 'roman', name: '罗马数字 10', keywords: 'roman ten 罗马 十' },
]

/** 按关键词与分类过滤；关键词为空时返回该分类全部 */
export function search(keyword: string, category: string): SymbolItem[] {
  const needle = keyword.trim().toLowerCase()
  return SYMBOLS.filter((item) => {
    if (category !== 'all' && item.group !== category) return false
    if (needle === '') return true
    return (
      item.char === keyword.trim() ||
      item.name.includes(needle) ||
      item.keywords.toLowerCase().includes(needle)
    )
  })
}

/** 纯文本版本：每行一个符号，供复制与下载 */
export function symbolText(input: SymbolsInput, options: SymbolsOptions): string {
  return search(input.text, options.category)
    .map((item) => item.char)
    .join('')
}
