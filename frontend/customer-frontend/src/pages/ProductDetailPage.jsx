import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  ChevronLeft,
  ImageOff,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
} from 'lucide-react'
import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom'

import { customerApi } from '../api/customer'
import { resolveMediaUrl } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'


const money = (value) => (
  Number(value || 0).toLocaleString('ko-KR')
)


function discountRate(product) {
  const regular = Number(
    product?.regular_price || 0
  )

  const sale = Number(
    product?.sale_price || 0
  )

  if (
    !regular
    || sale >= regular
  ) {
    return 0
  }

  return Math.round(
    ((regular - sale) / regular) * 100
  )
}


function sellerLabel(seller) {
  return (
    seller?.seller_name
    || seller?.org_name
    || `판매자 #${seller?.org_id}`
  )
}


function normalizeSellers(rawSellers) {
  const rows = Array.isArray(rawSellers) ? rawSellers : []
  const byOrg = new Map()

  rows.forEach((item) => {
    if (item?.org_id === undefined || item?.org_id === null) return

    const key = String(item.org_id)
    const current = byOrg.get(key)
    const available = Math.max(0, Number(item.available_quantity || 0))

    if (!current) {
      byOrg.set(key, {
        ...item,
        available_quantity: available,
      })
      return
    }

    byOrg.set(key, {
      ...current,
      seller_name: current.seller_name || item.seller_name,
      org_name: current.org_name || item.org_name,
      available_quantity: Number(current.available_quantity || 0) + available,
    })
  })

  return [...byOrg.values()].sort((a, b) => {
    const stockDiff = Number(b.available_quantity || 0) - Number(a.available_quantity || 0)
    if (stockDiff !== 0) return stockDiff
    return Number(a.org_id || 0) - Number(b.org_id || 0)
  })
}


function getImageSource(imageItem) {
  if (!imageItem) {
    return null
  }

  return resolveMediaUrl(
    imageItem.content_url
    || imageItem.public_url
    || imageItem.thumbnail_url
  )
}


