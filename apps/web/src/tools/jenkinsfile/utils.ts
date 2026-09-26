import type { JenkinsfileInput, JenkinsfileOptions } from './schema'

const MAX_INPUT = 200_000

/** 解析 stages：逗号分隔 → 列表 */
export function parseStages(raw: string): string[] {
  const list = raw
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter((s) => s !== '')
  if (list.length === 0) throw new Error('stages 不能为空：如 build,test,deploy')
  for (const s of list) {
    if (!/^[a-zA-Z0-9_-]+$/.test(s)) throw new Error(`stage 名非法：${s}`)
  }
  return list
}

export function buildJenkinsfile(options: JenkinsfileOptions): string {
  const stages = parseStages(options.stages)
  const stageBlocks = stages
    .map((name) =>
      [
        `        stage('${name}') {`,
        `            steps {`,
        `                sh 'echo ${name}'`,
        `            }`,
        `        }`,
      ].join('\n'),
    )
    .join('\n')

  const postBlock = options.post
    ? [
        '    post {',
        '        always {',
        "            echo 'pipeline done'",
        '        }',
        '    }',
      ].join('\n')
    : ''

  const lines = [
    'pipeline {',
    `    agent ${options.agent}`,
    '    stages {',
    stageBlocks,
    '    }',
    postBlock,
    '}',
  ].filter((l) => l !== '')
  return lines.join('\n')
}

export function transform(input: JenkinsfileInput, options: JenkinsfileOptions): string {
  if (input.text === '') return ''
  if (input.text.length > MAX_INPUT) throw new Error('输入超过 200,000 字符上限')
  return buildJenkinsfile(options)
}
