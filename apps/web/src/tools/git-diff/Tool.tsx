import { TwoColumn } from '../../components/tool/templates/TwoColumn'
import type { OptionDef } from '../../components/tool/templates/TwoColumn'
import { meta } from './meta'
import { transform } from './utils'
import type { GitDiffInput, GitDiffOptions } from './schema'

const EXAMPLE: GitDiffInput = {
  text: [
    'diff --git a/src/a.ts b/src/a.ts',
    'index 111..222 100644',
    '--- a/src/a.ts',
    '+++ b/src/a.ts',
    '@@ -1,3 +1,4 @@',
    ' line1',
    '-old line',
    '+new line',
    '+another',
    ' line3',
    'diff --git a/README.md b/README.md',
    'new file mode 100644',
    'index 000..333',
    '--- /dev/null',
    '+++ b/README.md',
    '@@ -0,0 +1 @@',
    '+# readme',
  ].join('\n'),
}

export default function Tool() {
  const optionDefs: readonly OptionDef<GitDiffOptions>[] = [
    { key: 'verbose', label: '显示说明', kind: 'boolean' },
  ]
  return (
    <TwoColumn<GitDiffInput, GitDiffOptions>
      meta={meta}
      initialInput={{ text: '' }}
      initialOptions={{ verbose: false }}
      run={transform}
      example={EXAMPLE}
      optionDefs={optionDefs}
    />
  )
}
