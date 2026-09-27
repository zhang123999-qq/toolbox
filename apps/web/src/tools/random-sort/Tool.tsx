import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { RandomSortInput, RandomSortOptions } from './schema'

/** 示例：4 人出场顺序 */
const EXAMPLE: RandomSortInput = { text: '张三\n李四\n王五\n赵六' }

export default function Tool() {
  return (
    <TwoColumn<RandomSortInput, RandomSortOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{}}
      run={(input, options) => transform(input, options)}
      example={EXAMPLE}
    />
  )
}
