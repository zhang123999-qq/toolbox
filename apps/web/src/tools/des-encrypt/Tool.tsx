import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { DesInput, DesOptions } from './schema'

/** 示例：DES 的密钥恰好 8 字节、CBC 的 IV 恰好 8 字节，点开即可直接跑通 */
const EXAMPLE: DesInput = { text: '这是一段需要加密的明文。', key: 'deskey01', iv: 'ivvector' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<DesOptions>[] = [
    { key: 'method', label: t('option.method'), kind: 'select', values: ['des', '3des'] },
    { key: 'mode', label: t('option.mode'), kind: 'select', values: ['CBC', 'ECB'] },
    {
      key: 'direction',
      label: t('option.direction'),
      kind: 'select',
      values: ['encrypt', 'decrypt'],
    },
    {
      key: 'encoding',
      label: t('option.encoding'),
      kind: 'select',
      values: ['utf8', 'hex', 'base64'],
    },
    {
      key: 'padding',
      label: t('option.padding'),
      kind: 'select',
      values: ['pkcs7', 'zero', 'none'],
    },
  ]

  return (
    <TwoColumn<DesInput, DesOptions>
      meta={meta}
      initialInput={{ text: '', key: '', iv: '' }}
      initialOptions={{
        method: 'des',
        mode: 'CBC',
        direction: 'encrypt',
        encoding: 'utf8',
        padding: 'pkcs7',
      }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[
        { key: 'key', label: t('option.key'), rows: 1 },
        { key: 'iv', label: t('option.iv'), rows: 1 },
      ]}
    />
  )
}
