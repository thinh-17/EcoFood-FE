import "./HomePage.css";

import { useRef, useState } from "react";

import {
    FiLayers,
    FiInbox,
    FiAlertCircle,
    FiBookOpen,
    FiChevronLeft,
    FiChevronRight,
} from "react-icons/fi";

import {
    CoreButton,
    CorePageHeader,
    CoreEmptyState,
} from "@thinh-17/fe-core";

import { useActiveTenant } from
    "../../../tenant/context/TenantProvider.jsx";

import { useNews } from "../../hooks/useNews.js";

const ALL_CATEGORY = "All";

function formatDate(value) {
    return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(new Date(value));
}

function NewsCard({ article }) {
    return (
        <article className="eco-news-card">
            <div className="eco-news-card__image">
                <img
                    src={article.image}
                    alt=""
                    loading="lazy"
                />
            </div>

            <div className="eco-news-card__overlay" />

            <div className="eco-news-card__content">
                <span className="eco-news-card__category">
                    {article.category}
                </span>

                <h3 className="eco-news-card__title">
                    {article.title}
                </h3>

                <div className="eco-news-card__meta">
                    <span className="eco-news-card__source">
                        {article.source}
                    </span>

                    <time dateTime={article.publishedAt}>
                        {formatDate(article.publishedAt)}
                    </time>
                </div>
            </div>
        </article>
    );
}

function NewsCarousel({ articles }) {
    const carouselRef = useRef(null);

    const scroll = (direction) => {
        const container = carouselRef.current;

        if (!container) return;

        const firstCard = container.querySelector(
            ".eco-news-card"
        );

        if (!firstCard) return;

        const styles = window.getComputedStyle(container);
        const gap = parseFloat(styles.columnGap) || 0;

        const distance = firstCard.getBoundingClientRect().width + gap;

        container.scrollBy({
            left: direction * distance,
            behavior: "smooth",
        });
    };

    if (!articles.length) return null;

    return (
        <div className="eco-news-carousel">
            <button
                type="button"
                className="eco-news-carousel__arrow eco-news-carousel__arrow--left"
                aria-label="Xem bản tin trước"
                onClick={() => scroll(-1)}
            >
                <FiChevronLeft size={22} />
            </button>

            <div
                ref={carouselRef}
                className="eco-news-carousel__track"
                aria-label="Danh sách bản tin"
            >
                {articles.map((article) => (
                    <NewsCard
                        key={article.id}
                        article={article}
                    />
                ))}
            </div>

            <button
                type="button"
                className="eco-news-carousel__arrow eco-news-carousel__arrow--right"
                aria-label="Xem bản tin tiếp theo"
                onClick={() => scroll(1)}
            >
                <FiChevronRight size={22} />
            </button>
        </div>
    );
}

export function HomePage() {
    const {
        tenantId,
        selectedTenant,
        tenantsQuery,
    } = useActiveTenant();

    const [category, setCategory] = useState(ALL_CATEGORY);

    const {
        data: articles = [],
        isPending,
        isError,
    } = useNews(tenantId);

    const categories = [
        ALL_CATEGORY,
        ...new Set(articles.map((article) => article.category)),
    ];

    const filteredArticles =
        category === ALL_CATEGORY
            ? articles
            : articles.filter(
                (article) => article.category === category
            );

    return (
        <div className="eco-home">
            <CorePageHeader
                eyebrow="EcoFood Platform / Home"
                title="Welcome to EcoFood"
                description={
                    "Khám phá những thông tin, kiến thức và cập nhật " +
                    "mới nhất từ hệ sinh thái EcoFood."
                }
                aside={
                    selectedTenant && (
                        <div className="eco-home__tenant">
                            <FiLayers size={16} aria-hidden="true" />

                            <span>{selectedTenant.name}</span>
                        </div>
                    )
                }
            />

            <section className="eco-home__intro">
                <div>
                    <span className="eco-home__eyebrow">
                        LATEST UPDATES
                    </span>

                    <h2>Thông tin từ hệ sinh thái</h2>

                    <p>
                        Cập nhật những bài viết, thông báo và kiến thức
                        hữu ích dành cho cộng đồng doanh nghiệp và
                        các đối tác trên nền tảng.
                    </p>
                </div>

                <div className="eco-home__intro-icon">
                    <FiBookOpen size={48} aria-hidden="true" />
                </div>
            </section>

            {!tenantId && (
                <CoreEmptyState
                    icon={FiLayers}
                    title={
                        tenantsQuery.isLoading
                            ? "Đang tải thông tin tenant"
                            : tenantsQuery.isError
                                ? "Không thể tải tenant"
                                : "Chưa có tenant khả dụng"
                    }
                    description={
                        tenantsQuery.isError
                            ? "Kiểm tra kết nối backend hoặc bật mock API."
                            : "Cần có tenant hợp lệ để tải bản tin của workspace."
                    }
                />
            )}

            {tenantId && (
                <>
                    <div className="eco-home__section-header">
                        <div>
                            <h2>Bản tin mới nhất</h2>

                            <p>
                                Thông tin và cập nhật từ EcoFood Platform
                            </p>
                        </div>

                        <span className="eco-home__demo-label">
                            Demo news feed
                        </span>
                    </div>

                    <div
                        className="eco-home__filters"
                        role="group"
                        aria-label="Lọc bản tin theo danh mục"
                    >
                        {categories.map((item) => (
                            <CoreButton
                                key={item}
                                size="sm"
                                variant={
                                    category === item ? "primary" : "secondary"
                                }
                                aria-pressed={category === item}
                                onClick={() => setCategory(item)}
                            >
                                {item === ALL_CATEGORY ? "Tất cả" : item}
                            </CoreButton>
                        ))}
                    </div>

                    {isPending && (
                        <div
                            className="eco-home__message"
                            role="status"
                        >
                            Đang tải bản tin...
                        </div>
                    )}

                    {isError && (
                        <div
                            className="eco-home__error"
                            role="alert"
                        >
                            <FiAlertCircle size={18} />

                            Không thể tải bản tin. Vui lòng kiểm tra API.
                        </div>
                    )}

                    {!isPending &&
                        !isError &&
                        filteredArticles.length === 0 && (
                            <CoreEmptyState
                                icon={FiInbox}
                                title="Chưa có bản tin"
                                description="Chưa có bài viết nào trong danh mục này."
                            />
                        )}

                    {!isPending &&
                        !isError &&
                        filteredArticles.length > 0 && (
                            <NewsCarousel articles={filteredArticles} />
                        )}
                </>
            )}

            <footer className="eco-home__footer">
                <span>EcoFood Multi-tenant Platform</span>

                <span>
                    Giao diện bản tin dùng chung cho mọi tenant
                </span>
            </footer>
        </div>
    );
}