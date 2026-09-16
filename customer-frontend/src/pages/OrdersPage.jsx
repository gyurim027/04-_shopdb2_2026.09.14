import { useEffect, useState } from 'react'
import { ChevronRight, Package } from 'lucide-react'
import { Link } from 'react-router-dom'
import { customerApi } from '../api/customer'
const money = (v) => Number(v || 0).toLocaleString('ko-KR')
const date = (v) => v ? new Date(v).toLocaleString('ko-KR') : '-'
export default function OrdersPage() {
  const [data, setData] = useState({ items: [], total: 0 }); const [error, setError] = useState('')
  useEffect(() => { customerApi.getOrders().then(setData).catch((e) => setError(e.message)) }, [])
  return <div className="container page-section"><div className="page-title"><span>ORDER</span><h1>주문내역</h1><p>최근 주문과 결제 상태를 확인하세요.</p></div>{error && <div className="notice error">{error}</div>}<div className="order-list">{data.items?.map((o) => <Link to={`/orders/${o.order_id}`} key={o.order_id} className="order-card"><div className="order-icon"><Package /></div><div className="order-main"><div className="order-meta"><strong>{o.order_no}</strong><span>{date(o.ordered_at)}</span></div><div className="order-status">{o.order_status}</div><div className="order-amount"><span>결제예정금액</span><b>{money(o.total_amount)}원</b></div></div><ChevronRight /></Link>)}{!data.items?.length && <div className="empty-box">주문 내역이 없습니다.</div>}</div></div>
}
