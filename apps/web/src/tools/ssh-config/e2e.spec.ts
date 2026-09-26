/**
 * ssh-config E2E（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('ssh-config', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/ssh-config')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/SSH 配置/)
  })

  test('填入 Host 后示例输出 ssh_config 片段', async ({ page }) => {
    await page.getByLabel('主机别名（Host）').fill('prod')
    await page.getByTestId('example').click()
    await expect(page.getByTestId('output')).toContainText('Host prod')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('ssh config')
    await page.getByText('SSH 配置').first().click()
    await expect(page).toHaveURL(/\/tools\/ssh-config$/)
  })
})
