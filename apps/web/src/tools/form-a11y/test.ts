// @vitest-environment jsdom
/**
 * form-a11y（#730）utils 单测：表单 HTML 无障碍检查。
 */
import { describe, expect, it } from 'vitest'
import { analyzeFormA11y, formatFormA11yResult, type DocFactory } from './utils'

const factory: DocFactory = (html) => new DOMParser().parseFromString(html, 'text/html')

describe('analyzeFormA11y 输入', () => {
  it('空输入抛中文错', () => {
    expect(() => analyzeFormA11y('   ', factory)).toThrow('请粘贴表单 HTML')
  })
  it('默认工厂可用（jsdom 提供 DOMParser）', () => {
    const r = analyzeFormA11y('<form><input aria-label="q"><button type="submit">Go</button></form>')
    expect(r.controlCount).toBe(1)
  })
})

describe('标签关联', () => {
  it('完美表单零问题', () => {
    const r = analyzeFormA11y(
      '<form><label for="n">姓名 *</label><input id="n" required aria-required="true"><button type="submit">提交</button></form>',
      factory,
    )
    expect(r.issues).toEqual([])
    expect(r.controlCount).toBe(1)
    expect(r.labeledCount).toBe(1)
  })
  it('缺少标签报错误', () => {
    const r = analyzeFormA11y('<form><input name="q"><button type="submit">Go</button></form>', factory)
    expect(r.errorCount).toBe(1)
    expect(r.issues[0].message).toContain('缺少标签')
    expect(r.labeledCount).toBe(0)
  })
  it('label for 不匹配不算关联', () => {
    const r = analyzeFormA11y(
      '<form><label for="other">X</label><input id="a"><button type="submit">Go</button></form>',
      factory,
    )
    expect(r.errorCount).toBe(1)
  })
  it('包裹式 label 算关联', () => {
    const r = analyzeFormA11y('<form><label>姓名<input name="n"></label><button type="submit">Go</button></form>', factory)
    expect(r.issues).toEqual([])
  })
  it('aria-label 算关联，空白不算', () => {
    const ok = analyzeFormA11y('<form><input aria-label="搜索"><button type="submit">Go</button></form>', factory)
    expect(ok.issues).toEqual([])
    const bad = analyzeFormA11y('<form><input aria-label="  "><button type="submit">Go</button></form>', factory)
    expect(bad.errorCount).toBe(1)
  })
  it('aria-labelledby 有效/无效', () => {
    const ok = analyzeFormA11y(
      '<form><span id="t">名称</span><input aria-labelledby="t"><button type="submit">Go</button></form>',
      factory,
    )
    expect(ok.issues).toEqual([])
    const bad = analyzeFormA11y('<form><input aria-labelledby="nope"><button type="submit">Go</button></form>', factory)
    expect(bad.errorCount).toBe(1)
  })
  it('placeholder 不能替代 label', () => {
    const r = analyzeFormA11y('<form><input placeholder="请输入"><button type="submit">Go</button></form>', factory)
    expect(r.errorCount).toBe(1)
    expect(r.warningCount).toBe(1)
    expect(r.issues[1].message).toContain('placeholder 不能替代 label')
  })
  it('有 label 时 placeholder 不警告', () => {
    const r = analyzeFormA11y(
      '<form><label for="a">X</label><input id="a" placeholder="请输入"><button type="submit">Go</button></form>',
      factory,
    )
    expect(r.issues).toEqual([])
  })
})

