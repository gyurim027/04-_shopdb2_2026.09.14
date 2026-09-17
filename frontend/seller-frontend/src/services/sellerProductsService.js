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