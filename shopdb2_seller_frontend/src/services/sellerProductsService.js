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

  // 상태나 검색어가 있을 때만 주소에 추가합니다.
  if (productStatus) {
    query.set('product_status', productStatus)
  }

  if (keyword.trim()) {
    query.set('keyword', keyword.trim())
  }

  return apiRequest(`/seller/products/products?${query.toString()}`)
}

// 상품 등록 화면과 검색 필터에서 사용할 카테고리를 불러옵니다.
export async function getSellerCategories() {
  return apiRequest('/seller/products/categories')
}