describe('必填与描述关联', () => {
  it('required 无标识警告', () => {
    const r = analyzeFormA11y(
      '<form><label for="a">姓名</label><input id="a" required><button type="submit">Go</button></form>',
      factory,
    )
    expect(r.warningCount).toBe(1)
    expect(r.issues[0].message).toContain('必填标识')
  })
  it('label 含 * 不警告', () => {
    const r = analyzeFormA11y(
      '<form><label for="a">姓名 *</label><input id="a" required><button type="submit">Go</button></form>',
      factory,
    )
    expect(r.issues).toEqual([])
  })
  it('包裹式 label 含 * 不警告', () => {
    const r = analyzeFormA11y(
      '<form><label>姓名 *<input name="n" required></label><button type="submit">Go</button></form>',
      factory,
    )
    expect(r.issues).toEqual([])
  })
  it('required 有 id 但无关联 label 时警告', () => {
    const r = analyzeFormA11y('<form><input id="a" required aria-label="X"><button type="submit">Go</button></form>', factory)
    expect(r.warningCount).toBe(1)
    expect(r.issues[0].message).toContain('必填标识')
  })
  it('aria-describedby 指向不存在警告', () => {
    const r = analyzeFormA11y(
      '<form><label for="a">X</label><input id="a" aria-describedby="e1 e2"><span id="e1">err</span><button type="submit">Go</button></form>',
      factory,
    )
    expect(r.warningCount).toBe(1)
    expect(r.issues[0].message).toContain('e2')
  })
  it('aria-describedby 全部存在不警告', () => {
    const r = analyzeFormA11y(
      '<form><label for="a">X</label><input id="a" aria-describedby="e1"><span id="e1">err</span><button type="submit">Go</button></form>',
      factory,
    )
    expect(r.issues).toEqual([])
  })
  it('aria-invalid 无关联警告', () => {
    const r = analyzeFormA11y(
      '<form><label for="a">X</label><input id="a" aria-invalid="true"><button type="submit">Go</button></form>',
      factory,
    )
    expect(r.issues[0].message).toContain('aria-invalid')
    const ok = analyzeFormA11y(
      '<form><label for="a">X</label><input id="a" aria-invalid="true" aria-describedby="e"><span id="e">err</span><button type="submit">Go</button></form>',
      factory,
    )
    expect(ok.issues).toEqual([])
  })
})

describe('结构检查', () => {
  it('图片按钮缺少 alt 报错误', () => {
    const r = analyzeFormA11y('<form><input type="image" src="go.png"></form>', factory)
    expect(r.errorCount).toBe(1)
    const ok = analyzeFormA11y('<form><input type="image" src="go.png" alt="提交"></form>', factory)
    expect(ok.errorCount).toBe(0)
  })
  it('fieldset 缺少 legend 警告', () => {
    const r = analyzeFormA11y(
      '<form><fieldset><label for="a">X</label><input id="a"></fieldset><button type="submit">Go</button></form>',
      factory,
    )
    expect(r.warningCount).toBe(1)
    const ok = analyzeFormA11y(
      '<form><fieldset><legend>分组</legend><label for="a">X</label><input id="a"></fieldset><button type="submit">Go</button></form>',
      factory,
    )
    expect(ok.issues).toEqual([])
  })
  it('重复 id 报错误', () => {
    const r = analyzeFormA11y(
      '<form><label for="a">X</label><input id="a"><input id="a" aria-label="Y"><button type="submit">Go</button></form>',
      factory,
    )
    expect(r.issues.some((i) => i.message.includes('重复出现 2 次'))).toBe(true)
  })
  it('缺少提交按钮警告（表单级）', () => {
    const r = analyzeFormA11y('<form><label for="a">X</label><input id="a"></form>', factory)
    expect(r.issues.some((i) => i.message.includes('第 1 个表单缺少提交按钮'))).toBe(true)
  })
  it('无 form 时按页面检查提交按钮', () => {
    const r = analyzeFormA11y('<input aria-label="q">', factory)
    expect(r.issues.some((i) => i.message.includes('页面缺少提交按钮'))).toBe(true)
  })
  it('无 type 的 button 视为提交', () => {
    const r = analyzeFormA11y('<form><label for="a">X</label><input id="a"><button>Go</button></form>', factory)
    expect(r.issues).toEqual([])
  })
  it('type=button 不算提交', () => {
    const r = analyzeFormA11y(
      '<form><label for="a">X</label><input id="a"><button type="button">x</button></form>',
      factory,
    )
    expect(r.warningCount).toBe(1)
  })
  it('无控件的表单不报缺少提交', () => {
    const r = analyzeFormA11y('<form><button type="button">x</button></form>', factory)
    expect(r.issues).toEqual([])
  })
})

describe('formatFormA11yResult', () => {
  it('渲染统计与明细', () => {
    const r = analyzeFormA11y('<form><input name="q"><button type="submit">Go</button></form>', factory)
    const text = formatFormA11yResult(r)
    expect(text).toContain('控件数：1')
    expect(text).toContain('[错误]')
    expect(text).toContain('<input name=q>')
  })
  it('无问题输出提示', () => {
    const r = analyzeFormA11y('<form><label for="n">X</label><input id="n"><button type="submit">Go</button></form>', factory)
    expect(formatFormA11yResult(r)).toContain('未发现无障碍问题')
  })
  it('select/textarea 元素速写', () => {
    const r = analyzeFormA11y('<form><select id="s"></select><textarea></textarea></form>', factory)
    const text = formatFormA11yResult(r)
    expect(text).toContain('<select#s>')
    expect(text).toContain('<textarea>')
  })
})
