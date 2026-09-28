import { expect, test } from '@playwright/test'

test.describe('pdf-merge PDF 合并 (#481)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-merge')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/PDF 合并/)
  })

  test('投放区与合并按钮可见，文件不足时禁用', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('merge')).toBeVisible()
    await expect(page.getByTestId('merge')).toBeDisabled()
    await expect(page.getByTestId('need-two')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('PDF 合并')
    await page.getByText('PDF 合并', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/pdf-merge/)
  })
})
