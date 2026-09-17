import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { getSellerDashboard } from '../services/sellerDashboardService'
import './DashboardPage.css'

// 백엔드 상품 상태 코드와 화면의 한글 이름을 연결합니다.
const productStatusOptions = [
  { label: '전체 상품', code: 'ALL' },
  { label: '판매중', code: 'SALE' },
  { label: '품절', code: 'SOLD_OUT' },
  { label: '판매중지', code: 'STOPPED' },
  { label: '준비중', code: 'READY' },
]

// 숫자에 천 단위 쉼표를 표시합니다.
function formatNumber(value) {
  return Number(value ?? 0).toLocaleString('ko-KR')
}

// 금액에 천 단위 쉼표와 원 단위를 표시합니다.
function formatCurrency(value) {
  return `${formatNumber(value)}원`
}

function DashboardPage() {
  const navigate = useNavigate()

  // 백엔드에서 받은 대시보드 데이터를 저장합니다.
  const [dashboard, setDashboard] = useState(null)

  // 주문과 매출을 조회할 기간입니다. 기본값은 최근 7일입니다.
  const [periodDays, setPeriodDays] = useState(7)

  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isActive = true

    async function loadDashboard() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const data = await getSellerDashboard(periodDays)

        // 다른 페이지로 이동한 뒤에는 데이터를 저장하지 않습니다.
        if (isActive) {
          setDashboard(data)
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(error.message)
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      isActive = false
    }
  }, [periodDays])

  // 상품 상태별 API 응답을 화면 카드에서 사용하기 쉽게 변환합니다.
  const productStatuses = useMemo(() => {
    const statusList = dashboard?.productStatus ?? []

    const statusCountMap = Object.fromEntries(
      statusList.map((item) => [item.product_status, item.count]),
    )

    const totalCount = statusList.reduce(
      (total, item) => total + Number(item.count),
      0,
    )

    return productStatusOptions.map((status) => ({
      ...status,
      value:
        status.code === 'ALL'
          ? totalCount
          : Number(statusCountMap[status.code] ?? 0),
    }))
  }, [dashboard])

  function handlePeriodChange(event) {
    setPeriodDays(Number(event.target.value))
  }

  return (
    <section className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <h1>대시보드</h1>
          <p>상품, 주문, 매출, 재고와 환불 현황을 확인하세요.</p>
        </div>

        <button
          className="primary-button"
          type="button"
          onClick={() => navigate('/products')}
        >
          상품 등록
        </button>
      </div>

      {/* API 요청이 실패했을 때 오류 내용을 표시합니다. */}
      {errorMessage && (
        <div className="empty-state compact" role="alert">
          <strong>대시보드 데이터를 불러오지 못했습니다.</strong>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* S-DASH-01 상품 상태 요약 */}
      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>상품 현황</h2>
            <p>판매 상태별 등록 상품 수입니다.</p>
          </div>
        </div>

        <div className="product-status-grid">
          {productStatuses.map((status) => (
            <button
              className="product-status-card"
              type="button"
              key={status.code}
              onClick={() => navigate('/products')}
            >
              <span>{status.label}</span>
              <strong>
                {isLoading ? '—' : formatNumber(status.value)}
              </strong>
            </button>
          ))}
        </div>
      </section>

      <div className="dashboard-grid">
        {/* S-DASH-02 기간별 주문 현황 */}
        <section className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <h2>주문 현황</h2>
              <p>기간별 주문과 상품 수를 확인합니다.</p>
            </div>

            <select
              aria-label="주문 조회 기간"
              value={periodDays}
              onChange={handlePeriodChange}
            >
              <option value={7}>최근 7일</option>
              <option value={30}>최근 30일</option>
              <option value={90}>최근 3개월</option>
            </select>
          </div>

          <div className="metric-grid">
            <div className="metric-item">
              <span>주문 건수</span>
              <strong>
                {isLoading
                  ? '—'
                  : formatNumber(dashboard?.orders?.order_count)}
              </strong>
            </div>

            <div className="metric-item">
              <span>주문 상품 수</span>
              <strong>
                {isLoading
                  ? '—'
                  : formatNumber(dashboard?.orders?.item_quantity)}
              </strong>
            </div>
          </div>

          <div className="status-summary">
            <span>주문 조회 기간</span>
            <p>현재 최근 {periodDays}일의 주문을 집계하고 있습니다.</p>
          </div>

          <div className="panel-subheading">
            <strong>최근 주문</strong>

            <button
              className="text-button"
              type="button"
              onClick={() => navigate('/orders')}
            >
              전체 보기
            </button>
          </div>

          <div className="empty-state compact">
            <strong>주문 상세 내역</strong>
            <span>주문 관리 메뉴에서 전체 주문을 확인할 수 있습니다.</span>
          </div>
        </section>

        {/* S-DASH-03 기간별 매출 요약 */}
        <section className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <h2>매출 현황</h2>
              <p>상품 판매액 기준의 매출 현황입니다.</p>
            </div>

            <select
              aria-label="매출 조회 기간"
              value={periodDays}
              onChange={handlePeriodChange}
            >
              <option value={7}>최근 7일</option>
              <option value={30}>최근 30일</option>
              <option value={90}>최근 3개월</option>
            </select>
          </div>

          <div className="sales-total">
            <span>총 상품 판매액</span>
            <strong>
              {isLoading
                ? '—원'
                : formatCurrency(dashboard?.sales?.sales_amount)}
            </strong>
          </div>

          <div className="chart-placeholder">
            <strong>최근 {periodDays}일 매출</strong>
            <span>선택한 기간의 총 상품 판매액입니다.</span>
          </div>

          <div className="panel-subheading">
            <strong>상품별 매출</strong>

            <button
              className="text-button"
              type="button"
              onClick={() => navigate('/sales')}
            >
              자세히 보기
            </button>
          </div>

          <div className="empty-state compact">
            <strong>상품별 매출 내역</strong>
            <span>매출 메뉴에서 상품별 판매 실적을 확인할 수 있습니다.</span>
          </div>
        </section>

        {/* S-DASH-04 재고 부족 요약 */}
        <section className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <h2>재고 부족</h2>
              <p>안전재고 이하로 내려간 상품입니다.</p>
            </div>

            <span className="count-badge">
              {isLoading
                ? '—건'
                : `${formatNumber(dashboard?.lowStock?.low_stock_count)}건`}
            </span>
          </div>

          <div className="dashboard-table-wrapper">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>구분</th>
                  <th>현재 상태</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>안전재고 이하 상품</td>
                  <td>
                    {isLoading
                      ? '불러오는 중'
                      : `${formatNumber(
                          dashboard?.lowStock?.low_stock_count,
                        )}건`}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="panel-footer">
            <button
              className="text-button"
              type="button"
              onClick={() => navigate('/inventory')}
            >
              재고 관리 바로가기
            </button>
          </div>
        </section>

        {/* S-DASH-05 환불 요청 요약 */}
        <section className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <h2>환불 요청</h2>
              <p>처리를 기다리는 환불 요청입니다.</p>
            </div>

            <span className="count-badge">
              {isLoading
                ? '—건'
                : `${formatNumber(
                    dashboard?.refunds?.pending_refund_count,
                  )}건`}
            </span>
          </div>

          <div className="dashboard-table-wrapper">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>구분</th>
                  <th>요청 건수</th>
                  <th>요청 금액</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td>처리 대기 환불</td>
                  <td>
                    {isLoading
                      ? '—'
                      : `${formatNumber(
                          dashboard?.refunds?.pending_refund_count,
                        )}건`}
                  </td>
                  <td>
                    {isLoading
                      ? '—원'
                      : formatCurrency(
                          dashboard?.refunds?.pending_refund_amount,
                        )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="panel-footer">
            <button
              className="text-button"
              type="button"
              onClick={() => navigate('/refunds')}
            >
              환불 요청 전체 보기
            </button>
          </div>
        </section>
      </div>
    </section>
  )
}

export default DashboardPage