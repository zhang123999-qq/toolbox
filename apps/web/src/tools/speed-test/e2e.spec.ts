/**
 * speed-test E2E
 *
 * 前置：pnpm build && pnpm preview && pnpm test:e2e
 * 注意：测速用例依赖公网可达；离线环境会失败。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('speed-test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/speed-test')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/网站速度测试/)
  })

  test('示例 → 运行后输出评级', async ({ page }) => {
    await page.getByTestId('example').click()
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toContainText('评级：', { timeout: 60000 })
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('网站速度')
    await page.getByText('网站速度测试').first().click()
    await expect(page).toHaveURL(/\/tools\/speed-test$/)
  })
})
