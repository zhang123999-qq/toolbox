/**
 * sampling E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('sampling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/sampling')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/随机抽样/)
  })

  test('示例 → 输出抽样结果（含 3 个样本）', async ({ page }) => {
    await page.getByTestId('example').click()
    const output = page.getByTestId('output')
    await expect(output).toContainText('抽样结果')
    await expect(output).toContainText('总体规模')
  })

  test('相同种子点运行结果不变', async ({ page }) => {
    await page.getByTestId('example').click()
    const first = await page.getByTestId('output').textContent()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toHaveText(first ?? '')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('随机抽样')
    await page.getByText('随机抽样').first().click()
    await expect(page).toHaveURL(/\/tools\/sampling$/)
  })
})
