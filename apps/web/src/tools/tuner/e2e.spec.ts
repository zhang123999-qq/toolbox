/**
 * tuner E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 *
 * 注意：E2E 环境需要授予麦克风权限才能走完监听流程；
 * 无麦克风时仅验证页面渲染与不支持提示。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('tuner', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/tuner')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/调音器/)
  })

  test('渲染监听按钮与音名显示区', async ({ page }) => {
    await expect(page.getByTestId('start-stop')).toContainText('开始监听')
    await expect(page.getByTestId('note-name')).toBeAttached()
    await expect(page.getByTestId('cents')).toBeAttached()
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('tuner')
    await page.getByText('调音器').first().click()
    await expect(page).toHaveURL(/\/tools\/tuner$/)
  })
})
