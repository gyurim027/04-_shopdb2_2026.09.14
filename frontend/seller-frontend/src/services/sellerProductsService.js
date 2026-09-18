import { apiRequest } from './apiClient'

// 로그인한 셀러의 상품 목록을 불러옵니다.
export async function getSellerProducts({
  page = 1,
  size = 20,
  productStatus = '',
  keyword = '',
} = {}) {
  const query = new URLSearchParams({
    page: String(page),
    size: String(size),
  })

  if (productStatus) {
    query.set('product_status', productStatus)
  }

  if (keyword.trim()) {
    query.set('keyword', keyword.trim())
  }

  return apiRequest(`/seller/products/products?${query.toString()}`)
}

// 상품 등록 화면에서 사용할 카테고리를 불러옵니다.
export async function getSellerCategories() {
  return apiRequest('/seller/products/categories')
}

// 새 상품을 등록합니다.
export async function createSellerProduct(values) {
  return apiRequest('/seller/products/products', {
    method: 'POST',
    body: JSON.stringify(values),
  })
}

// 기존 상품의 기본 정보와 판매 상태를 수정합니다.
export async function updateSellerProduct(productId, values) {
  return apiRequest(`/seller/products/products/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify(values),
  })
}

// 특정 상품의 옵션/SKU 목록을 불러옵니다.
export async function getSellerProductVariants(productId) {
  return apiRequest(
    `/seller/products/products/${productId}/variants`,
  )
}

// 특정 상품에 새로운 옵션/SKU를 등록합니다.
export async function createSellerProductVariant(productId, values) {
  return apiRequest(
    `/seller/products/products/${productId}/variants`,
    {
      method: 'POST',
      body: JSON.stringify(values),
    },
  )
}

// 기존 옵션/SKU 정보를 수정합니다.
export async function updateSellerProductVariant(variantId, values) {
  return apiRequest(
    `/seller/products/variants/${variantId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(values),
    },
  )
}

// 옵션/SKU를 비활성화합니다.
// DB에서 실제 삭제하지 않고 active_yn을 N으로 변경합니다.
export async function deactivateSellerProductVariant(variantId) {
  return apiRequest(
    `/seller/products/variants/${variantId}`,
    {
      method: 'DELETE',
    },
  )
}