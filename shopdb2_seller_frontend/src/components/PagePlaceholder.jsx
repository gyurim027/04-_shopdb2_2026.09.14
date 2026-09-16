import './PagePlaceholder.css'

function PagePlaceholder({ title, description }) {
  return (
    // 아직 구현하지 않은 메뉴에서 공통으로 사용하는 임시 화면입니다.
    <section className="page-placeholder">
      <h1>{title}</h1>
      <p>{description}</p>

      <div className="placeholder-card">
        <strong>화면 준비 중</strong>
        <span>기능 정의서에 따라 다음 단계에서 구현합니다.</span>
      </div>
    </section>
  )
}

export default PagePlaceholder