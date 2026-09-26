/**
 * yaml-to-k8s E2E
 * 前置：pnpm build && pnpm preview，再 pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('yaml-to-k8s', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/yaml-to-k8s')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/YAML 转 K8s/)
  })

  test('示例 → 输出校验结果', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('apiVersion')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('yaml k8s')
    await page.getByText('YAML 转 K8s').first().click()
    await expect(page).toHaveURL(/\/tools\/yaml-to-k8s$/)
  })
})
