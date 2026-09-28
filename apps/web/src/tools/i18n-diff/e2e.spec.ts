/**
 * i18n-diff E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：纯本地对比；E2E 仅校验页面可达与标题，不点运行。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('i18n JSON 对比 (#727)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/i18n-diff')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/i18n JSON 对比/)
  })

  test('示例填充基准与目标', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('input')).toHaveValue(/My App/)
    await expect(page.getByTestId('input-target')).toHaveValue(/我的应用/)
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('i18n JSON 对比')
    await page.getByText('i18n JSON 对比', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/i18n-diff$/)
  })
})
