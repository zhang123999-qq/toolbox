/**
 * keccak256 E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('keccak256 哈希 (#694)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/keccak256')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Keccak-256/)
  })

  test('点示例算出 hello 的哈希', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText(
      '1c8aff950685c2ed4bc3174f3472287b56d9517b9c948127319a09a7a36deac8',
    )
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('Keccak')
    await page.getByText('Keccak-256 哈希', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/keccak256$/)
  })
})
