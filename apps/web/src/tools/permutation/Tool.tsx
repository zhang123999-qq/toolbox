import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { transform } from './utils'
import type { PermutationInput, PermutationOptions } from './schema'

/** 示例：从 10 个里取 3 个 */
const EXAMPLE: PermutationInput = { text: '10', k: '3' }

export default function Tool() {
  const t = useTranslate()
  return (
    <TwoColumn<PermutationInput, PermutationOptions>
      meta={meta}
      initialInput={{ text: '', k: '' }}
      initialOptions={{}}
      run={transform}
      example={EXAMPLE}
      extraInputs={[{ key: 'k', label: t('tool.kValue'), rows: 1 }]}
    />
  )
}
