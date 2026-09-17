import { Link } from 'react-router-dom'
export default function NotFoundPage() { return <div className="not-found"><strong>404</strong><h1>페이지를 찾을 수 없습니다.</h1><Link className="btn btn-primary" to="/">홈으로 돌아가기</Link></div> }
