import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { useTranslate } from '../../i18n'
import { meta } from './meta'
import { chunkText, report, voiceLabel } from './utils'
import type { TtsInput, TtsOptions } from './schema'

const EXAMPLE: TtsInput = { text: '这是一段用来试听语音合成效果的中文文本。' }

/** 语音合成：浏览器 API 只能在组件里调，utils 保持纯函数 */
function speak(text: string, rate: number): Promise<string> {
  const synth = window.speechSynthesis
  if (!synth || typeof window.SpeechSynthesisUtterance !== 'function') {
    return Promise.reject(new Error('当前浏览器不支持语音合成（Web Speech API）'))
  }
  return new Promise((resolve, reject) => {
    synth.cancel()
    const chunks = chunkText(text, 200)
    let index = 0
    let voiceName = ''
    const next = () => {
      if (index >= chunks.length) {
        resolve(voiceName)
        return
      }
      const utterance = new window.SpeechSynthesisUtterance(chunks[index])
      utterance.rate = rate
      const picked = synth.getVoices().find((voice) => voice.lang.toLowerCase().startsWith('zh'))
      if (picked) {
        utterance.voice = picked
        if (index === 0) voiceName = voiceLabel(picked.name, picked.lang)
      }
      utterance.onend = () => {
        index += 1
        next()
      }
      utterance.onerror = () => reject(new Error('语音合成失败或被中断'))
      synth.speak(utterance)
    }
    next()
  })
}

export default function Tool() {
  const t = useTranslate()
  // 选项标签随语言变化，故在组件内构造（模块级常量会在切换语言后仍是旧文案）
  const optionDefs: readonly OptionDef<TtsOptions>[] = [
    { key: 'rate', label: t('option.rate'), kind: 'select', values: [0.5, 0.8, 1, 1.5, 2] },
  ]

  return (
    <TwoColumn<TtsInput, TtsOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ rate: '1' }}
      runAsync={async (input, options) => {
        if (input.text.trim() === '') return ''
        return speak(input.text, Number(options.rate) || 1).then((voice) =>
          report(input.text, options, voice),
        )
      }}
      idleText={'点「运行」后开始朗读'}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
