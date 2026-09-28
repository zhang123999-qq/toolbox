import { expect, test } from '@playwright/test'

test.describe('pdf-page-number PDF 页码 (#488)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-page-number')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/PDF 页码/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-position')).toBeVisible()
    await expect(page.getByTestId('opt-style')).toBeVisible()
    await expect(page.getByTestId('opt-start')).toBeVisible()
    await expect(page.getByTestId('opt-from')).toBeVisible()
    await expect(page.getByTestId('opt-size')).toBeVisible()
    await expect(page.getByTestId('opt-margin')).toBeVisible()
  })

  test('未上传文件时无添加按钮与下载按钮', async ({ page }) => {
    await expect(page.getByTestId('add')).toHaveCount(0)
    await expect(page.getByTestId('download')).toHaveCount(0)
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('PDF 页码')
    await page.getByText('PDF 页码', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/pdf-page-number/)
  })
})
