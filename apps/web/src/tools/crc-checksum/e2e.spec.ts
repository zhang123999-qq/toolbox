/**
 * crc-checksum E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('crc-checksum', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/crc-checksum')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/CRC 校验/)
  })

  test('示例 → 运行 → 输出标准 check 值', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toHaveText('0xCBF43926')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('crc-checksum')
    await page.getByText('CRC 校验').first().click()
    await expect(page).toHaveURL(/\/tools\/crc-checksum$/)
  })
})
