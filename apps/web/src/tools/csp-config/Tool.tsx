import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { CspConfigInput, CspConfigOptions } from './schema'

const EXAMPLE: CspConfigInput = { text: 'generate' }

const PRESET_VALUES = ['self', 'none', 'all', 'self-inline', 'data'] as const

export default function Tool() {
  const optionDefs: readonly OptionDef<CspConfigOptions>[] = [
    { key: 'defaultSrc', label: 'default-src', kind: 'select', values: [...PRESET_VALUES] },
    { key: 'scriptSrc', label: 'script-src', kind: 'select', values: [...PRESET_VALUES] },
    { key: 'styleSrc', label: 'style-src', kind: 'select', values: [...PRESET_VALUES] },
    { key: 'imgSrc', label: 'img-src', kind: 'select', values: [...PRESET_VALUES] },
    { key: 'connectSrc', label: 'connect-src', kind: 'select', values: [...PRESET_VALUES] },
    { key: 'fontSrc', label: 'font-src', kind: 'select', values: [...PRESET_VALUES] },
    { key: 'frameSrc', label: 'frame-src', kind: 'select', values: [...PRESET_VALUES] },
    { key: 'mediaSrc', label: 'media-src', kind: 'select', values: [...PRESET_VALUES] },
    { key: 'objectSrc', label: 'object-src', kind: 'select', values: [...PRESET_VALUES] },
    { key: 'baseUri', label: 'base-uri', kind: 'select', values: ['self', 'none', 'all'] },
    { key: 'formAction', label: 'form-action', kind: 'select', values: ['self', 'none', 'all'] },
    {
      key: 'frameAncestors',
      label: 'frame-ancestors',
      kind: 'select',
      values: ['self', 'none', 'all'],
    },
    { key: 'upgradeInsecure', label: '升级 HTTPS', kind: 'boolean' },
    { key: 'reportOnly', label: '仅上报', kind: 'boolean' },
  ]

  return (
    <TwoColumn<CspConfigInput, CspConfigOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{
        defaultSrc: 'self',
        scriptSrc: 'self',
        styleSrc: 'self',
        imgSrc: 'data',
        connectSrc: 'self',
        fontSrc: 'self',
        frameSrc: 'self',
        mediaSrc: 'self',
        objectSrc: 'none',
        baseUri: 'self',
        formAction: 'self',
        frameAncestors: 'none',
        upgradeInsecure: true,
        reportOnly: false,
      }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
