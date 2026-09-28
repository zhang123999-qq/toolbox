/**
 * read-aloud（#740）utils 单测：全部用 mock SpeechLike，不碰真实 speechSynthesis。
 */
import { describe, expect, it } from 'vitest'
import {
  buildQueue,
  defaultSpeechImpl,
  filterChineseVoices,
  listVoices,
  speakText,
  splitSentences,
  stopSpeaking,
  validateSpeechOptions,
  type SpeechLike,
  type UtteranceLike,
  type VoiceInfo,
} from './utils'

function mockSpeech(
  voices: VoiceInfo[] = [],
): SpeechLike & { spoken: UtteranceLike[]; cancelled: number } {
  const spoken: UtteranceLike[] = []
  return {
    spoken,
    cancelled: 0,
    speak: (u: UtteranceLike) => {
      spoken.push(u)
    },
    cancel() {
      this.cancelled += 1
    },
    getVoices: () => voices,
    speaking: false,
  }
}

const VOICES: VoiceInfo[] = [
  {
    name: 'Google US English',
    lang: 'en-US',
    voiceURI: 'en',
    localService: false,
    isDefault: false,
  },
  { name: '中文（普通话）', lang: 'zh-CN', voiceURI: 'zh', localService: true, isDefault: true },
]

describe('validateSpeechOptions', () => {
  it('默认值补全', () => {
    const v = validateSpeechOptions({ rate: 1, pitch: 1, volume: 1 })
    expect(v.lang).toBe('zh-CN')
    expect(v.voiceURI).toBeUndefined()
  })
  it('空字符串视为未设置', () => {
    const v = validateSpeechOptions({ rate: 1, pitch: 1, volume: 1, lang: '  ', voiceURI: ' ' })
    expect(v.lang).toBe('zh-CN')
    expect(v.voiceURI).toBeUndefined()
  })
  it('自定义值保留', () => {
    const v = validateSpeechOptions({
      rate: 1.5,
      pitch: 0.8,
      volume: 0.5,
      lang: 'en-US',
      voiceURI: 'x',
    })
    expect(v).toMatchObject({ rate: 1.5, pitch: 0.8, volume: 0.5, lang: 'en-US', voiceURI: 'x' })
  })
  it('越界抛中文错', () => {
    expect(() => validateSpeechOptions({ rate: 0, pitch: 1, volume: 1 })).toThrow('语速超出范围')
    expect(() => validateSpeechOptions({ rate: 1, pitch: 3, volume: 1 })).toThrow('音调超出范围')
    expect(() => validateSpeechOptions({ rate: 1, pitch: 1, volume: 2 })).toThrow('音量超出范围')
    expect(() => validateSpeechOptions({ rate: NaN, pitch: 1, volume: 1 })).toThrow(
      '语速必须是数字',
    )
  })
  it('边界值通过', () => {
    expect(() => validateSpeechOptions({ rate: 0.1, pitch: 0, volume: 0 })).not.toThrow()
    expect(() => validateSpeechOptions({ rate: 10, pitch: 2, volume: 1 })).not.toThrow()
  })
})

describe('splitSentences', () => {
  it('空文本抛错', () => {
    expect(() => splitSentences('   ')).toThrow('请输入要朗读的文本')
  })
  it('按中文标点分句并保留标点', () => {
    expect(splitSentences('你好。世界！测试？')).toEqual(['你好。', '世界！', '测试？'])
  })
  it('按英文标点与换行分句', () => {
    expect(splitSentences('Hello. World!\nNew line')).toEqual(['Hello.', 'World!', 'New line'])
  })
  it('无标点为单句', () => {
    expect(splitSentences('只有一句话')).toEqual(['只有一句话'])
  })
  it('连续空行被过滤', () => {
    expect(splitSentences('第一句。\n\n第二句。')).toEqual(['第一句。', '第二句。'])
  })
})

describe('buildQueue', () => {
  it('每句生成一个 utterance 并携带参数', () => {
    const q = buildQueue('你好。世界。', { rate: 1.2, pitch: 0.9, volume: 0.8, lang: 'zh-TW' })
    expect(q).toHaveLength(2)
    expect(q[0]).toMatchObject({
      text: '你好。',
      lang: 'zh-TW',
      rate: 1.2,
      pitch: 0.9,
      volume: 0.8,
    })
  })
  it('空文本抛错', () => {
    expect(() => buildQueue('  ', { rate: 1, pitch: 1, volume: 1 })).toThrow('请输入要朗读的文本')
  })
})

describe('speakText', () => {
  it('先 cancel 再按顺序 speak，返回句数', () => {
    const impl = mockSpeech()
    const n = speakText('第一句。第二句。', { rate: 1, pitch: 1, volume: 1 }, impl)
    expect(n).toBe(2)
    expect(impl.cancelled).toBe(1)
    expect(impl.spoken.map((u) => u.text)).toEqual(['第一句。', '第二句。'])
  })
  it('空文本抛错且不调用 speak', () => {
    const impl = mockSpeech()
    expect(() => speakText('  ', { rate: 1, pitch: 1, volume: 1 }, impl)).toThrow('请输入要朗读')
    expect(impl.spoken).toHaveLength(0)
  })
})

