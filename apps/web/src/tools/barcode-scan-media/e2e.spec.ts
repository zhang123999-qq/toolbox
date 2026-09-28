/**
 * barcode-scan-media E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 *
 * 注意：摄像头扫描需要真实设备与权限，CI 环境通常无法完成；
 * 下面只覆盖页面渲染。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('barcode-scan-media', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/barcode-scan-media')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/条码扫描/)
  })

  test('渲染出开始摄像头扫描按钮与预览区', async ({ page }) => {
    await expect(page.getByTestId('scan-camera')).toBeVisible()
    await expect(page.getByTestId('preview')).toBeAttached()
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('barcode-scan-media')
    await page.getByText('条码扫描').first().click()
    await expect(page).toHaveURL(/\/tools\/barcode-scan-media$/)
  })
})
