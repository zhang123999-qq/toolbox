import { expect, test } from '@playwright/test'

test.describe('exif-view EXIF 查看 (#444)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/exif-view')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/EXIF/)
  })

  test('投放区可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('file-input')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('EXIF')
    await page.getByText('EXIF 查看', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/exif-view/)
  })
})
