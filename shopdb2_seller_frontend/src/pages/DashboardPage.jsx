import './DashboardPage.css'

// 상품 상태별 수치는 백엔드 연결 전까지 임시 값으로 표시합니다.
const productStatuses = [
  { label: '전체 상품', value: '—' },
  { label: '판매중', value: '—' },
  { label: '품절', value: '—' },
  { label: '판매중지', value: '—' },
  { label: '준비중', value: '—' },
]

function DashboardPage() {
  return (
    <section className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <h1>대시보드</h1>
          <p>상품, 주문, 매출, 재고와 환불 현황을 확인하세요.</p>
        </div>

        <button className="primary-button" type="button">
          상품 등록
        </button>
      </div>

      {/* S-DASH-01 상품 상태 요약 */}
      <section className="dashboard-section">
        <div className="section-heading">
          <div>
            <h2>상품 현황</h2>
            <p>판매 상태별 등록 상품 수입니다.</p>
          </div>
        </div>

        <div className="product-status-grid">
          {productStatuses.map((status) => (
            <button
              className="product-status-card"
              type="button"
              key={status.label}
            >
              <span>{status.label}</span>
              <strong>{status.value}</strong>
            </button>
          ))}
        </div>
      </section>

      <div className="dashboard-grid">
        {/* S-DASH-02 기간별 주문 현황 */}
        <section className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <h2>주문 현황</h2>
              <p>기간별 주문과 상품 수를 확인합니다.</p>
            </div>

            <select aria-label="주문 조회 기간" defaultValue="7days">
              <option value="7days">최근 7일</option>
              <option value="30days">최근 30일</option>
              <option value="90days">최근 3개월</option>
            </select>
          </div>

          <div className="metric-grid">
            <div className="metric-item">
              <span>주문 건수</span>
              <strong>—</strong>
            </div>

            <div className="metric-item">
              <span>주문 상품 수</span>
              <strong>—</strong>
            </div>
          </div>

          <div className="status-summary">
            <span>주문 상태별 건수</span>
            <p>API 연결 후 상태별 주문 건수가 표시됩니다.</p>
          </div>

          <div className="panel-subheading">
            <strong>최근 주문</strong>

            <button className="text-button" type="button">
              전체 보기
            </button>
          </div>

          <div className="empty-state compact">
            <strong>표시할 주문 데이터가 없습니다.</strong>
            <span>최근 주문 내역이 이곳에 표시됩니다.</span>
          </div>
        </section>

        {/* S-DASH-03 기간별 매출 요약 */}
        <section className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <h2>매출 현황</h2>
              <p>상품 판매액 기준의 매출 현황입니다.</p>
            </div>

            <select aria-label="매출 조회 기간" defaultValue="7days">
              <option value="7days">최근 7일</option>
              <option value="30days">최근 30일</option>
              <option value="90days">최근 3개월</option>
            </select>
          </div>

          <div className="sales-total">
            <span>총 상품 판매액</span>
            <strong>—원</strong>
          </div>

          <div className="chart-placeholder">
            <strong>기간별 매출 추이</strong>
            <span>매출 데이터 연결 후 차트가 표시됩니다.</span>
          </div>

          <div className="panel-subheading">
            <strong>주요 상품 매출</strong>

            <button className="text-button" type="button">
              자세히 보기
            </button>
          </div>

          <div className="empty-state compact">
            <strong>표시할 상품 매출이 없습니다.</strong>
            <span>판매액이 높은 상품이 이곳에 표시됩니다.</span>
          </div>
        </section>

        {/* S-DASH-04 재고 부족 요약 */}
        <section className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <h2>재고 부족</h2>
              <p>안전재고 이하로 내려간 상품입니다.</p>
            </div>

            <span className="count-badge">—건</span>
          </div>

          <div className="dashboard-table-wrapper">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>상품명/SKU</th>
                  <th>현재재고</th>
                  <th>안전재고</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td colSpan="3">표시할 재고 부족 상품이 없습니다.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="panel-footer">
            <button className="text-button" type="button">
              재고 관리 바로가기
            </button>
          </div>
        </section>

        {/* S-DASH-05 환불 요청 요약 */}
        <section className="dashboard-panel">
          <div className="panel-heading">
            <div>
              <h2>환불 요청</h2>
              <p>처리를 기다리는 환불 요청입니다.</p>
            </div>

            <span className="count-badge">—건</span>
          </div>

          <div className="dashboard-table-wrapper">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>상품/수량</th>
                  <th>요청금액</th>
                  <th>요청일</th>
                  <th>상태</th>
                  <th>상세</th>
                </tr>
              </thead>

              <tbody>
                <tr>
                  <td colSpan="5">표시할 환불 요청이 없습니다.</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="panel-footer">
            <button className="text-button" type="button">
              환불 요청 전체 보기
            </button>
          </div>
        </section>
      </div>
    </section>
  )
}

export default DashboardPage