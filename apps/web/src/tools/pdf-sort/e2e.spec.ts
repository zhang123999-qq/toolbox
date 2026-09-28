import { expect, test } from '@playwright/test'

test.describe('pdf-sort PDF 页面排序 (#486)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-sort')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/页面排序/)
  })

  test('投放区与空提示可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('empty-hint')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('页面排序')
    await page.getByText('页面排序', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/pdf-sort/)
  })
})
