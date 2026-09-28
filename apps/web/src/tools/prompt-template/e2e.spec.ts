/**
 * prompt-template E2E（只写不运行）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('prompt-template', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/prompt-template')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/提示词模板/)
  })

  test('填写变量 → 预览实时渲染', async ({ page }) => {
    await page.getByTestId('var-目标语言').fill('英语')
    await page.getByTestId('var-原文').fill('你好')
    await expect(page.getByTestId('preview')).toContainText('英语')
    await expect(page.getByTestId('preview')).toContainText('你好')
    await expect(page.getByTestId('preview')).not.toContainText('{{')
    await expect(page.getByTestId('missing-hint')).toHaveCount(0)
  })

  test('变量未填完时显示缺失提示', async ({ page }) => {
    await page.getByTestId('var-目标语言').fill('英语')
    await expect(page.getByTestId('missing-hint')).toContainText('原文')
  })

  test('切换模板后变量输入重新生成', async ({ page }) => {
    await page.getByTestId('template-select').selectOption('sql')
    await expect(page.getByTestId('var-需求描述')).toBeVisible()
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('prompt-template')
    await page.getByText('提示词模板').first().click()
    await expect(page).toHaveURL(/\/tools\/prompt-template$/)
  })
})
