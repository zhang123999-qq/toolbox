/**
 * messagepack E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('messagepack', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/messagepack`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/MessagePack/)
  })

  test('示例 → 输出 hex 字节串', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('hex')
  })

  test('解码模式下还原 JSON', async ({ page }) => {
    await page.getByLabel('模式').selectOption('decode')
    await page.getByTestId('input').fill('81a16101')
    await expect(page.getByTestId('output')).toContainText('"a": 1')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('messagepack')
    await page.getByText('MessagePack').first().click()
    await expect(page).toHaveURL(/\/tools\/messagepack$/)
  })
})
