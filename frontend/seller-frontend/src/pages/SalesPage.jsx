import { useEffect, useMemo, useState } from 'react'

import { getSellerSales } from '../services/sellerSalesService'
import './SalesPage.css'

// 날짜를 YYYY-MM-DD 형식으로 변환합니다.
function formatInputDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

// 오늘을 포함한 최근 30일 기간을 만듭니다.
function createDefaultPeriod() {
  const toDate = new Date()
  const fromDate = new Date()

  fromDate.setDate(toDate.getDate() - 29)

  return {
    fromDate: formatInputDate(fromDate),
    toDate: formatInputDate(toDate),
  }
}

function formatCurrency(value) {
  return `${Number(value ?? 0).toLocaleString('ko-KR')}원`
}

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString('ko-KR')
}

function formatDisplayDate(value) {
  if (!value) {
    return '—'
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString('ko-KR')
}

function SalesPage() {
  const initialPeriod = createDefaultPeriod()

  // 날짜 입력값과 실제 API 조회 기간을 분리합니다.
  const [dateInput, setDateInput] = useState(initialPeriod)
  const [appliedPeriod, setAppliedPeriod] = useState(initialPeriod)

  const [salesData, setSalesData] = useState({
    daily: [],
    products: [],
    skus: [],
    paidTotal: null,
  })

  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isActive = true

    async function loadSales() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const data = await getSellerSales(
          appliedPeriod.fromDate,
          appliedPeriod.toDate,
        )

        if (isActive) {
          setSalesData(data)
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

    loadSales()

    return () => {
      isActive = false
    }
  }, [appliedPeriod])

  const periodSummary = useMemo(() => {
    return salesData.daily.reduce(
      (summary, item) => ({
        salesAmount:
          summary.salesAmount + Number(item.sales_amount),
        orderCount:
          summary.orderCount + Number(item.order_count),
      }),
      {
        salesAmount: 0,
        orderCount: 0,
      },
    )
  }, [salesData.daily])

  const maxDailySales = useMemo(() => {
    return Math.max(
      0,
      ...salesData.daily.map((item) =>
        Number(item.sales_amount),
      ),
    )
  }, [salesData.daily])

  function handleDateChange(event) {
    const { name, value } = event.target

    setDateInput((currentInput) => ({
      ...currentInput,
      [name]: value,
    }))
  }

  function handlePeriodSubmit(event) {
    event.preventDefault()
    setErrorMessage('')

    if (!dateInput.fromDate || !dateInput.toDate) {
      setErrorMessage('시작일과 종료일을 모두 선택해 주세요.')
      return
    }

    if (dateInput.fromDate > dateInput.toDate) {
      setErrorMessage('시작일은 종료일보다 늦을 수 없습니다.')
      return
    }

    setAppliedPeriod({ ...dateInput })
  }

  function resetPeriod() {
    const defaultPeriod = createDefaultPeriod()

    setDateInput(defaultPeriod)
    setAppliedPeriod(defaultPeriod)
    setErrorMessage('')
  }

  return (
    <section className="sales-page">
      <div className="sales-heading">
        <div>
          <h1>매출</h1>
          <p>기간별, 상품별, SKU별 판매 실적을 확인합니다.</p>
        </div>
      </div>

      <form className="sales-period-form" onSubmit={handlePeriodSubmit}>
        <label>
          <span>시작일</span>
          <input
            type="date"
            name="fromDate"
            value={dateInput.fromDate}
            onChange={handleDateChange}
          />
        </label>

        <span className="sales-period-separator">–</span>

        <label>
          <span>종료일</span>
          <input
            type="date"
            name="toDate"
            value={dateInput.toDate}
            onChange={handleDateChange}
          />
        </label>

        <button className="sales-search-button" type="submit">
          조회
        </button>

        <button
          className="sales-reset-button"
          type="button"
          onClick={resetPeriod}
        >
          최근 30일
        </button>
      </form>

      {errorMessage && (
        <div className="sales-message" role="alert">
          {errorMessage}
        </div>
      )}

      <div className="sales-summary-grid">
        <article className="sales-summary-card">
          <span>조회 기간 매출</span>
          <strong>
            {isLoading
              ? '—원'
              : formatCurrency(periodSummary.salesAmount)}
          </strong>
          <small>
            {formatDisplayDate(appliedPeriod.fromDate)} ~{' '}
            {formatDisplayDate(appliedPeriod.toDate)}
          </small>
        </article>

        <article className="sales-summary-card">
          <span>조회 기간 주문</span>
          <strong>
            {isLoading
              ? '—건'
              : `${formatNumber(periodSummary.orderCount)}건`}
          </strong>
          <small>일별 주문 건수 합계</small>
        </article>

        <article className="sales-summary-card is-primary">
          <span>결제 완료 누적 매출</span>
          <strong>
            {isLoading
              ? '—원'
              : formatCurrency(
                  salesData.paidTotal?.total_amount,
                )}
          </strong>
          <small>결제 완료된 전체 판매 금액</small>
        </article>
      </div>

      <section className="sales-panel">
        <div className="sales-panel-heading">
          <div>
            <h2>일별 매출</h2>
            <p>선택한 기간의 날짜별 주문과 판매 금액입니다.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="sales-empty-state">
            매출 데이터를 불러오는 중입니다.
          </div>
        ) : salesData.daily.length === 0 ? (
          <div className="sales-empty-state">
            선택한 기간에 매출 데이터가 없습니다.
          </div>
        ) : (
          <div className="daily-sales-list">
            {salesData.daily.map((item) => {
              const barWidth =
                maxDailySales > 0
                  ? (Number(item.sales_amount) / maxDailySales) * 100
                  : 0

              return (
                <div
                  className="daily-sales-row"
                  key={item.sale_date}
                >
                  <span className="daily-sales-date">
                    {formatDisplayDate(item.sale_date)}
                  </span>

                  <div className="daily-sales-bar-track">
                    <div
                      className="daily-sales-bar"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>

                  <strong>
                    {formatCurrency(item.sales_amount)}
                  </strong>

                  <span>
                    {formatNumber(item.order_count)}건
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <div className="sales-table-grid">
        <section className="sales-panel">
          <div className="sales-panel-heading">
            <div>
              <h2>상품별 매출</h2>
              <p>상품 단위의 누적 판매 실적입니다.</p>
            </div>
          </div>

          <div className="sales-table-wrapper">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>상품명</th>
                  <th>판매 수량</th>
                  <th>판매 금액</th>
                </tr>
              </thead>

              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan="3" className="sales-table-message">
                      데이터를 불러오는 중입니다.
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  salesData.products.length === 0 && (
                    <tr>
                      <td colSpan="3" className="sales-table-message">
                        상품별 매출이 없습니다.
                      </td>
                    </tr>
                  )}

                {!isLoading &&
                  salesData.products.map((product) => (
                    <tr key={product.product_id}>
                      <td>
                        <strong>{product.product_name}</strong>
                      </td>
                      <td>
                        {formatNumber(product.sold_quantity)}개
                      </td>
                      <td>{formatCurrency(product.sold_amount)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="sales-panel">
          <div className="sales-panel-heading">
            <div>
              <h2>SKU별 매출</h2>
              <p>상품 옵션 단위의 누적 판매 실적입니다.</p>
            </div>
          </div>

          <div className="sales-table-wrapper">
            <table className="sales-table">
              <thead>
                <tr>
                  <th>상품명/SKU</th>
                  <th>판매 수량</th>
                  <th>판매 금액</th>
                </tr>
              </thead>

              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan="3" className="sales-table-message">
                      데이터를 불러오는 중입니다.
                    </td>
                  </tr>
                )}

                {!isLoading && salesData.skus.length === 0 && (
                  <tr>
                    <td colSpan="3" className="sales-table-message">
                      SKU별 매출이 없습니다.
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  salesData.skus.map((sku) => (
                    <tr key={sku.variant_id}>
                      <td>
                        <div className="sales-product-cell">
                          <strong>{sku.product_name}</strong>
                          <span>{sku.sku_code}</span>
                        </div>
                      </td>
                      <td>{formatNumber(sku.sold_quantity)}개</td>
                      <td>{formatCurrency(sku.sold_amount)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  )
}

export default SalesPage