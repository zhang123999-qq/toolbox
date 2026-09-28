/**
 * redirect-check E2E
 *
 * 前置：pnpm build && pnpm preview && pnpm test:e2e
 * 注意：实时检测用例依赖公网可达；离线环境会失败。粘贴分析用例纯离线。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('redirect-check', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/redirect-check')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/重定向检测/)
  })

  test('粘贴分析：301 响应头解析出跳转目标', async ({ page }) => {
    await page.getByTestId('input').fill('HTTP/1.1 301 Moved\nLocation: https://b.com/\n')
    await page.getByRole('combobox').selectOption('粘贴分析')
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toContainText('状态码：301')
    await expect(page.getByTestId('output')).toContainText('https://b.com/')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('重定向')
    await page.getByText('重定向检测').first().click()
    await expect(page).toHaveURL(/\/tools\/redirect-check$/)
  })
})
