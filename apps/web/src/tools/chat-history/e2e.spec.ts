/**
 * chat-history E2E（只写不跑）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('chat-history', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/chat-history')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/对话历史/)
  })

  test('手动添加对话 → 出现在列表', async ({ page }) => {
    await page.getByTestId('session-title').fill('复利问题')
    await page.getByTestId('session-model').fill('gpt-4o')
    await page.getByTestId('session-messages').fill('user: 什么是复利？\nassistant: 利滚利')
    await page.getByTestId('add-session').click()
    await expect(page.getByTestId('session-item').first()).toContainText('复利问题')
  })

  test('标题为空 → 中文错误提示', async ({ page }) => {
    await page.getByTestId('session-model').fill('m')
    await page.getByTestId('session-messages').fill('user: hi')
    await page.getByTestId('add-session').click()
    await expect(page.getByTestId('error')).toContainText('标题不能为空')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('chat-history')
    await page.getByText('对话历史').first().click()
    await expect(page).toHaveURL(/\/tools\/chat-history$/)
  })
})
