import { useEffect, useMemo, useState } from 'react'

import { getSellerCartInsights } from '../services/sellerCartsService'
import './CartInsightsPage.css'

const PRODUCT_STATUS_LABELS = {
  READY: '판매 준비',
  SALE: '판매중',
  SOLD_OUT: '품절',
  STOPPED: '판매중지',
  DELETED: '삭제',
}

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString('ko-KR')
}

function formatCurrency(value) {
  return `${Number(value ?? 0).toLocaleString('ko-KR')}원`
}

function formatOption(item) {
  const options = [
    item.option_name1 && item.option_value1
      ? `${item.option_name1}: ${item.option_value1}`
      : '',
    item.option_name2 && item.option_value2
      ? `${item.option_name2}: ${item.option_value2}`
      : '',
  ].filter(Boolean)

  return options.length > 0 ? options.join(' / ') : '기본 옵션'
}

function getStockStatus(item) {
  const availableQuantity = Number(item.available_quantity ?? 0)
  const cartQuantity = Number(item.total_quantity ?? 0)

  if (availableQuantity === 0) {
    return {
      label: '판매 가능 재고 없음',
      className: 'is-danger',
    }
  }

  if (availableQuantity < cartQuantity) {
    return {
      label: '관심 수량보다 재고 부족',
      className: 'is-warning',
    }
  }

  return {
    label: '재고 여유',
    className: 'is-normal',
  }
}

