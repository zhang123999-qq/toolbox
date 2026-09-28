import { expect, test } from '@playwright/test'

test.describe('pdf-rotate PDF 旋转 (#484)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-rotate')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/PDF 旋转/)
  })

  test('投放区与选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-angle')).toBeVisible()
    await expect(page.getByTestId('opt-scope-all')).toBeVisible()
    await expect(page.getByTestId('opt-scope-pages')).toBeVisible()
  })

  test('指定页面时显示页码输入', async ({ page }) => {
    await expect(page.getByTestId('opt-pages')).not.toBeVisible()
    await page.getByTestId('opt-scope-pages').click()
    await expect(page.getByTestId('opt-pages')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('PDF 旋转')
    await page.getByText('PDF 旋转', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/pdf-rotate/)
  })
})
