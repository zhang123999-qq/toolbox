/**
 * json-schema-validate E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('json-schema-validate', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/json-schema-validate`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/JSON/)
  })

  test('示例 → 校验 → 输出通过结论', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toHaveText('校验通过：符合 Schema 要求')
  })

  test('数据改坏后输出区列出不符合项', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('input').fill('{"id":"x"}')
    await expect(page.getByTestId('output')).toContainText('类型不匹配')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('json')
    await page.getByText('JSON Schema 校验').first().click()
    await expect(page).toHaveURL(/\/tools\/json-schema-validate$/)
  })
})
