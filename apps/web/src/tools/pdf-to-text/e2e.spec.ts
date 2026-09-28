import { expect, test } from '@playwright/test'

test.describe('pdf-to-text PDF 提取文本 (#493)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-to-text')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/PDF 提取文本/)
  })

  test('投放区可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('file-input')).toBeAttached()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('PDF 提取文本')
    await page.getByText('PDF 提取文本', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/pdf-to-text/)
  })
})
