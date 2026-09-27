/**
 * resume E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('resume', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/resume')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/简历生成/)
  })

  test('示例 → 预览出现姓名与职位', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('resume-preview')).toContainText('陈静')
    await expect(page.getByTestId('resume-preview')).toContainText('高级前端工程师')
  })

  test('只填职位不填姓名 → 输出错误提示', async ({ page }) => {
    await page.getByTestId('input-title').fill('工程师')
    await expect(page.getByTestId('output').getByRole('alert')).toContainText('请填写姓名')
  })

  test('导出 PNG 按钮存在', async ({ page }) => {
    await page.getByTestId('example').click()
    await expect(page.getByTestId('export-png')).toBeVisible()
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('简历生成')
    await page.getByText('简历生成').first().click()
    await expect(page).toHaveURL(/\/tools\/resume$/)
  })
})
