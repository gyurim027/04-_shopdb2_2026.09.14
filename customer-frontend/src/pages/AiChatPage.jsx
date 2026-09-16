import { useEffect, useRef, useState } from 'react'
import { Bot, Send, UserRound } from 'lucide-react'
import { customerApi } from '../api/customer'
import { useToast } from '../context/ToastContext'

const QUICK_QUESTIONS = [
  '환불 정책을 알려주세요',
  '스마트 후드티 상품정보를 알려주세요',
  '배송 관련 문의는 어떻게 하나요?',
]

export default function AiChatPage() {
  const { showToast } = useToast()
  const [messages, setMessages] = useState([{ role: 'ai', text: '안녕하세요! ShopDB AI 도우미입니다. 상품 정보나 환불 정책에 대해 물어보세요.' }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef(null)

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const ask = async (question) => {
    const q = question.trim()
    if (!q || busy) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: q }])
    setBusy(true)
    try {
      const r = await customerApi.askAi(q)
      setMessages((m) => [...m, { role: 'ai', text: r.answer || '관련 답변을 찾지 못했습니다.', failed: r.failed, queryLogId: r.query_log_id }])
    } catch (e) {
      setMessages((m) => [...m, { role: 'ai', text: `오류: ${e.message}` }])
    } finally {
      setBusy(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    await ask(input)
  }

  const convert = async (id) => {
    try {
      const r = await customerApi.convertAiToInquiry(id, { title: 'AI 답변 실패 문의', secret_yn: 'N' })
      setMessages((m) => [...m, { role: 'ai', text: `고객 문의 #${r.inquiry_id}로 접수했습니다.` }])
      showToast('AI 질문을 1:1 문의로 전환했습니다.')
    } catch (e) {
      showToast(e.message || '문의 전환에 실패했습니다.', 'error')
    }
  }

  return (
    <div className="container page-section">
      <div className="page-title"><span>AI ASSISTANT</span><h1>AI 쇼핑 도우미</h1><p>현재 백엔드의 RAG 문서를 기반으로 답변합니다.</p></div>
      <div className="quick-questions">
        {QUICK_QUESTIONS.map((question) => <button type="button" key={question} disabled={busy} onClick={() => ask(question)}>{question}</button>)}
      </div>
      <div className="chat-shell">
        <div className="chat-header"><div><Bot /><strong>ShopDB AI</strong></div><span>RAG 기반 고객지원</span></div>
        <div className="chat-body">
          {messages.map((m, i) => (
            <div key={i} className={`chat-row ${m.role}`}>
              <div className="chat-avatar">{m.role === 'ai' ? <Bot /> : <UserRound />}</div>
              <div className="chat-bubble"><p>{m.text}</p>{m.failed && m.queryLogId && <button className="small-btn" onClick={() => convert(m.queryLogId)}>1:1 문의로 전환</button>}</div>
            </div>
          ))}
          {busy && <div className="chat-row ai"><div className="chat-avatar"><Bot /></div><div className="chat-bubble typing">답변을 찾고 있어요...</div></div>}
          <div ref={end} />
        </div>
        <form className="chat-input" onSubmit={submit}><input value={input} onChange={(e) => setInput(e.target.value)} placeholder="예: 환불 정책을 알려주세요" /><button disabled={busy || !input.trim()}><Send /></button></form>
      </div>
    </div>
  )
}
