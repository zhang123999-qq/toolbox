/**
 * structured-data E2E（纯离线）
 *
 * 前置：pnpm build && pnpm preview && pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('structured-data', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/structured-data')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/结构化数据校验/)
  })

  test('示例 → 同步输出校验报告', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('1 通过')
    await expect(page.getByTestId('output')).toContainText('Article')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('结构化数据')
    await page.getByText('结构化数据校验').first().click()
    await expect(page).toHaveURL(/\/tools\/structured-data$/)
  })
})
