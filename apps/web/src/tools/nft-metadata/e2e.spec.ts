/**
 * nft-metadata E2E
 *
 * 前置：先构建并启动预览服务
 *   pnpm build && pnpm preview
 *   pnpm test:e2e
 */
import { expect, test } from '@playwright/test'

const BASE = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173'

test.describe('nft-metadata NFT 元数据 (#698)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/tools/nft-metadata')
  })

  test('页面标题为该工具名', async ({ page }) => {
    await expect(page).toHaveTitle(/NFT 元数据/)
  })

  test('非法 tokenId 点运行报错', async ({ page }) => {
    await page.getByTestId('input').fill('abc')
    await page.getByTestId('run').click()
    await expect(page.getByTestId('output')).toContainText('tokenId')
  })

  test('从首页搜索可达', async ({ page }) => {
    await page.goto(BASE)
    await page.getByRole('button', { name: /搜索/ }).first().click()
    await page.keyboard.type('NFT 元数据')
    await page.getByText('NFT 元数据', { exact: true }).first().click()
    await expect(page).toHaveURL(/\/tools\/nft-metadata$/)
  })
})
