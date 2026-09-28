/**
 * 音准测试 E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 *
 * 注意：C 级工具（Web Audio）；E2E 仅校验页面可达与交互元素，不实际播放音频。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('音准测试 (#856)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/pitch-test')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/音准测试/)
  })

  test('播放按钮与答案按钮存在', async ({ page }) => {
    await expect(page.getByTestId('pt-play1')).toBeVisible()
    await expect(page.getByTestId('pt-answer-higher')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByPlaceholder(/搜索/).fill('音准测试')
    await expect(page.getByRole('link', { name: /音准测试/ }).first()).toBeVisible()
  })
})
