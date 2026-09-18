import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  ChevronRight,
  ImageOff,
  Minus,
  PackageCheck,
  Plus,
  RotateCcw,
  ShoppingBag,
  Store,
  Trash2,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { customerApi } from '../api/customer'
import { resolveMediaUrl } from '../api/client'
import { useToast } from '../context/ToastContext'

const money = (value) => Number(value || 0).toLocaleString('ko-KR')

function groupBySeller(items = []) {
  return items.reduce((groups, item) => {
    const key = String(item.org_id)
    if (!groups[key]) {
      groups[key] = {
        org_id: item.org_id,
        org_name: item.org_name,
        seller_name: item.seller_name,
        items: [],
      }
    }
    groups[key].items.push(item)
    return groups
  }, {})
}

function sellerLabel(group) {
  return group?.seller_name || group?.org_name || `판매사 #${group?.org_id}`
}

function CartThumb({ item }) {
  const [failed, setFailed] = useState(false)
  const src = resolveMediaUrl(item.main_image_url)

  if (!src || failed) {
    return (
      <div className="cart-thumb cart-thumb-empty">
        <ImageOff size={24} />
      </div>
    )
  }

  return (
    <div className="cart-thumb">
      <img src={src} alt={item.product_name} onError={() => setFailed(true)} />
    </div>
  )
}

