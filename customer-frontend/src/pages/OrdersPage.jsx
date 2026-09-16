import { useEffect, useState } from 'react'
import { ChevronRight, Package, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { customerApi } from '../api/customer'
import { ORDER_STATUS_LABELS, statusLabel } from '../utils/status'

const money = (v) => Number(v || 0).toLocaleString('ko-KR')
const date = (v) => v ? new Date(v).toLocaleString('ko-KR') : '-'

export default function OrdersPage() {
  const [data, setData] = useState({ items: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await customerApi.getOrders()
      setData(result || { items: [], total: 0 })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <div className="container page-section">
      <div className="page-title"><span>ORDER</span><h1>주문내역</h1><p>최근 주문과 결제 상태를 확인하세요.</p></div>
      {error && <div className="notice error retry-notice">{error}<button type="button" onClick={load}><RotateCcw size={14} /> 다시 시도</button></div>}
      {loading ? <div className="loading-box">주문 내역을 불러오는 중...</div> : (
        <div className="order-list">
          {data.items?.map((o) => (
            <Link to={`/orders/${o.order_id}`} key={o.order_id} className="order-card">
              <div className="order-icon"><Package /></div>
              <div className="order-main">
                <div className="order-meta"><strong>{o.order_no}</strong><span>{date(o.ordered_at)}</span></div>
                <div className="order-status">{statusLabel(ORDER_STATUS_LABELS, o.order_status)}</div>
                <div className="order-amount"><span>결제예정금액</span><b>{money(o.total_amount)}원</b></div>
              </div>
              <ChevronRight />
            </Link>
          ))}
          {!data.items?.length && <div className="empty-box">주문 내역이 없습니다. 상품을 둘러보고 첫 주문을 시작해보세요.</div>}
        </div>
      )}
    </div>
  )
}
