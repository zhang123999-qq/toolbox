/**
 * camera-photo E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 *
 * 注意：真实拍照需要摄像头与权限授予，CI 环境通常无法完成；
 * 下面只覆盖页面渲染。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('camera-photo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/camera-photo')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/摄像头拍照/)
  })

  test('渲染出打开摄像头按钮与说明', async ({ page }) => {
    await expect(page.getByTestId('open-camera')).toBeVisible()
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('camera-photo')
    await page.getByText('摄像头拍照').first().click()
    await expect(page).toHaveURL(/\/tools\/camera-photo$/)
  })
})
