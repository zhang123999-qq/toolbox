import type { VimCheatsheetOptions } from './schema'

interface Command {
  readonly cmd: string
  readonly desc: string
}
interface Section {
  readonly key: string
  readonly title: string
  readonly commands: readonly Command[]
}

export const SECTIONS: readonly Section[] = [
  {
    key: 'motion',
    title: '移动',
    commands: [
      { cmd: 'h j k l', desc: '左下上右' },
      { cmd: 'w / b', desc: '下一个 / 上一个单词' },
      { cmd: '0 / $', desc: '行首 / 行尾' },
      { cmd: 'gg / G', desc: '文件头 / 文件尾' },
      { cmd: 'Ctrl-d / Ctrl-u', desc: '下半屏 / 上半屏翻页' },
      { cmd: '{ / }', desc: '上一段 / 下一段' },
      { cmd: '%', desc: '跳到配对括号' },
    ],
  },
  {
    key: 'edit',
    title: '编辑',
    commands: [
      { cmd: 'i / a', desc: '光标前 / 后插入' },
      { cmd: 'o / O', desc: '下方 / 上方新开一行' },
      { cmd: 'x', desc: '删除字符' },
      { cmd: 'dd', desc: '删除整行' },
      { cmd: 'dw / diw', desc: '删词 / 删光标所在词' },
      { cmd: 'yy / p', desc: '复制行 / 粘贴' },
      { cmd: 'u / Ctrl-r', desc: '撤销 / 重做' },
      { cmd: 'cc / C', desc: '改写整行 / 改到行尾' },
      { cmd: 'r " / s', desc: '替换单字符 / 删除并插入' },
    ],
  },
  {
    key: 'search',
    title: '搜索',
    commands: [
      { cmd: '/text', desc: '向下搜索' },
      { cmd: '?text', desc: '向上搜索' },
      { cmd: 'n / N', desc: '下一个 / 上一个匹配' },
      { cmd: ':%s/old/new/g', desc: '全词替换' },
      { cmd: ':%s/old/new/gc', desc: '逐个确认替换' },
      { cmd: '* / #', desc: '搜索光标所在词（下 / 上）' },
    ],
  },
  {
    key: 'visual',
    title: '可视',
    commands: [
      { cmd: 'v', desc: '字符可视模式' },
      { cmd: 'V', desc: '行可视模式' },
      { cmd: 'Ctrl-v', desc: '块可视模式' },
      { cmd: '>', desc: '缩进右移' },
      { cmd: '<', desc: '缩进左移' },
      { cmd: '~', desc: '大小写切换' },
    ],
  },
  {
    key: 'register',
    title: '寄存器',
    commands: [
      { cmd: '"ayy', desc: '复制到寄存器 a' },
      { cmd: '"ap', desc: '粘贴寄存器 a' },
      { cmd: ':%y+', desc: '复制到系统剪贴板' },
      { cmd: ':reg', desc: '查看寄存器内容' },
    ],
  },
  {
    key: 'window',
    title: '窗口',
    commands: [
      { cmd: ':sp / :vsp', desc: '水平 / 垂直分屏' },
      { cmd: 'Ctrl-w h/j/k/l', desc: '在分屏间移动' },
      { cmd: ':q / :wq', desc: '退出 / 保存退出' },
      { cmd: ':q!', desc: '强制不保存退出' },
      { cmd: ':w file', desc: '另存为' },
      { cmd: ':e file', desc: '打开文件' },
    ],
  },
  {
    key: 'mode',
    title: '模式',
    commands: [
      { cmd: 'Esc / Ctrl-c', desc: '回到普通模式' },
      { cmd: 'v', desc: '进入可视模式' },
      { cmd: ':', desc: '进入命令行模式' },
      { cmd: 'R', desc: '进入替换模式' },
    ],
  },
]

export const CATEGORY_TITLES: Readonly<Record<string, string>> = {
  all: '全部',
  motion: '移动',
  edit: '编辑',
  search: '搜索',
  visual: '可视',
  register: '寄存器',
  window: '窗口',
  mode: '模式',
}

export function assertCategory(category: string): void {
  if (!(category in CATEGORY_TITLES)) throw new Error('不支持的分类：' + category)
}

export function transform(input: { text: string }, options: VimCheatsheetOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  assertCategory(options.category)
  const picked =
    options.category === 'all' ? SECTIONS : SECTIONS.filter((s) => s.key === options.category)
  const out: string[] = []
  for (const s of picked) {
    out.push(`## ${s.title}`, '', '按键 | 说明', '--- | ---')
    for (const c of s.commands) out.push(`${c.cmd} | ${c.desc}`)
    out.push('')
  }
  return out.join('\n').trimEnd()
}
