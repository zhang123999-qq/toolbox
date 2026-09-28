/**
 * semantic-search E2E（只写不运行）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

const DOCS = [
  '苹果公司推出了新款手机，摄像头和芯片都有大幅升级。',
  '香蕉是一种热带水果，富含钾元素，对心脏健康有益。',
  '新款手机的电池续航提升了两小时，充电速度也更快。',
].join('\n')

test.describe('semantic-search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/semantic-search')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/语义搜索/)
  })

  test('搜索后按相关度排序并显示分数', async ({ page }) => {
    await page.getByTestId('input').fill(DOCS)
    await page.getByTestId('input-query').fill('手机')
    await page.getByTestId('search').click()
    const items = page.getByTestId('results').locator('li')
    await expect(items).toHaveCount(3)
    await expect(items.first()).toContainText('手机')
    await expect(items.first()).toContainText('相似度')
    await expect(items.last()).toContainText('香蕉')
  })

  test('文档为空时中文报错', async ({ page }) => {
    await page.getByTestId('input-query').fill('手机')
    await page.getByTestId('search').click()
    await expect(page.getByTestId('error')).toContainText('文档库为空')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('semantic-search')
    await page.getByText('语义搜索').first().click()
    await expect(page).toHaveURL(/\/tools\/semantic-search$/)
  })
})
