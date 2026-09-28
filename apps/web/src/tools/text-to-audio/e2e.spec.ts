/**
 * text-to-audio E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('text-to-audio', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/text-to-audio')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/文字转语音/)
  })

  test('渲染音色选择、朗读按钮与参数', async ({ page }) => {
    await expect(page.getByTestId('voice')).toBeAttached()
    await expect(page.getByTestId('speak')).toContainText('朗读')
    await expect(page.getByTestId('option-rate')).toBeAttached()
    await expect(page.getByTestId('option-pitch')).toBeAttached()
  })

  test('空文本点朗读 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('   ')
    await page.getByTestId('speak').click()
    await expect(page.getByTestId('error')).toContainText('请输入要朗读的文字')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('text-to-audio')
    await page.getByText('文字转语音').first().click()
    await expect(page).toHaveURL(/\/tools\/text-to-audio$/)
  })
})
