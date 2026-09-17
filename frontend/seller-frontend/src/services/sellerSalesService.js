import { apiRequest } from './apiClient'

// 선택 기간의 일별 매출을 불러옵니다.
export async function getDailySales(fromDate, toDate) {
  const query = new URLSearchParams({
    from_dt: fromDate,
    to_dt: toDate,
  })

  return apiRequest(`/seller/sales/daily?${query.toString()}`)
}

// 상품별 판매 실적을 불러옵니다.
export async function getProductSales() {
  return apiRequest('/seller/sales/products')
}

// SKU별 판매 실적을 불러옵니다.
export async function getSkuSales() {
  return apiRequest('/seller/sales/skus')
}

// 결제 완료된 누적 판매 금액을 불러옵니다.
export async function getPaidSalesTotal() {
  return apiRequest('/seller/sales/paid-total')
}

// 매출 화면에 필요한 데이터를 동시에 불러옵니다.
export async function getSellerSales(fromDate, toDate) {
  const [daily, products, skus, paidTotal] = await Promise.all([
    getDailySales(fromDate, toDate),
    getProductSales(),
    getSkuSales(),
    getPaidSalesTotal(),
  ])

  return {
    daily,
    products,
    skus,
    paidTotal,
  }
}