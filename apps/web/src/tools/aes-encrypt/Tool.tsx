import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { AesInput, AesOptions } from './schema'

/** 示例：AES-128 的密钥恰好 16 字节；GCM 的 IV 留空可自动生成随机 IV */
const EXAMPLE: AesInput = { text: '这是一段需要加密的明文。', key: 'aeskey0123456789', iv: '' }

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<AesOptions>[] = [
    { key: 'method', label: t('option.method'), kind: 'select', values: ['GCM', 'CBC'] },
    { key: 'bits', label: t('option.bits'), kind: 'select', values: ['128', '192', '256'] },
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
  ]

  return (
    <TwoColumn<AesInput, AesOptions>
      meta={meta}
      initialInput={{ text: '', key: '', iv: '' }}
      initialOptions={{ method: 'GCM', bits: '128', direction: 'encrypt', encoding: 'utf8' }}
      runAsync={transform}
      idleText={'点「运行」后结果出现在这里'}
      example={EXAMPLE}
      optionDefs={optionDefs}
      extraInputs={[
        { key: 'key', label: t('option.key'), rows: 1 },
        { key: 'iv', label: t('option.iv'), rows: 1 },
      ]}
    />
  )
}
