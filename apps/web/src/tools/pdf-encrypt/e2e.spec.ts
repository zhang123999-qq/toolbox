import { expect, test } from '@playwright/test'

// 注意：本工具依赖 qpdf-wasm（浏览器内初始化加密引擎），e2e 需要真实浏览器环境；
// 本地单测用 vitest（Tool.test.tsx mock 了 lib/qpdf），此处仅做页面级冒烟，不断言加密结果。
test.describe('pdf-encrypt PDF 加密 (#489)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-encrypt')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/PDF 加密/)
  })

  test('投放区与密码选项可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('opt-userpw')).toBeVisible()
    await expect(page.getByTestId('opt-ownerpw')).toBeVisible()
    await expect(page.getByTestId('opt-keylength')).toBeVisible()
    await expect(page.getByTestId('encrypt')).toBeVisible()
  })

  test('密码框为 password 类型', async ({ page }) => {
    await expect(page.getByTestId('opt-userpw')).toHaveAttribute('type', 'password')
  })

  test('有本地处理与 AES 说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('PDF 加密')
    await page.getByText('PDF 加密', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/pdf-encrypt/)
  })
})
