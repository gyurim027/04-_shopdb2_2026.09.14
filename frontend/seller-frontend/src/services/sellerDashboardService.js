import { apiRequest } from './apiClient'

// 날짜를 백엔드가 사용하는 YYYY-MM-DD 형식으로 바꿉니다.
function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

// 선택한 기간을 시작일과 종료일로 계산합니다.
function createDateQuery(days) {
  const toDate = new Date()
  const fromDate = new Date()

  // 오늘을 포함하도록 days에서 1일을 뺍니다.
  fromDate.setDate(toDate.getDate() - (days - 1))

  const query = new URLSearchParams({
    from_dt: formatDate(fromDate),
    to_dt: formatDate(toDate),
  })

  return query.toString()
}

// 대시보드에 필요한 5개 데이터를 동시에 요청합니다.
export async function getSellerDashboard(days = 7) {
  const dateQuery = createDateQuery(days)

  const [
    productStatus,
    orders,
    sales,
    lowStock,
    refunds,
  ] = await Promise.all([
    apiRequest('/seller/dashboard/product-status'),
    apiRequest(`/seller/dashboard/orders?${dateQuery}`),
    apiRequest(`/seller/dashboard/sales?${dateQuery}`),
    apiRequest('/seller/dashboard/low-stock'),
    apiRequest('/seller/dashboard/refunds'),
  ])

  // DashboardPage에서 사용하기 쉬운 하나의 객체로 묶어 반환합니다.
  return {
    productStatus,
    orders,
    sales,
    lowStock,
    refunds,
  }
}