/**
 * speech-recognition E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('speech-recognition', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/speech-recognition')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/语音识别/)
  })

  test('渲染命令词文本区与监听按钮', async ({ page }) => {
    await expect(page.getByTestId('commands')).toBeAttached()
    await expect(page.getByTestId('start-stop')).toContainText('开始监听')
  })

  test('空命令词点开始 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('commands').fill('   ')
    await page.getByTestId('start-stop').click()
    await expect(page.getByTestId('error')).toContainText('请至少填写一个命令词')
  })

  test('页面注明是命令匹配、与「音频转文字」区分', async ({ page }) => {
    await expect(page.getByTestId('output')).toContainText('命令匹配')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('speech-recognition')
    await page.getByText('语音识别').first().click()
    await expect(page).toHaveURL(/\/tools\/speech-recognition$/)
  })
})
