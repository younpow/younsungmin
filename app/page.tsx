export default function Home() {
  return (
    <main className="page-shell">
      <nav className="topbar" aria-label="주요 탐색">
        <a className="wordmark" href="#home" aria-label="윤성민 홈">YSM<span>.</span></a>
        <p>SEOUL · KOREA</p>
      </nav>
      <section className="hero" id="home" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow">윤성민 — YOON SUNGMIN</p>
          <h1 id="hero-title">생각하고,<br />만들고,<br /><span>기록합니다.</span></h1>
          <p className="intro">호기심을 시작으로 삼고, 나답게 답을 만듭니다.<br />이곳은 윤성민의 생각과 작업이 모이는 첫 장면입니다.</p>
        </div>
        <div className="identity-mark" aria-label="윤성민의 성 윤"><b>윤</b><small>YOON</small></div>
      </section>
      <footer className="footer"><p>© 2026 YOON SUNGMIN</p><p className="motto">STAY CURIOUS. MAKE IT REAL.</p></footer>
    </main>
  );
}
