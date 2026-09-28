/**
 * word-view E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview        # 默认 http://127.0.0.1:4173
 *   pnpm test:e2e
 *
 * 说明：本机未安装 Playwright 浏览器（~/.cache/ms-playwright 为空），
 * 该文件只编写不运行。
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

/**
 * 最小 docx（标题 Hello + 段落 world）的 base64。
 * 内嵌 fixture，不引入 fflate，保持 meta.deps=['mammoth'] 精确。
 */
const DOCX_HELLO =
  'UEsDBBQAAAAIAL0LPF3MVIwQ4AAAAJwBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH2Qy07DMBBFf8XyFsUOLBBCSbrgsQQW5QNG9iSx8Eset5S/Z9KWLlDbpX0fZ3S71S54scVCLsVe3qpWCowmWRenXn6uX5sHuRq69U9GEmyN1Mu51vyoNZkZA5BKGSMrYyoBKj/LpDOYL5hQ37XtvTYpVoy1qUuHHLpnHGHjq3jZ8fcBW9CTFE8H48LqJeTsnYHKut5G+4/SHAmKk3sPzS7TDRukPktYlMuAY+6ddyjOoviAUt8gsEt/p2K1TWYTOKmu15y5M42jM3jKL225JINEPHDw6qQEcPHvfr2fe/gFUEsDBBQAAAAIAL0LPF02V97cogAAABgBAAALAAAAX3JlbHMvLnJlbHONzzsOwjAMBuCrRN6pCwNCqGkXhNQVlQNEiZtGNA8l4XV7MjBQxMBo+/dnuekedmY3isl4x2Fd1cDISa+M0xzOw3G1g65tTjSLXBJpMiGxsuIShynnsEdMciIrUuUDuTIZfbQilzJqDEJehCbc1PUW46cBS5P1ikPs1RrY8Az0j+3H0Ug6eHm15PKPE1+JIouoKXO4+6hQvdtVYQHbBhcvti9QSwMEFAAAAAgAvQs8XTbGUf+yAAAADgEAABEAAAB3b3JkL2RvY3VtZW50LnhtbG2Pyw7CIBBFf6Vhb2ldGNP0sTNdmqgfgGVsmwBDAIv9ewG1Kzd3Xid3ZuruJUW2gLEzqoaUeUEyUAPyWY0NuV1PuyPp2tpXHIenBOWywCtb+YZMzumKUjtMIJnNUYMKswcayVwozUg9Gq4NDmBtsJOC7oviQCWbFYmWd+RrjDrJ2aRwcauAzFcLEw3pgcVDSkLbmm5MEtf2IATGtkvD0I3IZvilwg2C/6GCfvaH5Pdb+wZQSwECFAAUAAAACAC9CzxdzFSMEOAAAACcAQAAEwAAAAAAAAAAAAAAAAAAAAAAW0NvbnRlbnRfVHlwZXNdLnhtbFBLAQIUABQAAAAIAL0LPF02V97cogAAABgBAAALAAAAAAAAAAAAAAAAABEBAABfcmVscy8ucmVsc1BLAQIUABQAAAAIAL0LPF02xlH/sgAAAA4BAAARAAAAAAAAAAAAAAAAANwBAAB3b3JkL2RvY3VtZW50LnhtbFBLBQYAAAAAAwADALkAAAC9AgAAAAA='

function docxBuffer(): Buffer {
  return Buffer.from(DOCX_HELLO, 'base64')
}

test.describe('word-view', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/word-view')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/Word 文档预览/)
  })

  test('上传 docx → 渲染 HTML 预览', async ({ page }) => {
    await page.getByTestId('file').setInputFiles({
      name: 'demo.docx',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer: docxBuffer(),
    })
    const preview = page.getByTestId('word-preview')
    await expect(preview).toContainText('Hello', { timeout: 30000 })
    await expect(preview).toContainText('world', { timeout: 30000 })
  })

  test('上传旧版 .doc 给出专门提示', async ({ page }) => {
    await page.getByTestId('file').setInputFiles({
      name: 'old.doc',
      mimeType: 'application/msword',
      buffer: Buffer.from('fake'),
    })
    await expect(page.getByTestId('word-error')).toContainText('暂不支持旧版 .doc', {
      timeout: 30000,
    })
  })

  test('从首页能通过搜索进入该工具', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('word-view')
    await page.getByText('Word 文档预览').first().click()
    await expect(page).toHaveURL(/\/tools\/word-view$/)
  })
})
