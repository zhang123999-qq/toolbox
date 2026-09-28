/**
 * rag E2E（只写不运行）
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

const TEXT =
  'TF-IDF 是一种常用的文本检索算法。它的全称是词频 - 逆文档频率。' +
  '词频衡量一个词在文档中出现的频率，逆文档频率衡量一个词的稀缺程度。' +
  '余弦相似度用于比较两个向量的夹角，夹角越小表示两个文本越相似。'

test.describe('rag', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/rag')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/RAG/)
  })

  test('提问后展示答案与命中的片段', async ({ page }) => {
    await page.getByTestId('input').fill(TEXT)
    await page.getByTestId('input-query').fill('什么是 TF-IDF')
    await page.getByTestId('ask').click()
    await expect(page.getByTestId('answer')).toContainText('TF-IDF')
    await expect(page.getByTestId('chunks').locator('li').first()).toContainText('相似度')
  })

  test('k 非法时中文报错', async ({ page }) => {
    await page.getByTestId('input').fill(TEXT)
    await page.getByTestId('input-query').fill('什么是 TF-IDF')
    await page.getByTestId('k-input').fill('abc')
    await page.getByTestId('ask').click()
    await expect(page.getByTestId('error')).toContainText('检索片段数必须是数字')
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('rag')
    await page.getByText('RAG问答').first().click()
    await expect(page).toHaveURL(/\/tools\/rag$/)
  })
})
