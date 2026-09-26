/**
 * helm-config E2E
 * 前置：pnpm build && pnpm preview，再 pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('helm-config', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/helm-config')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Helm 配置/)
  })

  test('示例 → 输出 Chart.yaml', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('apiVersion: v2')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('helm')
    await page.getByText('Helm 配置').first().click()
    await expect(page).toHaveURL(/\/tools\/helm-config$/)
  })
})
