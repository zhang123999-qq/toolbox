import type { CiConfigInput, CiConfigOptions } from './schema'

const MAX_INPUT = 200_000

export function buildCi(options: CiConfigOptions): string {
  const branch = options.branch.trim() === '' ? 'main' : options.branch.trim()
  if (!/^[a-zA-Z0-9/_-]+$/.test(branch)) {
    throw new Error('分支名格式非法：仅允许字母数字 / _ - /')
  }

  const steps: string[] = []
  steps.push('      - uses: actions/checkout@v4')
  steps.push(`      - uses: actions/setup-node@v4
        with:
          node-version: '${options.nodeVersion}'`)
  if (options.install) {
    steps.push('      - name: Install dependencies\n        run: npm ci')
  }
  if (options.test) {
    steps.push('      - name: Test\n        run: npm test')
  }
  if (options.build) {
    steps.push('      - name: Build\n        run: npm run build')
  }
  if (options.deploy) {
    steps.push('      - name: Deploy\n        run: npm run deploy')
  }

  return [
    'name: CI',
    '',
    'on:',
    '  push:',
    `    branches: [ ${branch} ]`,
    '  pull_request:',
    `    branches: [ ${branch} ]`,
    '',
    'jobs:',
    '  build:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    ...steps,
  ].join('\n')
}

export function transform(input: CiConfigInput, options: CiConfigOptions): string {
  if (input.text === '') return ''
  if (input.text.length > MAX_INPUT) throw new Error('输入超过 200,000 字符上限')
  return buildCi(options)
}
