import { expect, test } from '@playwright/test'

test.describe('image-base64 Base64 转换 (#427)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/image-base64')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/Base64 转换/)
  })

  test('模式切换与编码区可见', async ({ page }) => {
    await expect(page.getByTestId('mode-encode')).toBeVisible()
    await expect(page.getByTestId('mode-decode')).toBeVisible()
    await expect(page.getByTestId('dropzone')).toBeVisible()
  })

  test('解码模式输入区可见', async ({ page }) => {
    await page.getByTestId('mode-decode').check()
    await expect(page.getByTestId('b64-input')).toBeVisible()
    await expect(page.getByTestId('btn-convert')).toBeVisible()
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('Base64 转换')
    await page.getByText('Base64 转换', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/image-base64/)
  })
})
