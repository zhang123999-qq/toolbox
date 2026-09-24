/**
 * stt E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('stt', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/stt')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/语音转文本/)
  })
  test('初始状态不请求麦克风，输出区给出待运行提示', async ({ page }) => {
    await expect(page.getByTestId('output')).toContainText('点「运行」')
    await expect(page.getByTestId('run')).toBeVisible()
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('stt')
    await page.getByText('语音转文本').first().click()
    await expect(page).toHaveURL(/\/tools\/stt$/)
  })
})
