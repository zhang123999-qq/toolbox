import { expect, test } from '@playwright/test'

// 注意：签名嵌入依赖 pdf-lib 与画布绘制，E2E 仅覆盖静态 UI；
// 完整的“手写/上传签名 → 嵌入 → 落点计算”已在 test.ts / Tool.test.tsx 中覆盖。
test.describe('pdf-sign PDF 签名 (#491)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tools/pdf-sign')
  })

  test('标题正确', async ({ page }) => {
    await expect(page).toHaveTitle(/PDF 签名/)
  })

  test('投放区、声明、签名页签与画布可见', async ({ page }) => {
    await expect(page.getByTestId('dropzone')).toBeVisible()
    await expect(page.getByTestId('disclaimer')).toBeVisible()
    await expect(page.getByTestId('tab-draw')).toBeVisible()
    await expect(page.getByTestId('tab-upload')).toBeVisible()
    await expect(page.getByTestId('sig-canvas')).toBeVisible()
  })

  test('有可视化签名声明（非数字证书签名）', async ({ page }) => {
    await expect(page.getByTestId('disclaimer')).toContainText(/可视化/)
    await expect(page.getByTestId('disclaimer')).toContainText(/数字证书/)
  })

  test('有本地处理说明', async ({ page }) => {
    await expect(page.getByText(/不上传/)).toBeVisible()
  })

  test('未上传 PDF 时不显示位置选项、生成按钮与下载按钮', async ({ page }) => {
    await expect(page.getByTestId('opt-page')).toHaveCount(0)
    await expect(page.getByTestId('sign')).toHaveCount(0)
    await expect(page.getByTestId('download')).toHaveCount(0)
  })

  test('切换到上传页签显示签名图片输入', async ({ page }) => {
    await page.getByTestId('tab-upload').click()
    await expect(page.getByTestId('sig-input')).toBeAttached()
    await expect(page.getByTestId('sig-canvas')).toHaveCount(0)
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto('/')
    await page.getByPlaceholder(/搜索/).fill('PDF 签名')
    await page.getByText('PDF 签名', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/pdf-sign/)
  })
})
