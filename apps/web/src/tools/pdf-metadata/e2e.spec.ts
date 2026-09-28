import { expect, test } from '@playwright/test'

test.describe('pdf-metadata PDF 元数据 (#499)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-metadata')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/PDF 元数据/)
  })

  test('投放区与文件输入可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('file-input')).toBeAttached()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('PDF 元数据')
    await page.getByText('PDF 元数据', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/pdf-metadata/)
  })
})
