import { expect, test } from '@playwright/test'

test.describe('pdf-to-excel PDF 转 Excel (#496)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-to-excel')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/PDF 转 Excel/)
  })

  test('投放区与工作表模式选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-sheetmode')).toBeVisible()
  })

  test('有本地处理说明与保真度说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
    await expect(page.getByText(/保真度说明/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('PDF 转 Excel')
    await page.getByText('PDF 转 Excel', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/pdf-to-excel/)
  })
})
