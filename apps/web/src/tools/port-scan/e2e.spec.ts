/**
 * port-scan E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('port-scan', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/port-scan')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/端口扫描/)
  })

  test('示例 → 输出 nmap 命令与浏览器边界说明', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('nmap -sT -p 1-1000 -sV example.com')
    await expect(page.getByTestId('output')).toContainText('浏览器无法发起真实')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('port-scan')
    await page.getByText('端口扫描').first().click()
    await expect(page).toHaveURL(/\/tools\/port-scan$/)
  })
})
