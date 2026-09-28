/**
 * screen-recorder E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 *
 * 注意：真实录制需要浏览器弹出屏幕共享面板，CI 环境通常无法完成；
 * 下面只覆盖页面渲染与能力缺失提示。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('screen-recorder', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/screen-recorder')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/屏幕录制/)
  })

  test('渲染出开始录制按钮与说明', async ({ page }) => {
    await expect(page.getByTestId('start-record')).toBeVisible()
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('screen-recorder')
    await page.getByText('屏幕录制').first().click()
    await expect(page).toHaveURL(/\/tools\/screen-recorder$/)
  })
})
