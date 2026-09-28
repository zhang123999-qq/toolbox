/**
 * hash-verify E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('hash-verify 哈希校验 (#714)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/hash-verify')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/哈希校验/)
  })

  test('点示例运行校验匹配', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toContainText('匹配')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('哈希校验')
    await page.getByText('哈希校验', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/hash-verify$/)
  })
})
