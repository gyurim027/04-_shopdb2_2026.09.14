import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// 공통 디자인 변수 파일을 일반 CSS보다 먼저 불러옵니다.
import './styles/tokens.css'
import './index.css'

import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)