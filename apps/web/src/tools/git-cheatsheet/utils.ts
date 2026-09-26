import type { GitCheatsheetOptions } from './schema'

interface Command {
  readonly cmd: string
  readonly desc: string
  readonly example: string
}

interface Section {
  readonly key: string
  readonly title: string
  readonly commands: readonly Command[]
}

/** 常用 Git 命令速查表（按分类） */
export const SECTIONS: readonly Section[] = [
  {
    key: 'base',
    title: '基础',
    commands: [
      { cmd: 'git init', desc: '在当前目录初始化仓库', example: 'git init' },
      {
        cmd: 'git clone <url>',
        desc: '克隆远程仓库',
        example: 'git clone https://github.com/org/repo.git',
      },
      { cmd: 'git status', desc: '查看工作区状态', example: 'git status' },
      { cmd: 'git add <file>', desc: '把改动加入暂存区', example: 'git add src/app.ts' },
      { cmd: 'git add .', desc: '暂存全部改动', example: 'git add .' },
      {
        cmd: 'git commit -m "<msg>"',
        desc: '提交暂存区',
        example: 'git commit -m "fix: 修复登录跳转"',
      },
      {
        cmd: 'git commit -am "<msg>"',
        desc: '跳过 add 直接提交已跟踪文件',
        example: 'git commit -am "wip"',
      },
      { cmd: 'git diff', desc: '查看未暂存的改动', example: 'git diff' },
      { cmd: 'git diff --staged', desc: '查看已暂存的改动', example: 'git diff --staged' },
    ],
  },
  {
    key: 'branch',
    title: '分支',
    commands: [
      { cmd: 'git branch', desc: '列出本地分支', example: 'git branch' },
      { cmd: 'git branch <name>', desc: '新建分支（不切换）', example: 'git branch feature/login' },
      {
        cmd: 'git checkout -b <name>',
        desc: '新建并切换到分支',
        example: 'git checkout -b feature/login',
      },
      {
        cmd: 'git switch -c <name>',
        desc: '新版命令：新建并切换',
        example: 'git switch -c feature/login',
      },
      { cmd: 'git checkout <name>', desc: '切换分支', example: 'git checkout main' },
      {
        cmd: 'git branch -d <name>',
        desc: '删除已合并分支',
        example: 'git branch -d feature/login',
      },
      { cmd: 'git branch -D <name>', desc: '强制删除分支', example: 'git branch -D wip' },
      { cmd: 'git merge <name>', desc: '把分支合并到当前分支', example: 'git merge feature/login' },
      { cmd: 'git rebase <base>', desc: '变基到指定基线', example: 'git rebase main' },
    ],
  },
  {
    key: 'remote',
    title: '远程',
    commands: [
      { cmd: 'git remote -v', desc: '查看远程地址', example: 'git remote -v' },
      {
        cmd: 'git remote add <name> <url>',
        desc: '添加远程仓库',
        example: 'git remote add origin git@github.com:org/repo.git',
      },
      { cmd: 'git fetch', desc: '拉取远程更新但不合并', example: 'git fetch origin' },
      { cmd: 'git pull', desc: '拉取并合并到当前分支', example: 'git pull origin main' },
      { cmd: 'git push', desc: '推送当前分支', example: 'git push origin main' },
      {
        cmd: 'git push -u origin <branch>',
        desc: '首次推送并建立追踪',
        example: 'git push -u origin feature/login',
      },
      {
        cmd: 'git push --force-with-lease',
        desc: '安全强推（推荐）',
        example: 'git push --force-with-lease',
      },
      {
        cmd: 'git push origin --delete <branch>',
        desc: '删除远程分支',
        example: 'git push origin --delete feature/wip',
      },
    ],
  },
  {
    key: 'undo',
    title: '撤销',
    commands: [
      { cmd: 'git restore <file>', desc: '丢弃工作区改动', example: 'git restore src/app.ts' },
      {
        cmd: 'git restore --staged <file>',
        desc: '把文件移出暂存区',
        example: 'git restore --staged src/app.ts',
      },
      {
        cmd: 'git commit --amend',
        desc: '修改最近一次提交',
        example: 'git commit --amend -m "fix: 新信息"',
      },
      {
        cmd: 'git reset --soft <ref>',
        desc: '回退提交，保留改动',
        example: 'git reset --soft HEAD~1',
      },
      {
        cmd: 'git reset --hard <ref>',
        desc: '回退提交，丢弃改动（危险）',
        example: 'git reset --hard HEAD~1',
      },
      { cmd: 'git revert <commit>', desc: '生成反向提交', example: 'git revert a1b2c3d' },
      { cmd: 'git clean -fd', desc: '删除未跟踪文件', example: 'git clean -fd' },
    ],
  },
  {
    key: 'stash',
    title: '储藏',
    commands: [
      { cmd: 'git stash', desc: '暂存当前工作区', example: 'git stash' },
      { cmd: 'git stash -m "<msg>"', desc: '带说明暂存', example: 'git stash -m "临时切分支"' },
      { cmd: 'git stash list', desc: '查看储藏列表', example: 'git stash list' },
      { cmd: 'git stash pop', desc: '恢复最近储藏并删除', example: 'git stash pop' },
      { cmd: 'git stash apply', desc: '恢复但保留储藏', example: 'git stash apply stash@{0}' },
      { cmd: 'git stash drop', desc: '删除最近储藏', example: 'git stash drop' },
    ],
  },
  {
    key: 'stage',
    title: '暂存',
    commands: [
      { cmd: 'git add -p', desc: '交互式选择暂存块', example: 'git add -p' },
      { cmd: 'git add -i', desc: '交互式暂存界面', example: 'git add -i' },
      {
        cmd: 'git restore --staged <file>',
        desc: '把文件移出暂存区',
        example: 'git restore --staged src/app.ts',
      },
      {
        cmd: 'git rm --cached <file>',
        desc: '停止跟踪但保留本地文件',
        example: 'git rm --cached build/output.js',
      },
      { cmd: 'git diff --staged', desc: '查看暂存区与 HEAD 的差异', example: 'git diff --staged' },
      {
        cmd: 'git commit --only <file>',
        desc: '只提交指定文件',
        example: 'git commit --only src/app.ts -m "fix"',
      },
    ],
  },
  {
    key: 'log',
    title: '日志',
    commands: [
      { cmd: 'git log', desc: '查看提交历史', example: 'git log' },
      { cmd: 'git log --oneline', desc: '单行简洁日志', example: 'git log --oneline' },
      {
        cmd: 'git log --graph --oneline --all',
        desc: '图形化分支图',
        example: 'git log --graph --oneline --all',
      },
      { cmd: 'git log -p <file>', desc: '查看某文件的改动历史', example: 'git log -p src/app.ts' },
      { cmd: 'git blame <file>', desc: '逐行查看作者', example: 'git blame src/app.ts' },
    ],
  },
  {
    key: 'tag',
    title: '标签',
    commands: [
      { cmd: 'git tag', desc: '列出标签', example: 'git tag' },
      { cmd: 'git tag v1.0.0', desc: '轻量标签', example: 'git tag v1.0.0' },
      {
        cmd: 'git tag -a v1.0.0 -m "<msg>"',
        desc: '附注标签',
        example: 'git tag -a v1.0.0 -m "首个正式版"',
      },
      { cmd: 'git push origin v1.0.0', desc: '推送单个标签', example: 'git push origin v1.0.0' },
      { cmd: 'git push origin --tags', desc: '推送全部标签', example: 'git push origin --tags' },
    ],
  },
]

