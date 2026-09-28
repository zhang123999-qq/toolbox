import { expect, test } from '@playwright/test'

test.describe('exif-remove EXIF 清除 (#445)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/exif-remove')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/EXIF/)
  })

  test('投放区与格式选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-format')).toBeVisible()
  })

  test('有本地处理说明（Canvas 重编码不保留元数据）', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
    await expect(page.getByText(/元数据/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('EXIF')
    await page.getByText('EXIF 清除', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/exif-remove/)
  })
})
