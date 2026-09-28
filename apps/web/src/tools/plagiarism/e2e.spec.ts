/**
 * plagiarism E2E（只写不跑）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('plagiarism', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/plagiarism')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/抄袭检测/)
  })

  test('只填一篇点比对 → 中文错误提示', async ({ page }) => {
    await page
      .getByTestId('input')
      .fill('人工智能是计算机科学的一个分支，它研究如何让机器模拟人类智能。')
    await page.getByTestId('check').click()
    await expect(page.getByTestId('error')).toContainText('至少需要两篇')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('plagiarism')
    await page.getByText('抄袭检测').first().click()
    await expect(page).toHaveURL(/\/tools\/plagiarism$/)
  })
})