export default function ProductDetailPage() {
  const { productId } = useParams()

  const navigate = useNavigate()

  const { isLoggedIn } = useAuth()

  const { showToast } = useToast()

  const [product, setProduct] = useState(null)

  const [variantId, setVariantId] = useState('')

  const [orgId, setOrgId] = useState('')

  const [qty, setQty] = useState(1)

  const [addresses, setAddresses] = useState([])

  const [addressId, setAddressId] = useState('')

  const [error, setError] = useState('')

  const [loading, setLoading] = useState(true)

  const [busy, setBusy] = useState(false)

  const [cartBusy, setCartBusy] = useState(false)

  const [activeImage, setActiveImage] = useState(0)

  const [imageFailed, setImageFailed] = useState(false)


  const loadProduct = async () => {
    setLoading(true)
    setError('')

    try {
      const loadedProduct = (
        await customerApi.getProduct(
          productId
        )
      )

      setProduct(loadedProduct)

      const firstVariant = (
        loadedProduct.variants?.find(
          (item) => (
            Number(
              item.available_quantity || 0
            ) > 0
          )
        )
        || loadedProduct.variants?.[0]
      )

      if (firstVariant) {
        setVariantId(
          String(firstVariant.variant_id)
        )

        const firstSeller = (
          (firstVariant.sellers || []).find(
            (sellerItem) => (
              Number(
                sellerItem.available_quantity
                || 0
              ) > 0
            )
          )
          || firstVariant.sellers?.[0]
        )

        setOrgId(
          firstSeller
            ? String(firstSeller.org_id)
            : ''
        )
      } else {
        setVariantId('')
        setOrgId('')
      }

      setActiveImage(0)
      setImageFailed(false)
    } catch (e) {
      setError(
        e.message
        || '상품 정보를 불러오지 못했습니다.'
      )
    } finally {
      setLoading(false)
    }
  }


  const loadAddresses = async () => {
    if (!isLoggedIn) {
      return
    }

    try {
      const list = (
        await customerApi.getAddresses()
      )

      const safeList = (
        Array.isArray(list)
          ? list
          : []
      )

      setAddresses(safeList)

      const defaultAddress = (
        safeList.find(
          (item) => (
            item.default_yn === 'Y'
          )
        )
        || safeList[0]
      )

      if (defaultAddress) {
        setAddressId(
          String(
            defaultAddress.address_id
          )
        )
      }
    } catch {
      setAddresses([])
    }
  }


  useEffect(() => {
    loadProduct()
  }, [productId])


  useEffect(() => {
    loadAddresses()
  }, [isLoggedIn])


  const variant = useMemo(
    () => (
      product?.variants?.find(
        (item) => (
          String(item.variant_id)
          === String(variantId)
        )
      )
    ),
    [
      product,
      variantId,
    ],
  )


  const sellers = useMemo(
    () => normalizeSellers(variant?.sellers),
    [variant],
  )


  const seller = useMemo(
    () => (
      sellers.find(
        (item) => (
          String(item.org_id)
          === String(orgId)
        )
      )
    ),
    [
      sellers,
      orgId,
    ],
  )


  const sellerAvailable = Number(
    seller?.available_quantity || 0
  )


  const sellerStockTotal = useMemo(
    () => sellers.reduce(
      (sum, item) => sum + Math.max(0, Number(item.available_quantity || 0)),
      0,
    ),
    [sellers],
  )


  const variantAvailable = Math.max(
    0,
    Number(variant?.available_quantity || 0),
  )


  const stockMismatch = (
    variant
    && variantAvailable !== sellerStockTotal
  )


  const soldOut = (
    !variant
    || !seller
    || sellerAvailable <= 0
  )


  const total = (
    product
      ? (
          Number(product.sale_price)
          + Number(
            variant?.additional_price
            || 0
          )
        ) * qty
      : 0
  )


  const rate = discountRate(product)


  /*
   * 백엔드에서 내려오는 모든 상품 이미지를
   * 실제 브라우저에서 사용할 수 있는 URL로 변환한다.
   *
   * 우선순위:
   * 1. content_url
   * 2. public_url
   * 3. thumbnail_url
   */
  const allImages = useMemo(() => {
    const raw = (
      Array.isArray(product?.images)
        ? product.images
        : []
    )

    return raw
      .map((imageItem) => ({
        ...imageItem,
        src: getImageSource(imageItem),
      }))
      .filter(
        (imageItem) => imageItem.src
      )
  }, [product])


  /*
   * 상품 상단 대표 이미지 영역.
   *
   * DETAIL 이미지는 긴 상세페이지에서 사용하므로
   * 기본적으로 상단 갤러리에서는 제외한다.
   */
  const galleryImages = useMemo(() => {
    const nonDetailImages = (
      allImages.filter(
        (item) => (
          item.image_type !== 'DETAIL'
        )
      )
    )

    if (nonDetailImages.length) {
      return nonDetailImages
    }

    /*
     * MAIN이 없는 비정상 데이터라면
     * DETAIL 이미지라도 첫 이미지를 대표 이미지로 보여준다.
     */
    if (allImages.length) {
      return [allImages[0]]
    }

    if (product?.main_image_url) {
      const fallbackUrl = resolveMediaUrl(
        product.main_image_url
      )

      if (fallbackUrl) {
        return [
          {
            src: fallbackUrl,
            image_type: 'MAIN',
            alt_text: product.product_name,
          },
        ]
      }
    }

    return []
  }, [
    allImages,
    product,
  ])


  /*
   * 쿠팡형 상품 상세영역에 세로로 표시할 DETAIL 이미지.
   *
   * 백엔드에서도 정렬하지만 프론트에서도 한 번 더
   * display_order → product_image_id 순으로 정렬한다.
   */
  const detailImages = useMemo(
    () => (
      allImages
        .filter(
          (item) => (
            item.image_type === 'DETAIL'
          )
        )
        .sort((a, b) => {
          const orderDiff = (
            Number(a.display_order || 0)
            - Number(b.display_order || 0)
          )

          if (orderDiff !== 0) {
            return orderDiff
          }

          return (
            Number(
              a.product_image_id || 0
            )
            - Number(
              b.product_image_id || 0
            )
          )
        })
    ),
    [allImages],
  )


  const image = (
    galleryImages[activeImage]?.src
    || ''
  )


  const activeImageItem = (
    galleryImages[activeImage]
  )


  useEffect(() => {
    setImageFailed(false)
  }, [
    activeImage,
    image,
  ])


  useEffect(() => {
    if (
      activeImage
      >= galleryImages.length
    ) {
      setActiveImage(0)
    }
  }, [
    galleryImages,
    activeImage,
  ])


  useEffect(() => {
    if (!variant) {
      setOrgId('')
      setQty(1)

      return
    }

    const currentSeller = sellers.find(
      (item) => String(item.org_id) === String(orgId),
    )

    const stockedSeller = sellers.find(
      (item) => Number(item.available_quantity || 0) > 0,
    )

    if (
      !currentSeller
      || (Number(currentSeller.available_quantity || 0) <= 0 && stockedSeller)
    ) {
      const nextSeller = stockedSeller || sellers[0]

      setOrgId(
        nextSeller
          ? String(nextSeller.org_id)
          : ''
      )
    }

    setQty(1)
  }, [variantId, sellers, orgId])


  useEffect(() => {
    if (
      sellerAvailable > 0
      && qty > sellerAvailable
    ) {
      setQty(
        Math.max(
          1,
          sellerAvailable,
        )
      )
    }
  }, [
    sellerAvailable,
    qty,
  ])


  const requireSelection = () => {
    if (!variantId) {
      setError(
        '상품 옵션을 선택해주세요.'
      )

      return false
    }

    if (
      !orgId
      || !seller
    ) {
      setError(
        '판매자를 선택해주세요.'
      )

      return false
    }

    if (soldOut) {
      setError(
        '현재 선택한 판매자의 상품은 품절입니다.'
      )

      return false
    }

    return true
  }


  const addToCart = async () => {
    if (!isLoggedIn) {
      navigate(
        '/login',
        {
          state: {
            from: `/products/${productId}`,
          },
        },
      )

      return
    }

    if (!requireSelection()) {
      return
    }

    setCartBusy(true)
    setError('')

    try {
      await customerApi.addCartItem({
        org_id: Number(orgId),
        variant_id: Number(variantId),
        quantity: qty,
      })

      window.dispatchEvent(
        new CustomEvent(
          'shopdb2:cart-updated'
        )
      )

      showToast(
        `${sellerLabel(seller)} 상품을 장바구니에 담았습니다.`
      )
    } catch (e) {
      const message = (
        e.message
        || '장바구니 담기에 실패했습니다.'
      )

      setError(message)

      showToast(
        message,
        'error',
      )
    } finally {
      setCartBusy(false)
    }
  }


  const buy = async () => {
    if (!isLoggedIn) {
      navigate(
        '/login',
        {
          state: {
            from: `/products/${productId}`,
          },
        },
      )

      return
    }

    if (!addressId) {
      setError(
        '등록된 배송지가 없습니다. 배송지를 먼저 등록해주세요.'
      )

      return
    }

    if (!requireSelection()) {
      return
    }

    setBusy(true)
    setError('')

    try {
      const order = (
        await customerApi.createOrder({
          address_id: Number(addressId),
          org_id: Number(orgId),

          items: [
            {
              product_id: Number(
                productId
              ),

              variant_id: Number(
                variantId
              ),

              quantity: qty,
            },
          ],
        })
      )

      showToast(
        '주문이 생성되었습니다. 결제를 진행해주세요.',
        'info',
      )

      navigate(
        `/orders/${order.order_id}?pay=1`
      )
    } catch (e) {
      const message = (
        e.message
        || '주문 생성에 실패했습니다.'
      )

      setError(message)

      showToast(
        message,
        'error',
      )
    } finally {
      setBusy(false)
    }
  }


  if (loading) {
    return (
      <div className="container page-section">
        <div className="detail-grid detail-skeleton">

          <div
            className="skeleton detail-skeleton-image"
          />

          <div className="detail-skeleton-copy">

            <div
              className="skeleton skeleton-line tiny"
            />

            <div
              className="skeleton skeleton-line wide"
            />

            <div
              className="skeleton skeleton-line"
            />

            <div
              className="skeleton skeleton-price"
            />

            <div
              className="skeleton skeleton-block"
            />

          </div>
        </div>
      </div>
    )
  }


  if (!product) {
    return (
      <div className="container page-section">

        <div className="notice error retry-notice">

          {error || '상품 정보를 찾을 수 없습니다.'}

          <button
            type="button"
            onClick={loadProduct}
          >
            <RotateCcw size={14} />
            다시 시도
          </button>

        </div>

      </div>
    )
  }


  return (
    <div className="container page-section product-detail-page">

      <Link
        className="back-link"
        to="/products"
      >
        <ChevronLeft size={18} />
        상품 목록
      </Link>


      <div className="detail-grid">

        {/* =========================================
            상품 상단 이미지
        ========================================= */}

        <div className="detail-gallery">

          <div
            className={
              `detail-image ${
                soldOut
                  ? 'is-soldout'
                  : ''
              }`
            }
          >

            {
              image
              && !imageFailed
                ? (
                  <img
                    src={image}
                    alt={
                      activeImageItem?.alt_text
                      || product.product_name
                    }
                    onError={() => (
                      setImageFailed(true)
                    )}
                  />
                )
                : (
                  <div className="image-placeholder large">

                    <ImageOff size={42} />

                    <span>
                      이미지를 불러올 수 없습니다.
                    </span>

                  </div>
                )
            }


            {
              soldOut && (
                <div className="detail-soldout">

                  <PackageCheck size={24} />

                  현재 선택 품절

                </div>
              )
            }

          </div>


          {
            galleryImages.length > 1 && (
              <div className="detail-thumbnails">

                {
                  galleryImages
                    .slice(0, 6)
                    .map(
                      (item, index) => (
                        <button
                          type="button"
                          key={
                            item.product_image_id
                            || `${item.src}-${index}`
                          }
                          className={
                            index === activeImage
                              ? 'active'
                              : ''
                          }
                          onClick={() => (
                            setActiveImage(index)
                          )}
                        >

                          <img
                            src={item.src}
                            alt={
                              item.alt_text
                              || `${product.product_name} ${index + 1}`
                            }
                          />

                        </button>
                      )
                    )
                }

              </div>
            )
          }

        </div>


        {/* =========================================
            구매 정보
        ========================================= */}

        <div className="detail-info detail-buy-panel">

          <div className="detail-topline">

            <span className="product-category">
              {product.category_name}
            </span>

            <span
              className={
                `stock-badge ${
                  soldOut
                    ? 'soldout'
                    : ''
                }`
              }
            >
              {
                soldOut
                  ? '품절'
                  : `구매 가능 · 선택 판매자 재고 ${sellerAvailable}개`
              }
            </span>

          </div>


          <h1>
            {product.product_name}
          </h1>


          <p className="detail-description">
            {product.short_description}
          </p>


          {/* 판매자 */}

          <div className="detail-seller-summary">

            <div className="detail-seller-summary-head">

              <span>
                <Store size={15} />
                판매자 정보
              </span>

              <b>
                {
                  sellers.length
                    ? `총 ${sellers.length}곳`
                    : '판매자 없음'
                }
              </b>

            </div>


            {
              seller
                ? (
                  <div className="detail-seller-summary-body">

                    <div className="detail-seller-avatar">
                      <Store size={20} />
                    </div>

                    <div className="detail-seller-copy">

                      <strong>
                        {sellerLabel(seller)}
                      </strong>

                      <span>
                        {
                          seller.org_name
                          || '판매 조직 정보 없음'
                        }
                      </span>

                    </div>

                    <span
                      className={
                        `detail-seller-stock ${
                          sellerAvailable <= 0
                            ? 'soldout'
                            : ''
                        }`
                      }
                    >
                      {
                        sellerAvailable > 0
                          ? `재고 ${sellerAvailable}개`
                          : '품절'
                      }
                    </span>

                  </div>
                )
                : (
                  <div className="detail-seller-summary-empty">
                    현재 선택한 옵션을 판매 중인 판매자가 없습니다.
                  </div>
                )
            }


            {
              sellers.length > 1 && (
                <div className="detail-seller-other-list">

                  {
                    sellers.map(
                      (item) => (
                        <button
                          type="button"
                          key={item.org_id}
                          className={
                            String(item.org_id)
                            === String(orgId)
                              ? 'active'
                              : ''
                          }
                          disabled={
                            Number(
                              item.available_quantity
                              || 0
                            ) <= 0
                          }
                          onClick={() => {
                            setOrgId(
                              String(
                                item.org_id
                              )
                            )

                            setQty(1)
                            setError('')
                          }}
                        >
                          {sellerLabel(item)}
                        </button>
                      )
                    )
                  }

                </div>
              )
            }

            {stockMismatch && (
              <div className="seller-stock-sync-warning">
                전체 재고와 판매자별 재고가 일치하지 않습니다. 재고가 있는 판매자를 우선 선택합니다.
              </div>
            )}

          </div>


          {/* 가격 */}

          <div className="detail-price enhanced">

            {
              rate > 0 && (
                <b className="detail-rate">
                  {rate}%
                </b>
              )
            }

            <div>

              {
                Number(
                  product.regular_price
                )
                > Number(
                  product.sale_price
                ) && (
                  <span>
                    {money(
                      product.regular_price
                    )}원
                  </span>
                )
              }

              <strong>
                {money(
                  product.sale_price
                )}원
              </strong>

            </div>

          </div>


          {/* 안내 */}

          <div className="benefit-lines">

            <div>

              <Truck />

              <span>
                <b>배송 안내</b>{' '}
                결제 후 주문 상태에서 배송 정보를 확인할 수 있습니다.
              </span>

            </div>

            <div>

              <ShieldCheck />

              <span>
                <b>판매자별 주문</b>{' '}
                선택한 판매자의 재고를 기준으로 주문과 장바구니가 처리됩니다.
              </span>

            </div>

          </div>


          {/* 옵션 */}

          <div className="option-block">

            <label>
              옵션 선택
            </label>

            <select
              value={variantId}
              onChange={(e) => {
                setVariantId(
                  e.target.value
                )

                setError('')
              }}
            >

              {
                product.variants?.map(
                  (item) => (
                    <option
                      key={item.variant_id}
                      value={item.variant_id}
                      disabled={
                        Number(
                          item.available_quantity
                          || 0
                        ) <= 0
                      }
                    >

                      {
                        [
                          item.option_value1,
                          item.option_value2,
                        ]
                          .filter(Boolean)
                          .join(' / ')
                        || item.sku_code
                      }

                      {
                        Number(
                          item.additional_price
                          || 0
                        )
                          ? ` (+${money(item.additional_price)}원)`
                          : ''
                      }

                      {
                        Number(
                          item.available_quantity
                          || 0
                        ) > 0
                          ? ` · 전체 재고 ${item.available_quantity}`
                          : ' · 품절'
                      }

                    </option>
                  )
                )
              }

            </select>

          </div>


          {/* 판매자 선택 */}

          <div className="option-block seller-option-block">

            <label>
              <Store size={15} />
              판매자 선택
            </label>


            {
              sellers.length
                ? (
                  <select
                    value={orgId}
                    onChange={(e) => {
                      setOrgId(
                        e.target.value
                      )

                      setQty(1)
                      setError('')
                    }}
                  >

                    {
                      sellers.map(
                        (item) => (
                          <option
                            key={item.org_id}
                            value={item.org_id}
                            disabled={
                              Number(
                                item.available_quantity
                                || 0
                              ) <= 0
                            }
                          >

                            {sellerLabel(item)}

                            {
                              item.org_name
                              && item.seller_name
                                ? ` · ${item.org_name}`
                                : ''
                            }

                            {
                              Number(
                                item.available_quantity
                                || 0
                              ) > 0
                                ? ` · 재고 ${item.available_quantity}`
                                : ' · 품절'
                            }

                          </option>
                        )
                      )
                    }

                  </select>
                )
                : (
                  <div className="notice error compact">
                    현재 이 옵션을 판매 중인 판매자가 없습니다.
                  </div>
                )
            }

          </div>


          {/* 배송지 */}

          {
            isLoggedIn && (
              <div className="option-block">

                <label>
                  배송지
                </label>


                {
                  addresses.length
                    ? (
                      <select
                        value={addressId}
                        onChange={(e) => (
                          setAddressId(
                            e.target.value
                          )
                        )}
                      >

                        {
                          addresses.map(
                            (address) => (
                              <option
                                key={
                                  address.address_id
                                }
                                value={
                                  address.address_id
                                }
                              >

                                {
                                  address.default_yn
                                  === 'Y'
                                    ? '[기본] '
                                    : ''
                                }

                                {
                                  address.address_name
                                  || '배송지'
                                }

                                {' - '}

                                {address.address1}

                                {' '}

                                {
                                  address.address2
                                  || ''
                                }

                              </option>
                            )
                          )
                        }

                      </select>
                    )
                    : (
                      <div className="missing-address-card">

                        <MapPin size={20} />

                        <div>

                          <strong>
                            등록된 배송지가 없습니다.
                          </strong>

                          <span>
                            바로 구매하려면 배송지를 먼저 등록해주세요.
                            장바구니 담기는 가능합니다.
                          </span>

                        </div>

                        <Link
                          to="/addresses"
                          state={{
                            returnTo: `/products/${productId}`,
                          }}
                          className="small-btn"
                        >
                          배송지 등록
                        </Link>

                      </div>
                    )
                }

              </div>
            )
          }


          {/* 수량 */}

          <div className="qty-row">

            <span>
              수량
            </span>

            <div className="qty-control">

              <button
                type="button"
                disabled={qty <= 1}
                onClick={() => (
                  setQty(
                    Math.max(
                      1,
                      qty - 1,
                    )
                  )
                )}
              >
                <Minus size={16} />
              </button>


              <input
                className="detail-qty-input"
                type="number"
                min="1"
                max={
                  Math.max(
                    1,
                    sellerAvailable,
                  )
                }
                value={qty}
                onChange={(e) => {
                  const next = Math.max(
                    1,
                    Math.min(
                      Math.max(
                        1,
                        sellerAvailable,
                      ),
                      Number(
                        e.target.value
                      ) || 1,
                    ),
                  )

                  setQty(next)
                }}
              />


              <button
                type="button"
                disabled={
                  soldOut
                  || qty >= sellerAvailable
                }
                onClick={() => (
                  setQty(
                    Math.min(
                      Math.max(
                        1,
                        sellerAvailable,
                      ),
                      qty + 1,
                    )
                  )
                )}
              >
                <Plus size={16} />
              </button>

            </div>

          </div>


          {/* 총 금액 */}

          <div className="order-total">

            <span>
              총 상품금액
            </span>

            <strong>
              {money(total)}원
            </strong>

          </div>


          {
            error && (
              <div className="notice error compact">
                {error}
              </div>
            )
          }


          {/* 구매 버튼 */}

          <div className="detail-purchase-actions">

            <button
              className="btn btn-light cart-add-button"
              onClick={addToCart}
              disabled={
                cartBusy
                || soldOut
              }
            >

              <ShoppingCart size={20} />

              {
                cartBusy
                  ? '담는 중...'
                  : '장바구니 담기'
              }

            </button>


            <button
              className="btn btn-primary buy-button"
              onClick={buy}
              disabled={
                busy
                || soldOut
              }
            >

              <CheckCircle2 size={20} />

              {
                busy
                  ? '주문 생성 중...'
                  : soldOut
                    ? '품절된 상품입니다'
                    : isLoggedIn
                      ? '바로 구매하기'
                      : '로그인 후 구매'
              }

            </button>

          </div>


          <p className="cart-note">
            장바구니에서는 판매자별로 상품을 구분하며,
            선택한 상품만 주문할 수 있습니다.
          </p>

        </div>

      </div>


      {/* =========================================
          쿠팡형 상품 상세 영역
      ========================================= */}

      <div className="description-card product-description-card">

        <div className="description-tabs">

          <button className="active">
            상품 상세정보
          </button>

          <button disabled>
            배송/교환 안내
          </button>

        </div>


        <div
          style={{
            maxWidth: '900px',
            margin: '0 auto',
            padding: '32px 0',
          }}
        >

          <h2
            style={{
              marginBottom: '24px',
            }}
          >
            상품 상세정보
          </h2>


          {/* 셀러가 작성한 상세 설명 */}

          {
            product.description
              ? (
                <div
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    lineHeight: 1.8,
                    marginBottom: detailImages.length
                      ? '40px'
                      : 0,
                  }}
                >
                  {product.description}
                </div>
              )
              : (
                detailImages.length === 0 && (
                  <div
                    style={{
                      textAlign: 'center',
                      padding: '60px 20px',
                      color: '#777',
                    }}
                  >
                    등록된 상품 상세정보가 없습니다.
                  </div>
                )
              )
          }


          {/* 셀러가 등록한 DETAIL 이미지 */}

          {
            detailImages.length > 0 && (
              <div
                className="product-detail-images"
                style={{
                  width: '100%',
                  margin: '0 auto',
                }}
              >

                {
                  detailImages.map(
                    (item, index) => (
                      <img
                        key={
                          item.product_image_id
                          || `${item.src}-${index}`
                        }
                        src={item.src}
                        alt={
                          item.alt_text
                          || `${product.product_name} 상세 이미지 ${index + 1}`
                        }
                        loading="lazy"
                        style={{
                          display: 'block',
                          width: '100%',
                          height: 'auto',
                          margin: 0,
                          padding: 0,
                        }}
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                    )
                  )
                }

              </div>
            )
          }

        </div>

      </div>

    </div>
  )
}