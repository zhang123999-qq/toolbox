import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import { defineConfig, globalIgnores } from 'eslint/config'

/**
 * 全仓唯一的 ESLint 配置（flat config）。
 *
 * 为什么放在根而不是 `packages/config/eslint`：
 * 本项目只有 3 个包、规则集完全一致、没有按包分化的需求。单一配置少一层
 * 间接跳转，`eslint --fix` 与编辑器的解析路径也一致；等到某个包需要真正
 * 不同的规则集时再拆出去。
 *
 * 分 5 段：① 全仓基线 ② Node 作用域（脚本/配置） ③ 浏览器+React（Web 源码）
 * ④ 同构包（catalog / search，浏览器与 SSG 两侧都跑） ⑤ 测试。
 */
const IGNORED = [
  '**/node_modules/**',
  '**/dist/**',
  '**/dist-ssr/**',
  '**/.turbo/**',
  '**/coverage/**',
  '**/playwright-report/**',
  '**/test-results/**',
  'dist-release/**',
  'tmp-shots/**',
  // 本地浏览器验证脚本（已在 .gitignore 中，不进版本库；用 Edge 驱动本机容器实测渲染与交互）
  'apps/web/verify.mjs',
  // 本地生成的报告文件
  'eslint-report.json',
  // 由 scripts/generate-catalog.ts 生成。要改它请改各工具的 meta.ts 再跑 pnpm generate:catalog。
  'packages/catalog/src/tools.generated.ts',
  // 部署侧是 shell / Dockerfile / nginx 配置，由 deploy/binary/tests/ 的容器内验证脚本把关。
  'deploy/**',
  // 铺量期的临时生成脚本（一次性产出工具目录，用完即删；不进版本库）
  'tmp/**',
]

export default defineConfig(
  globalIgnores(IGNORED),

  // —— ① 全仓基线：JS 推荐 + TS 推荐 ——
  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
    },
    linterOptions: {
      // 失效的 eslint-disable 视为错误，避免注释里的规则名写错后长期潜伏
      reportUnusedDisableDirectives: 'error',
    },
    rules: {
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],
      'object-shorthand': ['error', 'properties'],
      // 面向用户的文案一律走 i18n，这里兜住残留的调试输出（脚本段已豁免）
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      // 下划线前缀 = 有意不用，与 tsconfig 的 noUnusedParameters 约定一致
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'warn',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // —— ② Node 作用域：构建脚本与工具链配置 ——
  {
    files: ['scripts/**/*.ts', '*.config.{js,mjs,ts}', '**/*.config.{js,mjs,ts}'],
    languageOptions: { globals: globals.node },
    rules: {
      // 脚本靠 stdout 汇报进度，这是刻意行为
      'no-console': 'off',
    },
  },

  // —— ③ 浏览器 + React：Web 应用源码 ——
  {
    files: ['apps/web/src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      // Vite HMR 要求组件文件只导出组件；常量导出（如外观常量）不破坏热更新
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // —— ④ 同构包：catalog / search 在浏览器与 SSG(Node) 两侧都执行 ——
  {
    files: ['packages/*/src/**/*.ts'],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },

  // —— ⑤ 测试：jsdom 与 Node 全局混用，断言式非空是常规写法 ——
  {
    files: ['**/*.test.{ts,tsx}', '**/test.ts', 'apps/web/e2e/**/*.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off',
    },
  },

  // —— ⑥ 已记录的例外：Provider 入口文件与 hook 同文件 ——
  // react-refresh/only-export-components 的关切只是 HMR 粒度：同一文件既导出组件
  // 又导出普通函数时，改动该文件会让整块热更新而非局部。而 Context 的 Provider 与
  // 消费它的 hook 必须共享同一个 Context 对象，拆开只会多一层转发文件，
  // 运行时零收益。故仅对这两个入口文件豁免，其余文件仍受该规则约束。
  {
    files: ['apps/web/src/i18n/**', 'apps/web/src/theme/**'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
)