describe('stopSpeaking', () => {
  it('调用 cancel', () => {
    const impl = mockSpeech()
    stopSpeaking(impl)
    expect(impl.cancelled).toBe(1)
  })
})

describe('listVoices', () => {
  it('中文语音排前面', () => {
    const list = listVoices(mockSpeech(VOICES))
    expect(list[0]?.lang).toBe('zh-CN')
    expect(list).toHaveLength(2)
  })
  it('反序输入同样中文优先', () => {
    const list = listVoices(mockSpeech([...VOICES].reverse()))
    expect(list[0]?.lang).toBe('zh-CN')
    expect(list[1]?.lang).toBe('en-US')
  })
  it('无语音返回空数组', () => {
    expect(listVoices(mockSpeech())).toEqual([])
  })
})

describe('filterChineseVoices', () => {
  it('只保留 zh 开头', () => {
    const zh = filterChineseVoices(VOICES)
    expect(zh).toHaveLength(1)
    expect(zh[0]?.name).toBe('中文（普通话）')
  })
  it('大小写不敏感', () => {
    expect(
      filterChineseVoices([
        { name: 'x', lang: 'ZH-HK', voiceURI: 'v', localService: true, isDefault: false },
      ]),
    ).toHaveLength(1)
  })
  it('空列表返回空', () => {
    expect(filterChineseVoices([])).toEqual([])
  })
})

describe('未注入 impl 时走默认实现（?? 回退分支）', () => {
  it('speakText / stopSpeaking / listVoices 使用默认实现', () => {
    const spoken: string[] = []
    class UtteranceStub {
      text: string
      lang = ''
      rate = 1
      pitch = 1
      volume = 1
      voice: unknown
      constructor(text: string) {
        this.text = text
      }
    }
    const g = globalThis as unknown as Record<string, unknown>
    g.window = {
      speechSynthesis: {
        speak: (u: { text: string }) => {
          spoken.push(u.text)
        },
        cancel: () => undefined,
        getVoices: () => [],
        speaking: false,
      },
    }
    g.SpeechSynthesisUtterance = UtteranceStub
    try {
      const n = speakText('你好。世界。', { rate: 1, pitch: 1, volume: 1 })
      expect(n).toBe(2)
      expect(spoken).toEqual(['你好。', '世界。'])
      stopSpeaking()
      expect(listVoices()).toEqual([])
    } finally {
      delete g.window
      delete g.SpeechSynthesisUtterance
    }
  })
})

describe('defaultSpeechImpl', () => {
  it('无 window.speechSynthesis 时抛中文错', () => {
    // node 环境下 window 未定义（本文件未启用 jsdom）
    expect(() => defaultSpeechImpl()).toThrow('当前浏览器不支持语音朗读')
  })
  it('有 speechSynthesis 时封装为 SpeechLike（用全局桩，不碰真实实现）', () => {
    const spoken: string[] = []
    const voiceStub = {
      name: '中文',
      lang: 'zh-CN',
      voiceURI: 'v1',
      localService: true,
      default: true,
    }
    const synthStub = {
      speak: (u: { text: string }) => {
        spoken.push(u.text)
      },
      cancel: () => {
        spoken.push('[cancel]')
      },
      getVoices: () => [voiceStub],
      speaking: true,
    }
    class UtteranceStub {
      text: string
      lang = ''
      rate = 1
      pitch = 1
      volume = 1
      voice: unknown
      constructor(text: string) {
        this.text = text
      }
    }
    const g = globalThis as unknown as Record<string, unknown>
    g.window = { speechSynthesis: synthStub }
    g.SpeechSynthesisUtterance = UtteranceStub
    try {
      const impl = defaultSpeechImpl()
      // 指定存在的 voiceURI
      impl.speak({ text: '你好', lang: 'zh-CN', rate: 1, pitch: 1, volume: 1, voiceURI: 'v1' })
      // 不指定 voiceURI
      impl.speak({ text: '再见', lang: 'zh-CN', rate: 1, pitch: 1, volume: 1 })
      // 指定不存在的 voiceURI（不挂 voice 也照常朗读）
      impl.speak({ text: '测试', lang: 'zh-CN', rate: 1, pitch: 1, volume: 1, voiceURI: 'nope' })
      expect(spoken).toEqual(['你好', '再见', '测试'])
      impl.cancel()
      expect(spoken[3]).toBe('[cancel]')
      const voices = impl.getVoices()
      expect(voices).toHaveLength(1)
      expect(voices[0]).toMatchObject({
        name: '中文',
        lang: 'zh-CN',
        voiceURI: 'v1',
        localService: true,
        isDefault: true,
      })
      expect(impl.speaking).toBe(true)
    } finally {
      delete g.window
      delete g.SpeechSynthesisUtterance
    }
  })
})
