import { expect, test } from '@playwright/test'

test.describe('base64-to-image Base64 转图片 (#476)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/base64-to-image')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/Base64/)
  })

  test('输入框、粘贴与解码按钮可见', async ({ page }) => {
    await expect(page.getByTestId('base64-input')).toBeVisible()
    await expect(page.getByTestId('paste')).toBeVisible()
    await expect(page.getByTestId('decode')).toBeVisible()
    await expect(page.getByTestId('opt-format')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('空输入解码时报错', async ({ page }) => {
    await page.getByTestId('decode').click()
    await expect(page.getByTestId('error')).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('Base64 转图片')
    await page.getByText('Base64 转图片', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/base64-to-image/)
  })
})
