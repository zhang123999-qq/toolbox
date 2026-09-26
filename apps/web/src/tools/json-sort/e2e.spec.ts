/**
 * json-sort E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('json-sort', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/json-sort`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/JSON/)
  })

  test('示例 → 排序 → 输出键名按升序', async ({ page }) => {
    await page.getByTestId('example').click()
    const output = await page.getByTestId('output').textContent()
    expect(output?.indexOf('"name"')).toBeLessThan(output?.indexOf('"tools"') ?? -1)
  })

  test('非法输入时输出区给出错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('{"a":}')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('json')
    await page.getByText('JSON 排序').first().click()
    await expect(page).toHaveURL(/\/tools\/json-sort$/)
  })
})
