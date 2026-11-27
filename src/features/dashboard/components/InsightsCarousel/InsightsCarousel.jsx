import { CoreButton, CoreCard } from "@thinh-17/fe-core";
import "./InsightsCarousel.css";
import { useRef } from "react";
import { FiArrowLeft, FiArrowRight, FiBookOpen } from "react-icons/fi";

export function InsightsCarousel({ articles }) {
  const scrollerRef = useRef(null);
  const scroll = (direction) => scrollerRef.current?.scrollBy({ left: direction * 300, behavior: "smooth" });

  return (
    <CoreCard className="insights-panel">
      <div className="section-heading">
        <div><span className="eyebrow">INSIGHTS</span><h2>F&B industry insights</h2></div>
        <div className="carousel-actions">
          <CoreButton variant="secondary" type="button" onClick={() => scroll(-1)} aria-label="Previous article"><FiArrowLeft /></CoreButton>
          <CoreButton variant="secondary" type="button" onClick={() => scroll(1)} aria-label="Next article"><FiArrowRight /></CoreButton>
        </div>
      </div>
      <div className="insight-track" ref={scrollerRef}>
        {articles.map((article) => (
          <article key={article.id} className="insight-card">
            <div className="insight-image">
              <img src={article.image} alt="F&B article illustration" loading="lazy" />
              <span className="insight-tag">{article.category}</span>
            </div>
            <div className="insight-content">
              <h3>{article.title}</h3>
              <div className="insight-source"><FiBookOpen size={14} /> {article.source}</div>
            </div>
          </article>
        ))}
      </div>
    </CoreCard>
  );
}
