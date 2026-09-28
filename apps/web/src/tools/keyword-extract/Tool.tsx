import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { DEFAULT_TOP_N, extractKeywords, formatKeywords, validateTopN } from './utils'
import type { KeywordExtractInput, KeywordExtractOptions } from './schema'

const EXAMPLE: KeywordExtractInput = {
  text: '人工智能是计算机科学的一个分支，它企图了解智能的实质，并生产出一种新的能以人类智能相似的方式做出反应的智能机器。人工智能研究的主要内容包括知识表示、自动推理和机器学习。',
}

/** 运行入口：TopN 非法时 validateTopN 抛中文错，由 TwoColumn 转为错误态展示 */
function run(input: KeywordExtractInput, options: KeywordExtractOptions): string {
  return formatKeywords(extractKeywords(input.text, validateTopN(options.topN)))
}

export default function Tool() {
  return (
    <TwoColumn<KeywordExtractInput, KeywordExtractOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ topN: String(DEFAULT_TOP_N) }}
      optionDefs={[{ key: 'topN', label: 'TopN（1~100）', kind: 'text', placeholder: '20' }]}
      run={run}
      example={EXAMPLE}
    />
  )
}
