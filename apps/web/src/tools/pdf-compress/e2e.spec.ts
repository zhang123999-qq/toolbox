import { expect, test } from '@playwright/test'

test.describe('pdf-compress PDF 压缩 (#483)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-compress')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/PDF 压缩/)
  })

  test('投放区、元数据选项与效果限制提示可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-metadata')).toBeVisible()
    await expect(page.getByTestId('limit-note')).toBeVisible()
  })

  test('有限效果提示显著可见', async ({ page }) => {
    await expect(page.getByTestId('limit-note')).toContainText(/效果有限/)
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('PDF 压缩')
    await page.getByText('PDF 压缩', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/pdf-compress/)
  })
})
