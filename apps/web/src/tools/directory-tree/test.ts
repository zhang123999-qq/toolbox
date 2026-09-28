import { describe, expect, it } from 'vitest'
import type { DirectoryTreeOptions } from './schema'
import {
  MAX_FILES,
  buildTree,
  countNodes,
  downloadReport,
  generateTree,
  isHidden,
  renderTree,
  sortTree,
  type TreeNode,
} from './utils'

const opts: DirectoryTreeOptions = { maxDepth: 20, showHidden: false, sortMode: 'dirs-first' }

const PATHS = ['proj/src/index.ts', 'proj/src/util.ts', 'proj/README.md', 'proj/.git/config']

describe('directory-tree / 建树', () => {
  it('isHidden 识别点文件', () => {
    expect(isHidden('proj/.git/config')).toBe(true)
    expect(isHidden('proj/src/index.ts')).toBe(false)
    expect(isHidden('.env')).toBe(true)
  })

  it('buildTree 建出层级；隐藏文件默认过滤', () => {
    const root = buildTree(PATHS, opts)
    expect(root.children.map((c) => c.name)).toEqual(['proj'])
    const proj = root.children[0] as TreeNode
    expect(proj.children.map((c) => c.name)).toEqual(['src', 'README.md'])
  })

  it('showHidden 打开后保留隐藏文件', () => {
    const root = buildTree(PATHS, { ...opts, showHidden: true })
    const proj = root.children[0] as TreeNode
    expect(proj.children.map((c) => c.name)).toContain('.git')
  })

  it('空列表 / 超数中文报错', () => {
    expect(() => buildTree([], opts)).toThrow(/为空/)
    expect(() => buildTree(new Array(MAX_FILES + 1).fill('a'), opts)).toThrow(/过多/)
  })

  it('全部隐藏时提示开开关', () => {
    expect(() => buildTree(['.git/a'], opts)).toThrow(/显示隐藏文件/)
  })

  it('sortTree：目录优先', () => {
    const root: TreeNode = {
      name: '',
      isDir: true,
      children: [
        { name: 'b.txt', isDir: false, children: [] },
        { name: 'adir', isDir: true, children: [] },
        { name: 'a.txt', isDir: false, children: [] },
      ],
    }
    sortTree(root, 'dirs-first')
    expect(root.children.map((c) => c.name)).toEqual(['adir', 'a.txt', 'b.txt'])
  })

  it('sortTree：纯字母模式目录不优先', () => {
    const root: TreeNode = {
      name: '',
      isDir: true,
      children: [
        { name: 'b.txt', isDir: false, children: [] },
        { name: 'adir', isDir: true, children: [] },
      ],
    }
    sortTree(root, 'alpha')
    expect(root.children.map((c) => c.name)).toEqual(['adir', 'b.txt'])
  })
})

describe('directory-tree / 渲染', () => {
  it('renderTree 输出树形符号', () => {
    const root = buildTree(['proj/src/index.ts', 'proj/README.md'], opts)
    const out = renderTree(root, opts)
    expect(out).toContain('├── ')
    expect(out).toContain('└── ')
    expect(out).toContain('src/')
    expect(out).toContain('index.ts')
  })

  it('maxDepth 截断并打省略号', () => {
    const root = buildTree(['a/b/c/d.txt'], { ...opts, maxDepth: 2 })
    const out = renderTree(root, { ...opts, maxDepth: 2 })
    expect(out).toContain('…')
    expect(out).not.toContain('d.txt')
  })

  it('非末位目录被截断时用 │ 延续线', () => {
    const root = buildTree(['a/b/c/d.txt', 'a/z.txt'], { ...opts, maxDepth: 2 })
    const out = renderTree(root, { ...opts, maxDepth: 2 })
    expect(out).toContain('│   …')
  })

  it('countNodes 统计目录与文件', () => {
    const root = buildTree(PATHS, { ...opts, showHidden: true })
    expect(countNodes(root)).toEqual({ dirs: 3, files: 4 })
  })

  it('generateTree 头部含统计与根名', () => {
    const out = generateTree(PATHS, opts)
    expect(out).toContain('目录树：')
    expect(out).toContain('proj/')
    expect(out).toContain('3 个文件')
  })

  it('多根时根名回退 .', () => {
    const out = generateTree(['a/x.txt', 'b/y.txt'], opts)
    expect(out.startsWith('目录树：2 个目录，2 个文件\n\n.\n')).toBe(true)
  })

  it('downloadReport 走 hooks', () => {
    const calls: string[] = []
    downloadReport('tree', {
      createObjectURL: () => {
        calls.push('create')
        return 'blob:u'
      },
      revokeObjectURL: () => {
        calls.push('revoke')
      },
      clickAnchor: (url, filename) => {
        calls.push(`click:${url}:${filename}`)
      },
    })
    expect(calls).toEqual(['create', 'click:blob:u:directory-tree.txt', 'revoke'])
  })
})
