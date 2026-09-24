import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { emojiText, search } from './utils'
import type { EmojiItem } from './utils'
import { useState } from 'react'
import type { EmojiInput, EmojiOptions } from './schema'

const EXAMPLE: EmojiInput = { text: '笑' }

/** 点击即复制的网格：Emoji 与特殊符号共用 */
function PickGrid({ items }: { items: readonly EmojiItem[] }) {
  const t = useTranslate()
  const [picked, setPicked] = useState<string | null>(null)
  const [note, setNote] = useState<string>('')

  async function pick(item: EmojiItem) {
    setPicked(item.char)
    setNote(item.name)
    try {
      await navigator.clipboard.writeText(item.char)
    } catch {
      // 非安全上下文拿不到剪贴板：至少把字符显示出来，用户可以手动选中
    }
  }

  if (items.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{t('tool.noMatch')}</p>
  }

  return (
    <div>
      <div className="grid grid-cols-6 gap-1 sm:grid-cols-8">
        {items.map((item) => (
          <button
            key={item.char + item.name}
            type="button"
            title={item.name}
            data-testid={'pick-' + item.char}
            className="rounded border border-slate-200 p-1 text-xl leading-none hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            onClick={() => pick(item)}
          >
            {item.char}
          </button>
        ))}
      </div>
      {picked ? (
        <p data-testid="picked" className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          {t('tool.picked')}：{picked + ' · ' + note}
        </p>
      ) : null}
    </div>
  )
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<EmojiOptions>[] = [
    {
      key: 'category',
      label: t('option.category'),
      kind: 'select',
      values: [
        'all',
        'face',
        'hand',
        'nature',
        'food',
        'activity',
        'travel',
        'object',
        'symbol',
        'flag',
      ],
    },
  ]

  return (
    <MultiPanel<EmojiInput, EmojiOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ category: 'all' }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      // 默认按「渲染 HTML 字符串」包裹；工具可用 renderJsx 给出自定义 JSX 表达式
      renderOutput={(input, options) => <PickGrid items={search(input.text, options.category)} />}
      toText={(input, options) => emojiText(input, options)}
      downloadExt="txt"
    />
  )
}
