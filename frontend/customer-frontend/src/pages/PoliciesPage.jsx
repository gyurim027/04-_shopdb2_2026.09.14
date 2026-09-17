import { useEffect, useState } from 'react'
import { ChevronRight, FileText } from 'lucide-react'
import { customerApi } from '../api/customer'
export default function PoliciesPage() {
  const [items, setItems] = useState([]); const [detail, setDetail] = useState(null); const [error, setError] = useState('')
  useEffect(() => { customerApi.getPolicies().then(setItems).catch((e) => setError(e.message)) }, [])
  const open = async (id) => { try { setDetail(await customerApi.getPolicy(id)) } catch (e) { setError(e.message) } }
  return <div className="container page-section"><div className="page-title"><span>POLICY</span><h1>이용 정책</h1><p>현재 적용 중인 ShopDB 정책을 확인하세요.</p></div>{error && <div className="notice error">{error}</div>}<div className="policy-layout"><div className="policy-list">{items.map((p) => <button key={p.policy_id} onClick={() => open(p.policy_id)}><FileText /><div><strong>{p.policy_name}</strong><span>v{p.policy_version} · {p.effective_from}</span></div><ChevronRight /></button>)}</div><div className="policy-detail">{detail ? <><span className="category-tag">{detail.policy_code}</span><h2>{detail.policy_name}</h2><p className="policy-date">버전 {detail.policy_version} · 시행일 {detail.effective_from}</p><div className="policy-content">{detail.policy_content || '정책 내용이 없습니다.'}</div></> : <div className="empty-box">왼쪽 정책을 선택해주세요.</div>}</div></div></div>
}
