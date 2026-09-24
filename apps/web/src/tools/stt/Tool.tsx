import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { report, unsupportedText } from './utils'
import type { SttInput, SttOptions } from './schema'

const EXAMPLE: SttInput = { text: '' }

/** 语音识别：浏览器 API 只能在组件里调，utils 保持纯函数 */
function recognize(lang: string): Promise<{ transcript: string; confidence: number }> {
  // 各家浏览器挂的位置不一致，且 TS 的 DOM lib 未必声明，统一按未知属性取
  const scope = window as unknown as {
    SpeechRecognition?: unknown
    webkitSpeechRecognition?: unknown
  }
  const Ctor = scope.SpeechRecognition ?? scope.webkitSpeechRecognition
  if (typeof Ctor !== 'function') {
    return Promise.reject(new Error(unsupportedText()))
  }
  return new Promise((resolve, reject) => {
    const recognition = new (Ctor as new () => SpeechRecognitionLike)()
    recognition.lang = lang
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const first = event.results[0]?.[0]
      if (!first) {
        reject(new Error('没有识别到内容'))
        return
      }
      resolve({ transcript: first.transcript, confidence: first.confidence })
    }
    recognition.onerror = (event: { error: string }) => {
      reject(new Error('识别失败：' + event.error))
    }
    recognition.onend = () => {
      // 有结果时 onresult 已先触发并 resolve，这里的 reject 不会生效
      reject(new Error('没有识别到内容'))
    }
    recognition.start()
  })
}

/** 只用到 Web Speech 的一小部分，这里给出最小接口，避免依赖 DOM lib 的完整定义 */
interface SpeechRecognitionEventLike {
  readonly results: readonly (readonly {
    readonly transcript: string
    readonly confidence: number
  }[])[]
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<SttOptions>[] = [
    {
      key: 'language',
      label: t('option.language'),
      kind: 'select',
      values: ['zh-CN', 'en-US', 'ja-JP'],
    },
  ]

  return (
    <TwoColumn<SttInput, SttOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ language: 'zh-CN' }}
      runAsync={async (_input, options) => {
        // 语音识别不需要输入文本：输入框留空即可，语言由选项决定
        const result = await recognize(options.language)
        return report(result.transcript, options, result.confidence)
      }}
      idleText={'点「运行」后开始聆听'}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