export default function CartPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [cart, setCart] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [addressId, setAddressId] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyItemId, setBusyItemId] = useState(null)
  const [checkoutBusy, setCheckoutBusy] = useState(false)
  const [error, setError] = useState('')

  const notifyCartUpdated = () => {
    window.dispatchEvent(new CustomEvent('shopdb2:cart-updated'))
  }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [cartData, addressData] = await Promise.all([
        customerApi.getCart(),
        customerApi.getAddresses().catch(() => []),
      ])
      setCart(cartData)
      const safeAddresses = Array.isArray(addressData) ? addressData : []
      setAddresses(safeAddresses)
      const defaultAddress = safeAddresses.find((item) => item.default_yn === 'Y') || safeAddresses[0]
      setAddressId(defaultAddress ? String(defaultAddress.address_id) : '')
    } catch (e) {
      setError(e.message || '장바구니를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const groups = useMemo(
    () => Object.values(groupBySeller(cart?.items || [])),
    [cart?.items],
  )

  const selectedItems = useMemo(
    () => (cart?.items || []).filter((item) => item.selected_yn === 'Y'),
    [cart?.items],
  )

  const applyCartResponse = (nextCart) => {
    setCart(nextCart)
    notifyCartUpdated()
  }

  const setSelected = async (item, selected) => {
    setBusyItemId(item.cart_item_id)
    setError('')
    try {
      const nextCart = await customerApi.updateCartItemSelected(item.cart_item_id, {
        selected_yn: selected ? 'Y' : 'N',
      })
      applyCartResponse(nextCart)
    } catch (e) {
      setError(e.message || '상품 선택 상태를 변경하지 못했습니다.')
    } finally {
      setBusyItemId(null)
    }
  }

  const setGroupSelected = async (group, selected) => {
    setCheckoutBusy(true)
    setError('')
    try {
      let nextCart = cart
      for (const item of group.items) {
        if ((item.selected_yn === 'Y') === selected) continue
        nextCart = await customerApi.updateCartItemSelected(item.cart_item_id, {
          selected_yn: selected ? 'Y' : 'N',
        })
      }
      if (nextCart) applyCartResponse(nextCart)
    } catch (e) {
      setError(e.message || '판매사 상품 선택 상태를 변경하지 못했습니다.')
    } finally {
      setCheckoutBusy(false)
    }
  }

  const updateQuantity = async (item, quantity) => {
    const nextQuantity = Math.max(1, Math.min(100, Number(quantity) || 1))
    if (nextQuantity > Number(item.available_quantity || 0)) {
      setError(`현재 구매 가능 재고는 ${Number(item.available_quantity || 0)}개입니다.`)
      return
    }

    setBusyItemId(item.cart_item_id)
    setError('')
    try {
      const nextCart = await customerApi.updateCartItemQuantity(item.cart_item_id, {
        quantity: nextQuantity,
      })
      applyCartResponse(nextCart)
    } catch (e) {
      setError(e.message || '수량을 변경하지 못했습니다.')
    } finally {
      setBusyItemId(null)
    }
  }

  const removeItem = async (item) => {
    if (!window.confirm(`'${item.product_name}'을 장바구니에서 삭제할까요?`)) return

    setBusyItemId(item.cart_item_id)
    setError('')
    try {
      const nextCart = await customerApi.deleteCartItem(item.cart_item_id)
      applyCartResponse(nextCart)
      showToast('장바구니에서 상품을 삭제했습니다.')
    } catch (e) {
      setError(e.message || '상품을 삭제하지 못했습니다.')
    } finally {
      setBusyItemId(null)
    }
  }

  const createOrders = async () => {
    if (!selectedItems.length) {
      setError('주문할 상품을 하나 이상 선택해주세요.')
      return
    }
    if (!addressId) {
      setError('주문에 사용할 배송지를 선택해주세요.')
      return
    }

    const selectedGroups = Object.values(groupBySeller(selectedItems))
    if (!window.confirm(`${selectedItems.length}개 장바구니 상품을 판매사 ${selectedGroups.length}곳의 주문으로 생성할까요?`)) return

    setCheckoutBusy(true)
    setError('')
    const createdOrders = []

    try {
      for (const group of selectedGroups) {
        const order = await customerApi.createOrder({
          address_id: Number(addressId),
          org_id: Number(group.org_id),
          items: group.items.map((item) => ({
            product_id: Number(item.product_id),
            variant_id: Number(item.variant_id),
            quantity: Number(item.quantity),
          })),
        })

        createdOrders.push({
          order_id: order.order_id,
          order_no: order.order_no,
          org_id: group.org_id,
          seller_name: sellerLabel(group),
          cart_item_ids: group.items.map((item) => Number(item.cart_item_id)),
        })
      }

      sessionStorage.setItem('shopdb2_cart_checkout_orders', JSON.stringify(createdOrders))
      showToast(`판매사별 주문 ${createdOrders.length}건을 생성했습니다.`, 'info')
      navigate('/cart/checkout', { state: { createdOrders } })
    } catch (e) {
      if (createdOrders.length) {
        sessionStorage.setItem('shopdb2_cart_checkout_orders', JSON.stringify(createdOrders))
        setError(`일부 주문(${createdOrders.length}건)은 생성되었지만 이후 주문 생성에 실패했습니다. 결제 화면에서 생성된 주문을 확인해주세요.`)
        showToast('일부 주문만 생성되었습니다.', 'error')
        navigate('/cart/checkout', { state: { createdOrders, partialError: e.message } })
        return
      }
      setError(e.message || '장바구니 주문 생성에 실패했습니다.')
      showToast(e.message || '장바구니 주문 생성에 실패했습니다.', 'error')
    } finally {
      setCheckoutBusy(false)
    }
  }

  if (loading) {
    return <div className="container page-section"><div className="loading-box">장바구니를 불러오는 중...</div></div>
  }

  return (
    <div className="container page-section cart-page">
      <div className="page-title cart-page-title">
        <span>SHOPPING CART</span>
        <h1>장바구니</h1>
        <p>판매사별 상품을 확인하고 이번 주문에 포함할 상품만 선택하세요.</p>
      </div>

      {error && (
        <div className="notice error retry-notice">
          {error}
          <button type="button" onClick={() => setError('')}><RotateCcw size={14} /> 닫기</button>
        </div>
      )}

      {!cart?.items?.length ? (
        <div className="cart-empty panel">
          <ShoppingBag size={42} />
          <strong>장바구니가 비어 있습니다.</strong>
          <span>상품 상세에서 판매사와 옵션을 선택한 뒤 장바구니에 담아보세요.</span>
          <Link className="btn btn-primary" to="/products">상품 보러가기</Link>
        </div>
      ) : (
        <div className="cart-layout">
          <section className="cart-seller-list">
            {groups.map((group) => {
              const groupSelected = group.items.every((item) => item.selected_yn === 'Y')
              const groupAmount = group.items
                .filter((item) => item.selected_yn === 'Y')
                .reduce((sum, item) => sum + Number(item.item_amount || 0), 0)

              return (
                <div className="cart-seller-card" key={group.org_id}>
                  <div className="cart-seller-head">
                    <label className="cart-check-label">
                      <input
                        type="checkbox"
                        checked={groupSelected}
                        onChange={(e) => setGroupSelected(group, e.target.checked)}
                        disabled={checkoutBusy}
                      />
                      <span className="cart-check-box"><Check size={13} /></span>
                    </label>
                    <Store size={18} />
                    <div>
                      <strong>{sellerLabel(group)}</strong>
                      {group.org_name && group.org_name !== group.seller_name && <span>{group.org_name}</span>}
                    </div>
                    <b>{money(groupAmount)}원</b>
                  </div>

                  <div className="cart-item-list">
                    {group.items.map((item) => {
                      const selected = item.selected_yn === 'Y'
                      const busy = busyItemId === item.cart_item_id
                      const maxQty = Math.max(1, Math.min(100, Number(item.available_quantity || 0)))

                      return (
                        <div className={`cart-item-row ${selected ? 'is-selected' : ''}`} key={item.cart_item_id}>
                          <label className="cart-check-label item-check">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={(e) => setSelected(item, e.target.checked)}
                              disabled={busy || checkoutBusy}
                            />
                            <span className="cart-check-box"><Check size={13} /></span>
                          </label>

                          <Link to={`/products/${item.product_id}`} className="cart-product-link">
                            <CartThumb item={item} />
                            <div className="cart-product-copy">
                              <strong>{item.product_name}</strong>
                              <span>{[item.option_value1, item.option_value2].filter(Boolean).join(' / ') || item.sku_code}</span>
                              <small>선택 판매사 재고 {Number(item.available_quantity || 0)}개</small>
                            </div>
                          </Link>

                          <div className="cart-item-controls">
                            <div className="cart-qty-control">
                              <button type="button" disabled={busy || item.quantity <= 1} onClick={() => updateQuantity(item, Number(item.quantity) - 1)}><Minus size={14} /></button>
                              <input
                                type="number"
                                min="1"
                                max={maxQty}
                                value={item.quantity}
                                disabled={busy}
                                onChange={(e) => {
                                  const value = e.target.value
                                  setCart((prev) => ({
                                    ...prev,
                                    items: prev.items.map((row) => row.cart_item_id === item.cart_item_id ? { ...row, quantity: value } : row),
                                  }))
                                }}
                                onBlur={(e) => updateQuantity(item, e.target.value)}
                              />
                              <button type="button" disabled={busy || Number(item.quantity) >= maxQty} onClick={() => updateQuantity(item, Number(item.quantity) + 1)}><Plus size={14} /></button>
                            </div>
                            <strong>{money(item.item_amount)}원</strong>
                            <button className="cart-delete-button" type="button" onClick={() => removeItem(item)} disabled={busy}><Trash2 size={16} /> 삭제</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </section>

          <aside className="cart-summary-card">
            <div className="cart-summary-title"><PackageCheck size={19} /><strong>주문 예정 금액</strong></div>
            <div className="cart-summary-line"><span>선택 상품</span><b>{cart.selected_item_count || 0}개</b></div>
            <div className="cart-summary-line"><span>선택 수량</span><b>{cart.selected_quantity || 0}개</b></div>
            <div className="cart-summary-line"><span>판매사</span><b>{Object.keys(groupBySeller(selectedItems)).length}곳</b></div>
            <div className="cart-summary-total"><span>상품금액</span><strong>{money(cart.selected_amount)}원</strong></div>

            <label className="cart-address-label">
              배송지
              {addresses.length ? (
                <select value={addressId} onChange={(e) => setAddressId(e.target.value)}>
                  {addresses.map((address) => (
                    <option key={address.address_id} value={address.address_id}>
                      {address.default_yn === 'Y' ? '[기본] ' : ''}{address.address_name || '배송지'} - {address.address1}
                    </option>
                  ))}
                </select>
              ) : (
                <Link className="cart-address-missing" to="/addresses">배송지를 먼저 등록해주세요 <ChevronRight size={14} /></Link>
              )}
            </label>

            <button
              type="button"
              className="btn btn-primary cart-checkout-button"
              onClick={createOrders}
              disabled={checkoutBusy || !selectedItems.length || !addressId}
            >
              {checkoutBusy ? '주문 생성 중...' : `선택상품 주문하기 (${cart.selected_item_count || 0})`}
            </button>
            <p>판매사가 다르면 주문이 판매사별로 나뉘어 생성됩니다.</p>
          </aside>
        </div>
      )}
    </div>
  )
}
