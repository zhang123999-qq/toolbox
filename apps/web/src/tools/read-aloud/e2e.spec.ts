/**
 * read-aloud E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：依赖浏览器 speechSynthesis；E2E 仅校验页面可达与标题，不点朗读。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('语音朗读 (#740)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/read-aloud')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/语音朗读/)
  })

  test('朗读按钮可见', async ({ page }) => {
    await expect(page.getByTestId('speak-btn')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('语音朗读')
    await page.getByText('语音朗读', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/read-aloud$/)
  })
})
