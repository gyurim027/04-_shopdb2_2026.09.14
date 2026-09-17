import { apiRequest } from './apiClient'

// 로그인한 셀러의 전체 재고 목록을 불러옵니다.
export async function getSellerInventories(keyword = '') {
  const query = new URLSearchParams()

  if (keyword.trim()) {
    query.set('keyword', keyword.trim())
  }

  const queryString = query.toString()
  const path = queryString
    ? `/seller/inventory?${queryString}`
    : '/seller/inventory'

  return apiRequest(path)
}

// 안전재고 이하인 재고만 불러옵니다.
export async function getLowStockInventories() {
  return apiRequest('/seller/inventory/low-stock')
}

// 현재재고 또는 안전재고를 수정합니다.
export async function updateSellerInventory(inventoryId, values) {
  return apiRequest(`/seller/inventory/${inventoryId}`, {
    method: 'PATCH',
    body: JSON.stringify(values),
  })
}