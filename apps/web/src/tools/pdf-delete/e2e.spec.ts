import { expect, test } from '@playwright/test'

test.describe('pdf-delete PDF 删页 (#485)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-delete')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/PDF 删页/)
  })

  test('投放区可见，初始无页面列表与删除按钮', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('file-input')).toBeAttached()
    await expect(page.getByTestId('page-grid')).toHaveCount(0)
    await expect(page.getByTestId('delete')).toHaveCount(0)
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('PDF 删页')
    await page.getByText('PDF 删页', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/pdf-delete/)
  })
})
