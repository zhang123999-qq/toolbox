/**
 * lib/pipeline 单测。
 *
 * 这些行级原语被 #59 重复行检测、#60 空行处理与 #70 文本工作台共用，
 * 放在 lib 层单独测一次，比只在某个工具的 test.ts 里顺带覆盖更稳：
 * 改了排序口径或步骤解析，这里会先红。
 */
import { describe, expect, it } from 'vitest'
import {
  STEP_HELP,
  applyStep,
  dedupeLines,
  dropEmpty,
  isBlank,
  parseSteps,
  runPipeline,
  sortLines,
  squeezeEmpty,
  stripZeroWidthLines,
} from './pipeline'

describe('pipeline / isBlank', () => {
  it('空串与纯空白都算空行', () => {
    expect(isBlank('')).toBe(true)
    expect(isBlank('   ')).toBe(true)
    expect(isBlank('a')).toBe(false)
  })

  it('CRLF 的行尾 CR 不算内容', () => {
    expect(isBlank('\r')).toBe(true)
  })
})

describe('pipeline / dropEmpty', () => {
  it('删掉空行，保留原顺序', () => {
    expect(dropEmpty(['a', '', 'b', '  ', 'c'])).toEqual(['a', 'b', 'c'])
  })
})

describe('pipeline / squeezeEmpty', () => {
  it('连续空行压成一个，并统一写成真空行', () => {
    expect(squeezeEmpty(['a', '', '', '   ', 'b'])).toEqual(['a', '', 'b'])
  })

  it('开头与结尾的空行同样只留一个', () => {
    expect(squeezeEmpty(['', '', 'a'])).toEqual(['', 'a'])
    expect(squeezeEmpty(['a', '', ''])).toEqual(['a', ''])
  })
})

describe('pipeline / dedupeLines', () => {
  it('只留首次出现', () => {
    expect(dedupeLines(['b', 'a', 'b', 'a'])).toEqual(['b', 'a'])
  })

  it('可按归一化后的 key 去重', () => {
    expect(dedupeLines(['A', ' a ', 'a'], (line) => line.trim().toLowerCase())).toEqual(['A'])
  })
})

describe('pipeline / sortLines', () => {
  it('升序用码点序，不受 locale 影响', () => {
    expect(sortLines(['b', 'a', 'c'])).toEqual(['a', 'b', 'c'])
  })

  it('降序是升序的反序', () => {
    expect(sortLines(['a', 'b', 'c'], true)).toEqual(['c', 'b', 'a'])
  })

  it('不修改入参数组', () => {
    const lines = ['b', 'a']
    sortLines(lines)
    expect(lines).toEqual(['b', 'a'])
  })
})

describe('pipeline / stripZeroWidthLines', () => {
  it('逐行去掉零宽字符', () => {
    expect(stripZeroWidthLines(['a\u200bb', 'c'])).toEqual(['ab', 'c'])
  })
})

describe('pipeline / parseSteps', () => {
  it('按行解析，忽略空行与 # 注释', () => {
    expect(parseSteps('trim\n\n# 注释\nsort')).toEqual([
      { name: 'trim', value: '' },
      { name: 'sort', value: '' },
    ])
  })

  it('拆分 name=value', () => {
    expect(parseSteps('prefix=- ')).toEqual([{ name: 'prefix', value: '- ' }])
  })

  it('值里的有效空格不会被 trim 掉', () => {
    expect(parseSteps('suffix=; ')[0].value).toBe('; ')
  })

  it('只取第一个等号之后的内容作为值', () => {
    expect(parseSteps('replace=a>b=c')[0]).toEqual({ name: 'replace', value: 'a>b=c' })
  })
})

describe('pipeline / applyStep', () => {
  it('认识全部 STEP_HELP 里登记的步骤', () => {
    for (const [name] of STEP_HELP) {
      const bare = name.split('=')[0]
      // STEP_HELP 里带参数的是占位写法（take=N / drop=N），要换成能跑的真实取值
      const value = bare === 'take' || bare === 'drop' ? '1' : name.slice(bare.length + 1)
      expect(applyStep(['a'], { name: bare, value })).not.toBeNull()
    }
  })

  it('不认识的步骤返回 null', () => {
    expect(applyStep(['a'], { name: 'nope', value: '' })).toBeNull()
  })

  it('参数缺失的步骤同样返回 null', () => {
    expect(applyStep(['a'], { name: 'replace', value: 'no-separator' })).toBeNull()
    expect(applyStep(['a'], { name: 'take', value: 'x' })).toBeNull()
  })
})

describe('pipeline / runPipeline', () => {
  it('逐步作用并记录每个阶段', () => {
    const result = runPipeline('  b  \n\na\nb', 'trim\ndrop-empty\ndedupe\nsort')
    expect(result.stages.map((stage) => stage.label)).toEqual([
      'trim',
      'drop-empty',
      'dedupe',
      'sort',
    ])
    expect(result.final).toBe('a\nb')
    expect(result.errors).toEqual([])
  })

  it('本步没有改动时会在阶段上标出来', () => {
    const result = runPipeline('a', 'trim')
    expect(result.stages[0].changed).toBe(false)
  })

  it('未知步骤被跳过并记进 errors，不中断整条流水线', () => {
    const result = runPipeline('b\na', 'nope\nsort')
    expect(result.errors).toEqual(['nope'])
    expect(result.final).toBe('a\nb')
  })

  it('没有步骤时原样返回', () => {
    expect(runPipeline('a\nb', '').final).toBe('a\nb')
  })
})
