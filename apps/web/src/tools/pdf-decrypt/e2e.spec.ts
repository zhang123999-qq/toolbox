import { expect, test } from '@playwright/test'

// 注意：解密动作依赖 qpdf-wasm 引擎，E2E 仅覆盖静态 UI；
// 完整的加密→解密往返已在 test.ts 中用真实 wasm 覆盖。
test.describe('pdf-decrypt PDF 解密 (#490)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-decrypt')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/PDF 解密/)
  })

  test('投放区与文件输入可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('file-input')).toBeAttached()
  })

  test('有本地处理与密码安全说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('未上传文件时不显示密码区与下载按钮', async ({ page }) => {
    await expect(page.getByTestId('password-input')).toHaveCount(0)
    await expect(page.getByTestId('download')).toHaveCount(0)
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('PDF 解密')
    await page.getByText('PDF 解密', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/pdf-decrypt/)
  })
})
