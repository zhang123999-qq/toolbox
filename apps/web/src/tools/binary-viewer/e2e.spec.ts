/**
 * binary-viewer E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('binary-viewer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/tools/binary-viewer`)
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/二进制/)
  })

  test('示例 → 还原 xxd 风格转储并识别出 PNG', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('还原出 16 字节')
    await expect(page.getByTestId('output')).toContainText('PNG 图片')
  })

  test('提供文件入口，选择后直接出字节报告', async ({ page }) => {
    await page.getByTestId('file').setInputFiles({
      name: 'demo.gif',
      mimeType: 'application/octet-stream',
      buffer: Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
    })
    await expect(page.getByTestId('output')).toContainText('文件：demo.gif')
  })

  test('奇数长度十六进制给出错误提示', async ({ page }) => {
    await page.getByTestId('input').fill('abc')
    await expect(page.getByTestId('output')).toHaveAttribute('role', 'alert')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('二进制')
    await page.getByText('二进制查看').first().click()
    await expect(page).toHaveURL(/\/tools\/binary-viewer$/)
  })
})
