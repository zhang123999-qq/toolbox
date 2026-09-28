import { expect, test } from '@playwright/test'

test.describe('ico ICO 生成 (#428)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/ico')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/ICO 生成/)
  })

  test('投放区与尺寸复选框可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-size-16')).toBeVisible()
    await expect(page.getByTestId('opt-size-256')).toBeVisible()
  })

  test('默认勾选 16/32/48', async ({ page }) => {
    await expect(page.getByTestId('opt-size-16')).toBeChecked()
    await expect(page.getByTestId('opt-size-32')).toBeChecked()
    await expect(page.getByTestId('opt-size-48')).toBeChecked()
    await expect(page.getByTestId('opt-size-24')).not.toBeChecked()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('ICO 生成')
    await page.getByText('ICO 生成', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/ico/)
  })
})
