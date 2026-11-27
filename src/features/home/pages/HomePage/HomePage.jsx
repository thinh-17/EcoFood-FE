import { FeedbackMessage } from "../../../../components/FeedbackMessage.jsx";
import { CoreLoadingState } from "@thinh-17/fe-core";
import "./HomePage.css";

import { useState } from "react";

import {
    FiLayers,
    FiInbox,
    FiAlertCircle,
    FiBookOpen,
} from "react-icons/fi";

import { CoreEmptyState } from "@thinh-17/fe-core";
import { CoreButton } from "@thinh-17/fe-core";
import { PageHeader as CorePageHeader } from "../../../../components/PageHeader.jsx";
import { CorePagination as Pagination } from "@thinh-17/fe-core";

import { useActiveTenant } from
    "../../../tenant/context/TenantProvider.jsx";

import { useNews } from "../../hooks/useNews.js";

const ALL_CATEGORY = "All";

function formatDate(value) {
    return new Intl.DateTimeFormat("en-US", {
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
    const [page, setPage] = useState(0);
    const pageSize = 6;
    const totalPages = Math.ceil(articles.length / pageSize);
    const currentPage = Math.min(page, Math.max(0, totalPages - 1));
    if (!articles.length) return null;
    return <div className="eco-news-carousel">
        <div className="eco-home__news-grid" aria-label="News articles">
            {articles.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map((article) => <NewsCard key={article.id} article={article} />)}
        </div>
        <Pagination page={currentPage} totalPages={totalPages} hasNext={currentPage + 1 < totalPages} onPageChange={setPage} label="News pagination" />
    </div>;
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
                    "Discover the latest news, insights and updates " +
                    "from the EcoFood ecosystem."
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

                    <h2>From the ecosystem</h2>

                    <p>
                        Explore articles, announcements and insights
                        for our business community and
                        partners across the platform.
                    </p>
                </div>

                <div className="eco-home__intro-icon">
                    <FiBookOpen size={48} aria-hidden="true" />
                </div>
            </section>

            {!tenantId && (
                tenantsQuery.isLoading ? <CoreLoadingState title="Loading tenant information" /> :
                <CoreEmptyState
                    icon={FiLayers}
                    title={
                        tenantsQuery.isError
                                ? "Unable to load tenant"
                                : "No tenants available"
                    }
                    description={
                        tenantsQuery.isError
                            ? "Check the backend connection or enable the demo API."
                            : "Select a valid tenant to load workspace news."
                    }
                />
            )}

            {tenantId && (
                <>
                    <div className="eco-home__section-header">
                        <div>
                            <h2>Latest news</h2>

                            <p>
                                News and updates from EcoFood Platform
                            </p>
                        </div>

                        <span className="eco-home__demo-label">
                            Demo news feed
                        </span>
                    </div>

                    <div
                        className="eco-home__filters"
                        role="group"
                        aria-label="Filter news by category"
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
                                {item === ALL_CATEGORY ? "All" : item}
                            </CoreButton>
                        ))}
                    </div>

                    {isPending && (
                        <CoreLoadingState title="Loading news" />
                    )}

                    {isError && (
                        <FeedbackMessage>
                            <FiAlertCircle size={18} />

                            Unable to load news. Please check the API connection.
                        </FeedbackMessage>
                    )}

                    {!isPending &&
                        !isError &&
                        filteredArticles.length === 0 && (
                            <CoreEmptyState
                                icon={FiInbox}
                                title="No news yet"
                                description="No articles in this category yet."
                            />
                        )}

                    {!isPending &&
                        !isError &&
                        filteredArticles.length > 0 && (
                            <NewsCarousel key={category} articles={filteredArticles} />
                        )}
                </>
            )}

            <footer className="eco-home__footer">
                <span>EcoFood Multi-tenant Platform</span>

                <span>
                    A shared news feed for every tenant
                </span>
            </footer>
        </div>
    );
}
