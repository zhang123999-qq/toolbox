import { expect, test } from '@playwright/test'

test.describe('pdf-compare PDF 对比 (#498)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-compare')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/PDF 对比/)
  })

  test('两个投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone-a')).toBeVisible()
    await expect(page.getByTestId('dropzone-b')).toBeVisible()
    await expect(page.getByTestId('opt-threshold')).toBeVisible()
    await expect(page.getByTestId('opt-view')).toBeVisible()
  })

  test('未上传两份文件时无对比按钮', async ({ page }) => {
    await expect(page.getByTestId('compare')).toHaveCount(0)
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('PDF 对比')
    await page.getByText('PDF 对比', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/pdf-compare/)
  })
})
