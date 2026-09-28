import { expect, test } from '@playwright/test'

test.describe('pdf-to-word PDF 转 Word (#495)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-to-word')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/PDF 转 Word/)
  })

  test('投放区可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('有排版保真度说明', async ({ page }) => {
    await expect(page.getByText(/保真度/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('PDF 转 Word')
    await page.getByText('PDF 转 Word', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/pdf-to-word/)
  })
})
