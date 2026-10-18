import "./InsightsCarousel.css";
import { useRef } from "react";
import { FiArrowLeft, FiArrowRight, FiBookOpen } from "react-icons/fi";

export function InsightsCarousel({ articles }) {
  const scrollerRef = useRef(null);
  const scroll = (direction) => scrollerRef.current?.scrollBy({ left: direction * 300, behavior: "smooth" });

  return (
    <section className="insights-panel">
      <div className="section-heading">
        <div><span className="eyebrow">THÔNG TIN HỮU ÍCH</span><h2>Góc nhìn ngành F&B</h2></div>
        <div className="carousel-actions">
          <button type="button" onClick={() => scroll(-1)} aria-label="Bài trước"><FiArrowLeft /></button>
          <button type="button" onClick={() => scroll(1)} aria-label="Bài tiếp theo"><FiArrowRight /></button>
        </div>
      </div>
      <div className="insight-track" ref={scrollerRef}>
        {articles.map((article) => (
          <article key={article.id} className="insight-card">
            <div className="insight-image">
              <img src={article.image} alt="Hình minh họa nội dung F&B" loading="lazy" />
              <span className="insight-tag">{article.category}</span>
            </div>
            <div className="insight-content">
              <h3>{article.title}</h3>
              <div className="insight-source"><FiBookOpen size={14} /> {article.source}</div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
