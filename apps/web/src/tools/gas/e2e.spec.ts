/**
 * gas E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('gas Gas 计算 (#700)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/gas')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Gas 计算/)
  })

  test('点示例并运行算出费用', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toContainText('0.00042 ETH')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('Gas 计算')
    await page.getByText('Gas 计算', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/gas$/)
  })
})
