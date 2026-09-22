import { apiRequest } from './apiClient'

// 현재 장바구니에 남아 있는 내 상품의 요약 정보를 불러옵니다.
export async function getCartSummary() {
  return apiRequest('/seller/carts/summary')
}

// 상품별 장바구니 관심 현황을 불러옵니다.
export async function getCartProductInsights() {
  return apiRequest('/seller/carts/products')
}

// 옵션(SKU)별 장바구니 관심과 재고를 불러옵니다.
export async function getCartSkuInsights() {
  return apiRequest('/seller/carts/skus')
}

// 결제 선택 여부별 장바구니 현황을 불러옵니다.
export async function getCartSelectionStatus() {
  return apiRequest('/seller/carts/selection-status')
}

// 장바구니에 7일 이상 남아 있는 상품을 불러옵니다.
export async function getLongHeldCartItems() {
  return apiRequest('/seller/carts/long-held')
}

// 장바구니 분석 화면에 필요한 데이터를 동시에 불러옵니다.
export async function getSellerCartInsights() {
  const [
    summary,
    products,
    skus,
    selectionStatus,
    longHeldItems,
  ] = await Promise.all([
    getCartSummary(),
    getCartProductInsights(),
    getCartSkuInsights(),
    getCartSelectionStatus(),
    getLongHeldCartItems(),
  ])

  return {
    summary,
    products,
    skus,
    selectionStatus,
    longHeldItems,
  }
}