function CartInsightsPage() {
  const [cartData, setCartData] = useState({
    summary: {
      cart_count: 0,
      buyer_count: 0,
      total_quantity: 0,
      estimated_amount: '0.00',
    },
    products: [],
    skus: [],
    selectionStatus: [],
    longHeldItems: [],
  })

  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isActive = true

    async function loadCartInsights() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const data = await getSellerCartInsights()

        if (isActive) {
          setCartData(data)
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

    loadCartInsights()

    return () => {
      isActive = false
    }
  }, [reloadKey])

  const selectionSummary = useMemo(() => {
    const selected = cartData.selectionStatus.find(
      (item) => item.selected_yn === 'Y',
    )

    const unselected = cartData.selectionStatus.find(
      (item) => item.selected_yn === 'N',
    )

    return {
      selected: selected || {
        selected_yn: 'Y',
        cart_count: 0,
        total_quantity: 0,
        estimated_amount: '0.00',
      },
      unselected: unselected || {
        selected_yn: 'N',
        cart_count: 0,
        total_quantity: 0,
        estimated_amount: '0.00',
      },
    }
  }, [cartData.selectionStatus])

  function refreshCartInsights() {
    setReloadKey((currentKey) => currentKey + 1)
  }

  return (
    <section className="cart-insights-page">
      <div className="cart-insights-heading">
        <div>
          <h1>장바구니 관심 분석</h1>
          <p>
            고객 장바구니에 현재 남아 있는 내 상품의 관심 현황을
            확인합니다.
          </p>
        </div>

        <button
          className="cart-refresh-button"
          type="button"
          onClick={refreshCartInsights}
          disabled={isLoading}
        >
          {isLoading ? '불러오는 중' : '새로고침'}
        </button>
      </div>

      <div className="cart-policy-notice">
        <strong>현재 장바구니 기준</strong>
        <p>
          고객 개인정보는 제공하지 않으며, 현재 장바구니에 남아 있는
          상품만 집계합니다. 장바구니 이탈률이나 구매 전환율을 의미하지
          않습니다.
        </p>
      </div>

      {errorMessage && (
        <div className="cart-error-message" role="alert">
          <span>{errorMessage}</span>

          <button type="button" onClick={refreshCartInsights}>
            다시 시도
          </button>
        </div>
      )}

      <div className="cart-summary-grid" aria-live="polite">
        <article className="cart-summary-card is-primary">
          <span>관심 장바구니</span>
          <strong>
            {isLoading
              ? '—건'
              : `${formatNumber(cartData.summary.cart_count)}건`}
          </strong>
          <small>내 상품이 포함된 현재 장바구니</small>
        </article>

        <article className="cart-summary-card">
          <span>관심 고객</span>
          <strong>
            {isLoading
              ? '—명'
              : `${formatNumber(cartData.summary.buyer_count)}명`}
          </strong>
          <small>개인정보를 제외한 고객 수 집계</small>
        </article>

        <article className="cart-summary-card">
          <span>관심 상품 수량</span>
          <strong>
            {isLoading
              ? '—개'
              : `${formatNumber(cartData.summary.total_quantity)}개`}
          </strong>
          <small>현재 장바구니에 담긴 총수량</small>
        </article>

        <article className="cart-summary-card">
          <span>장바구니 추정 금액</span>
          <strong>
            {isLoading
              ? '—원'
              : formatCurrency(cartData.summary.estimated_amount)}
          </strong>
          <small>현재 판매가와 옵션 추가금 기준</small>
        </article>
      </div>

      <section className="cart-panel">
        <div className="cart-panel-heading">
          <div>
            <h2>결제 선택 상태</h2>
            <p>
              고객이 현재 결제 대상으로 선택한 상품과 선택하지 않은
              상품을 비교합니다.
            </p>
          </div>
        </div>

        <div className="cart-selection-grid">
          <article className="cart-selection-card is-selected">
            <div>
              <span className="cart-selection-label">결제 선택</span>
              <strong>
                {isLoading
                  ? '—개'
                  : `${formatNumber(
                      selectionSummary.selected.total_quantity,
                    )}개`}
              </strong>
            </div>

            <dl>
              <div>
                <dt>장바구니</dt>
                <dd>
                  {formatNumber(
                    selectionSummary.selected.cart_count,
                  )}
                  건
                </dd>
              </div>

              <div>
                <dt>추정 금액</dt>
                <dd>
                  {formatCurrency(
                    selectionSummary.selected.estimated_amount,
                  )}
                </dd>
              </div>
            </dl>
          </article>

          <article className="cart-selection-card">
            <div>
              <span className="cart-selection-label">결제 미선택</span>
              <strong>
                {isLoading
                  ? '—개'
                  : `${formatNumber(
                      selectionSummary.unselected.total_quantity,
                    )}개`}
              </strong>
            </div>

            <dl>
              <div>
                <dt>장바구니</dt>
                <dd>
                  {formatNumber(
                    selectionSummary.unselected.cart_count,
                  )}
                  건
                </dd>
              </div>

              <div>
                <dt>추정 금액</dt>
                <dd>
                  {formatCurrency(
                    selectionSummary.unselected.estimated_amount,
                  )}
                </dd>
              </div>
            </dl>
          </article>
        </div>
      </section>

      <section className="cart-panel">
        <div className="cart-panel-heading">
          <div>
            <h2>상품별 관심 현황</h2>
            <p>장바구니 수가 많은 상품부터 확인할 수 있습니다.</p>
          </div>
        </div>

        <div className="cart-table-wrapper">
          <table className="cart-table">
            <thead>
              <tr>
                <th>상품</th>
                <th>판매 상태</th>
                <th>장바구니</th>
                <th>관심 수량</th>
                <th>추정 금액</th>
              </tr>
            </thead>

            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan="5" className="cart-table-message">
                    상품별 관심 현황을 불러오는 중입니다.
                  </td>
                </tr>
              )}

              {!isLoading && cartData.products.length === 0 && (
                <tr>
                  <td colSpan="5" className="cart-table-message">
                    현재 장바구니에 담긴 내 상품이 없습니다.
                  </td>
                </tr>
              )}

              {!isLoading &&
                cartData.products.map((product) => (
                  <tr key={product.product_id}>
                    <td>
                      <div className="cart-product-cell">
                        <strong>{product.product_name}</strong>
                        <span>{product.product_code}</span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`cart-product-status status-${product.product_status.toLowerCase()}`}
                      >
                        {PRODUCT_STATUS_LABELS[
                          product.product_status
                        ] || product.product_status}
                      </span>
                    </td>

                    <td>
                      {formatNumber(product.cart_count)}건
                    </td>

                    <td>
                      {formatNumber(product.total_quantity)}개
                    </td>

                    <td>
                      {formatCurrency(product.estimated_amount)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cart-panel">
        <div className="cart-panel-heading">
          <div>
            <h2>옵션별 관심과 재고</h2>
            <p>
              관심 수량과 현재 판매 가능한 재고를 함께 비교합니다.
            </p>
          </div>
        </div>

        <div className="cart-table-wrapper">
          <table className="cart-table cart-sku-table">
            <thead>
              <tr>
                <th>상품/SKU</th>
                <th>옵션</th>
                <th>장바구니</th>
                <th>관심 수량</th>
                <th>판매 가능 재고</th>
                <th>재고 상태</th>
              </tr>
            </thead>

            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan="6" className="cart-table-message">
                    옵션별 관심 현황을 불러오는 중입니다.
                  </td>
                </tr>
              )}

              {!isLoading && cartData.skus.length === 0 && (
                <tr>
                  <td colSpan="6" className="cart-table-message">
                    현재 확인할 옵션별 장바구니 데이터가 없습니다.
                  </td>
                </tr>
              )}

              {!isLoading &&
                cartData.skus.map((sku) => {
                  const stockStatus = getStockStatus(sku)

                  return (
                    <tr key={sku.variant_id}>
                      <td>
                        <div className="cart-product-cell">
                          <strong>{sku.product_name}</strong>
                          <span>{sku.sku_code}</span>
                        </div>
                      </td>

                      <td>{formatOption(sku)}</td>

                      <td>{formatNumber(sku.cart_count)}건</td>

                      <td>
                        {formatNumber(sku.total_quantity)}개
                      </td>

                      <td>
                        {formatNumber(sku.available_quantity)}개
                      </td>

                      <td>
                        <span
                          className={`cart-stock-status ${stockStatus.className}`}
                        >
                          {stockStatus.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cart-panel">
        <div className="cart-panel-heading">
          <div>
            <h2>장기 보유 상품</h2>
            <p>
              장바구니에 추가된 후 7일 이상 남아 있는 상품입니다.
            </p>
          </div>
        </div>

        <div className="cart-table-wrapper">
          <table className="cart-table">
            <thead>
              <tr>
                <th>보유 기간</th>
                <th>상품/SKU</th>
                <th>옵션</th>
                <th>장바구니</th>
                <th>관심 수량</th>
                <th>추정 금액</th>
              </tr>
            </thead>

            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan="6" className="cart-table-message">
                    장기 보유 상품을 불러오는 중입니다.
                  </td>
                </tr>
              )}

              {!isLoading &&
                cartData.longHeldItems.length === 0 && (
                  <tr>
                    <td colSpan="6" className="cart-table-message">
                      7일 이상 장바구니에 남아 있는 상품이 없습니다.
                    </td>
                  </tr>
                )}

              {!isLoading &&
                cartData.longHeldItems.map((item) => (
                  <tr
                    key={`${item.hold_period}-${item.variant_id}`}
                  >
                    <td>
                      <span className="cart-hold-period">
                        {item.hold_period}
                      </span>
                    </td>

                    <td>
                      <div className="cart-product-cell">
                        <strong>{item.product_name}</strong>
                        <span>{item.sku_code}</span>
                      </div>
                    </td>

                    <td>{formatOption(item)}</td>

                    <td>{formatNumber(item.cart_count)}건</td>

                    <td>
                      {formatNumber(item.total_quantity)}개
                    </td>

                    <td>
                      {formatCurrency(item.estimated_amount)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}

export default CartInsightsPage