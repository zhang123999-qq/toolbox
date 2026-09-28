/**
 * read-aloud（#740）纯函数：Web Speech 语音朗读封装。
 *
 * 浏览器内置 speechSynthesis 能力，无网络请求；
 * speech 实现可注入（测试用 mock，不碰真实 speechSynthesis）。
 */

export interface SpeechOptions {
  /** 语速 0.1–10 */
  readonly rate: number
  /** 音调 0–2 */
  readonly pitch: number
  /** 音量 0–1 */
  readonly volume: number
  /** 指定 voiceURI（可选） */
  readonly voiceURI?: string
  /** 语言（默认 zh-CN） */
  readonly lang?: string
}

export interface VoiceInfo {
  readonly name: string
  readonly lang: string
  readonly voiceURI: string
  readonly localService: boolean
  readonly isDefault: boolean
}

export interface UtteranceLike {
  readonly text: string
  readonly lang: string
  readonly rate: number
  readonly pitch: number
  readonly volume: number
  readonly voiceURI?: string
}

/** speechSynthesis 的最小可注入接口 */
export interface SpeechLike {
  speak(utterance: UtteranceLike): void
  cancel(): void
  getVoices(): VoiceInfo[]
  readonly speaking: boolean
}

/** 默认朗读参数 */
export const DEFAULT_SPEECH_OPTIONS: SpeechOptions = {
  rate: 1,
  pitch: 1,
  volume: 1,
  lang: 'zh-CN',
}

function validateNum(value: number, name: string, min: number, max: number): number {
  if (!Number.isFinite(value)) throw new Error(`${name}必须是数字`)
  if (value < min || value > max) throw new Error(`${name}超出范围：${min}–${max}`)
  return value
}

/** 校验朗读参数（补全默认值） */
export function validateSpeechOptions(opts: SpeechOptions): {
  rate: number
  pitch: number
  volume: number
  lang: string
  voiceURI?: string
} {
  const rate = validateNum(opts.rate, '语速', 0.1, 10)
  const pitch = validateNum(opts.pitch, '音调', 0, 2)
  const volume = validateNum(opts.volume, '音量', 0, 1)
  const lang = opts.lang === undefined || opts.lang.trim() === '' ? 'zh-CN' : opts.lang.trim()
  const voiceURI = opts.voiceURI === undefined || opts.voiceURI.trim() === '' ? undefined : opts.voiceURI.trim()
  return { rate, pitch, volume, lang, voiceURI }
}

/**
 * 长文本分句：按中英文句末标点与换行切分，保留标点。
 * 空文本抛中文错。
 */
export function splitSentences(text: string): string[] {
  if (text.trim() === '') throw new Error('请输入要朗读的文本')
  const parts = text.split(/(?<=[。！？；.!?;\n])/)
  return parts.map((p) => p.trim()).filter((p) => p.length > 0)
}

/** 按分句构建朗读队列 */
export function buildQueue(text: string, opts: SpeechOptions): UtteranceLike[] {
  const v = validateSpeechOptions(opts)
  return splitSentences(text).map((sentence) => ({
    text: sentence,
    lang: v.lang,
    rate: v.rate,
    pitch: v.pitch,
    volume: v.volume,
    voiceURI: v.voiceURI,
  }))
}

/** 获取默认 speech 实现；浏览器不支持时抛中文错 */
export function defaultSpeechImpl(): SpeechLike {
  if (typeof window === 'undefined' || window.speechSynthesis === undefined) {
    throw new Error('当前浏览器不支持语音朗读（缺少 speechSynthesis）')
  }
  const synth = window.speechSynthesis
  return {
    speak: (u: UtteranceLike) => {
      const utter = new SpeechSynthesisUtterance(u.text)
      utter.lang = u.lang
      utter.rate = u.rate
      utter.pitch = u.pitch
      utter.volume = u.volume
      if (u.voiceURI !== undefined) {
        const voice = synth.getVoices().find((vv) => vv.voiceURI === u.voiceURI)
        if (voice !== undefined) utter.voice = voice
      }
      synth.speak(utter)
    },
    cancel: () => synth.cancel(),
    getVoices: () =>
      synth.getVoices().map((v) => ({
        name: v.name,
        lang: v.lang,
        voiceURI: v.voiceURI,
        localService: v.localService,
        isDefault: v.default,
      })),
    get speaking() {
      return synth.speaking
    },
  }
}

/**
 * 朗读文本：先停止当前朗读，再按分句依次加入队列
 * （speechSynthesis 原生按调用顺序排队）。
 */
export function speakText(text: string, opts: SpeechOptions, impl?: SpeechLike): number {
  const speech = impl ?? defaultSpeechImpl()
  const queue = buildQueue(text, opts)
  speech.cancel()
  for (const u of queue) speech.speak(u)
  return queue.length
}

/** 停止朗读 */
export function stopSpeaking(impl?: SpeechLike): void {
  const speech = impl ?? defaultSpeechImpl()
  speech.cancel()
}

/** 列出可用语音，中文语音排在前面 */
export function listVoices(impl?: SpeechLike): VoiceInfo[] {
  const speech = impl ?? defaultSpeechImpl()
  const voices = speech.getVoices()
  return [...voices].sort((a, b) => {
    const aZh = a.lang.toLowerCase().startsWith('zh') ? 0 : 1
    const bZh = b.lang.toLowerCase().startsWith('zh') ? 0 : 1
    return aZh - bZh
  })
}

/** 从语音列表中筛选中文语音 */
export function filterChineseVoices(voices: readonly VoiceInfo[]): VoiceInfo[] {
  return voices.filter((v) => v.lang.toLowerCase().startsWith('zh'))
}
