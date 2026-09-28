import type { DirectoryTreeOptions, SortMode } from './schema'

/** 选择文件数上限（文件夹通常文件多） */
export const MAX_FILES = 50000

/** 目录树节点 */
export interface TreeNode {
  readonly name: string
  readonly isDir: boolean
  readonly children: TreeNode[]
}

/** 是否隐藏文件（任一路径段以点开头） */
export function isHidden(path: string): boolean {
  return path.split('/').some((segment) => segment.startsWith('.') && segment.length > 1)
}

/** 由 webkitRelativePath 建树；空列表报错 */
export function buildTree(paths: string[], options: DirectoryTreeOptions): TreeNode {
  if (paths.length === 0) throw new Error('所选文件夹为空：没有任何文件')
  if (paths.length > MAX_FILES) throw new Error(`文件数过多：最多 ${MAX_FILES} 个`)
  const visible = options.showHidden ? paths : paths.filter((p) => !isHidden(p))
  if (visible.length === 0) throw new Error('过滤后没有可见文件：可打开「显示隐藏文件」')
  const root: TreeNode = { name: '', isDir: true, children: [] }
  for (const path of visible.sort()) {
    const segments = path.split('/')
    let node = root
    for (let i = 0; i < segments.length; i += 1) {
      const segment = segments[i] as string
      const last = i === segments.length - 1
      let child = node.children.find((c) => c.name === segment)
      if (!child) {
        child = { name: segment, isDir: !last, children: [] }
        node.children.push(child)
      }
      node = child
    }
  }
  sortTree(root, options.sortMode)
  return root
}

/** 递归排序：目录优先或纯字母 */
export function sortTree(node: TreeNode, mode: SortMode): void {
  node.children.sort((a, b) => {
    if (mode === 'dirs-first' && a.isDir !== b.isDir) return a.isDir ? -1 : 1
    return a.name.localeCompare(b.name, 'zh-Hans-CN')
  })
  for (const child of node.children) sortTree(child, mode)
}

/** 渲染为树形文本（maxDepth 截断 deeper） */
export function renderTree(root: TreeNode, options: DirectoryTreeOptions): string {
  const lines: string[] = []
  const walk = (node: TreeNode, prefix: string, depth: number): void => {
    node.children.forEach((child, index) => {
      const last = index === node.children.length - 1
      const branch = last ? '└── ' : '├── '
      lines.push(prefix + branch + child.name + (child.isDir ? '/' : ''))
      if (child.isDir) {
        if (depth + 1 >= options.maxDepth) {
          lines.push(prefix + (last ? '    ' : '│   ') + '…')
        } else {
          walk(child, prefix + (last ? '    ' : '│   '), depth + 1)
        }
      }
    })
  }
  walk(root, '', 0)
  return lines.join('\n')
}

/** 统计：目录数 / 文件数 */
export function countNodes(root: TreeNode): { dirs: number; files: number } {
  let dirs = 0
  let files = 0
  const walk = (node: TreeNode): void => {
    for (const child of node.children) {
      if (child.isDir) {
        dirs += 1
        walk(child)
      } else {
        files += 1
      }
    }
  }
  walk(root)
  return { dirs, files }
}

/** 完整流程：建树 → 渲染 → 头部统计 */
export function generateTree(paths: string[], options: DirectoryTreeOptions): string {
  const root = buildTree(paths, options)
  const { dirs, files } = countNodes(root)
  const rootName =
    root.children.length === 1 && root.children[0]?.isDir === true
      ? (root.children[0] as TreeNode).name + '/'
      : '.'
  const header = `${rootName}\n${renderTree(root, options)}`
  return `目录树：${dirs} 个目录，${files} 个文件\n\n${header}`
}

/** 下载动作的外部依赖（默认走浏览器；单测可注入假实现） */
export interface DownloadHooks {
  readonly createObjectURL: (blob: Blob) => string
  readonly revokeObjectURL: (url: string) => void
  readonly clickAnchor: (url: string, filename: string) => void
}

const browserHooks: DownloadHooks = {
  createObjectURL: (blob) => URL.createObjectURL(blob),
  revokeObjectURL: (url) => URL.revokeObjectURL(url),
  clickAnchor: (url, filename) => {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  },
}

/** 把目录树文本下载为 .txt */
export function downloadReport(report: string, hooks: DownloadHooks = browserHooks): void {
  const url = hooks.createObjectURL(new Blob([report], { type: 'text/plain;charset=utf-8' }))
  try {
    hooks.clickAnchor(url, 'directory-tree.txt')
  } finally {
    hooks.revokeObjectURL(url)
  }
}
