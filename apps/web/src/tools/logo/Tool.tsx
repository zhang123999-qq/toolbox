import { useState } from 'react'
import { MultiPanel } from '../../components/tool/templates/MultiPanel'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { buildLogoSvg, randomSeed } from './utils'
import type { LogoInput, LogoOptions } from './schema'

/** 示例品牌名 */
const EXAMPLE: LogoInput = { text: 'Acme' }

const ERROR_CLASS =
  'rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300'

export default function Tool() {
  const [seed] = useState(() => randomSeed())

  const optionDefs: readonly OptionDef<LogoOptions>[] = [
    {
      key: 'style',
      label: '风格',
      kind: 'select',
      values: ['minimal', 'gradient', 'geometric', 'badge'],
    },
    { key: 'primaryColor', label: '主色', kind: 'text', placeholder: '随机' },
    { key: 'secondaryColor', label: '辅色', kind: 'text', placeholder: '随机' },
    { key: 'iconShape', label: '图标形状', kind: 'select', values: ['circle', 'square', 'none'] },
  ]

  return (
    <MultiPanel<LogoInput, LogoOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        style: 'minimal',
        primaryColor: '',
        secondaryColor: '',
        iconShape: 'circle',
      }}
      example={EXAMPLE}
      optionDefs={optionDefs}
      renderOutput={(input, options) => {
        try {
          const svg = buildLogoSvg(input, options, seed)
          return (
            <div className="flex justify-center p-8">
              <div data-testid="logo-svg" dangerouslySetInnerHTML={{ __html: svg }} />
            </div>
          )
        } catch (error) {
          return (
            <p role="alert" className={ERROR_CLASS}>
              {error instanceof Error ? error.message : String(error)}
            </p>
          )
        }
      }}
      toText={(input, options) => {
        try {
          return buildLogoSvg(input, options, seed)
        } catch {
          return ''
        }
      }}
      downloadExt="svg"
    />
  )
}