/** 分类 key → 标题（用于输出） */
export const CATEGORY_TITLES: Readonly<Record<string, string>> = {
  all: '全部',
  base: '基础',
  branch: '分支',
  remote: '远程',
  undo: '撤销',
  stage: '暂存',
  stash: '储藏',
  log: '日志',
  tag: '标签',
}

export function assertCategory(category: string): void {
  if (!(category in CATEGORY_TITLES)) throw new Error('不支持的分类：' + category)
}

/** 渲染一个分类区块为文本表 */
function renderSection(section: Section): string[] {
  const lines = [`## ${section.title}`, '', '命令 | 说明 | 示例', '--- | --- | ---']
  for (const c of section.commands) lines.push(`${c.cmd} | ${c.desc} | ${c.example}`)
  return lines
}

/** 输入为空返回空串；任意触发内容即按分类输出速查表 */
export function transform(input: { text: string }, options: GitCheatsheetOptions): string {
  if (input.text === '') return ''
  if (input.text.length > 200000) throw new Error('输入超过 200,000 字符上限')
  assertCategory(options.category)
  const picked =
    options.category === 'all' ? SECTIONS : SECTIONS.filter((s) => s.key === options.category)
  const out: string[] = []
  for (const s of picked) out.push(...renderSection(s), '')
  return out.join('\n').trimEnd()
}
