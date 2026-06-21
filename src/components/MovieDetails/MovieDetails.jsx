import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { ImCross } from "react-icons/im";
import { PiVideoCameraFill } from "react-icons/pi";
import { getLegalWatchLinks } from "../../data/legalWatchServices";

const defaultStatusOptions = [
    {
        value: "",
        label: "Без статуса"
    },
    {
        value: "favorite",
        label: "Хочу посмотреть"
    },
    {
        value: "watching",
        label: "Смотрю"
    },
    {
        value: "watched",
        label: "Посмотрел"
    },
    {
        value: "dropped",
        label: "Бросил"
    }
];

function MovieDetails({
    item,
    movie,
    getPosterSrc,
    getTypeLabel,
    scrollToSelected,
    formatMoney,
    onClose,
    variant = "movie",
    isAuth = true,
    currentStatus = "",
    onStatusChange,
    statusOptions = defaultStatusOptions
}) {
    const navigate = useNavigate();

    const [trailerOpen, setTrailerOpen] = useState(false);

    const data = item || movie;

    useEffect(() => {
        setTrailerOpen(false);
    }, [data?.item_key, data?.id]);

    useEffect(() => {
        if (!trailerOpen) return;

        const handleEsc = (e) => {
            if (e.key === "Escape") {
                setTrailerOpen(false);
            }
        };

        document.body.style.overflow = "hidden";
        window.addEventListener("keydown", handleEsc);

        return () => {
            document.body.style.overflow = "";
            window.removeEventListener("keydown", handleEsc);
        };
    }, [trailerOpen]);

    if (!data) {
        return null;
    }

    const isCatalog = variant === "catalog";

    const poster = data.poster || data.poster_local || data.poster_path;
    const title = data.title || data.name || "Без названия";
    const originalTitle = data.original_title || data.original_name;
    const rating = Number(data.rating || data.vote_average || 0).toFixed(1);
    const year = data.year || data.release_date?.slice(0, 4) || data.first_air_date?.slice(0, 4) || "Без года";
    const typeLabel = getTypeLabel ? getTypeLabel(data) : "Фильм";

    const detailsClass = isCatalog ? "catalog-details" : "details-section movie-details";
    const closeClass = isCatalog ? "catalog-details-close" : "movie-details-close";
    const posterClass = isCatalog ? "catalog-details-poster" : "movie-details-poster";
    const typeClass = isCatalog ? "catalog-details-type" : "movie-details-type";
    const originalClass = isCatalog ? "catalog-original-title" : "movie-original-title";
    const metaClass = isCatalog ? "catalog-meta" : "movie-details-meta";
    const overviewClass = isCatalog ? "catalog-overview" : "movie-details-overview";
    const listClass = isCatalog ? "catalog-details-list" : "movie-details-list";
    const trailerBtnClass = isCatalog ? "catalog-trailer-btn" : "trailer-btn movie-details-trailer";

    const finalStatusOptions = statusOptions.length > 0 ? statusOptions : defaultStatusOptions;

    const legalWatchLinks = getLegalWatchLinks(data);
    const primaryLegalLink = legalWatchLinks[0];

    const handleStatusChange = (e) => {
        if (!isAuth) {
            navigate("/login");
            return;
        }

        if (onStatusChange) {
            onStatusChange(data, e.target.value);
        }
    };

    return (
        <>
            <aside className={detailsClass}>
                <button
                    className={closeClass}
                    onClick={onClose}
                >
                    {isCatalog ? "✕" : <ImCross />}
                </button>

                <img
                    className={posterClass}
                    src={getPosterSrc(poster)}
                    alt={title}
                    onClick={scrollToSelected}
                    onError={(e) => {
                        e.currentTarget.src = "/images/no-poster.png";
                    }}
                />

                <span className={typeClass}>
                    {typeLabel}
                </span>

                <h2>{title}</h2>

                {originalTitle && originalTitle !== title && (
                    <p className={originalClass}>
                        {originalTitle}
                    </p>
                )}

                <div className={metaClass}>
                    <span>⭐ {rating}</span>
                    <span>{data.vote_count || 0} оценок</span>
                    <span>{year}</span>
                </div>

                {onStatusChange && (
                    <div className="movie-details-status">
                        <h3>Статус</h3>

                        <select
                            className="movie-status-select"
                            value={currentStatus || ""}
                            onChange={handleStatusChange}
                        >
                            {finalStatusOptions.map((status) => (
                                <option key={status.value} value={status.value}>
                                    {status.label}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {data.overview && (
                    <p className={overviewClass}>
                        {data.overview}
                    </p>
                )}

                <div className={listClass}>
                    {data.runtime && (
                        <p>
                            <b>Продолжительность:</b> {data.runtime} мин
                        </p>
                    )}

                    {data.genres && (
                        <p>
                            <b>Жанры:</b> {data.genres}
                        </p>
                    )}

                    {data.number_of_seasons && (
                        <p>
                            <b>Сезонов:</b> {data.number_of_seasons}
                        </p>
                    )}

                    {data.number_of_episodes && (
                        <p>
                            <b>Серий:</b> {data.number_of_episodes}
                        </p>
                    )}

                    {data.networks && (
                        <p>
                            <b>Платформы:</b> {data.networks}
                        </p>
                    )}

                    {data.country && (
                        <p>
                            <b>Страна:</b> {data.country}
                        </p>
                    )}

                    {data.origin_country && (
                        <p>
                            <b>Страны:</b> {data.origin_country}
                        </p>
                    )}

                    {data.budget !== undefined && formatMoney && (
                        <p>
                            <b>Бюджет:</b> {formatMoney(data.budget)}
                        </p>
                    )}

                    {data.revenue !== undefined && formatMoney && (
                        <p>
                            <b>Сборы:</b> {formatMoney(data.revenue)}
                        </p>
                    )}
                </div>

                {legalWatchLinks.length > 0 && (
                    <div className="legal-watch-panel">
                        <div className="legal-watch-head">
                            <h3>Где смотреть</h3>
                            <p>Откроется поиск по названию на официальных сервисах</p>
                        </div>

                        {primaryLegalLink && (
                            <a
                                href={primaryLegalLink.url}
                                target="_blank"
                                rel="noreferrer"
                                className="legal-watch-primary"
                                title={primaryLegalLink.title}
                                aria-label={`Найти на ${primaryLegalLink.title}`}
                            >
                                <span>Найти на</span>

                                <img
                                    src={primaryLegalLink.logo}
                                    alt={primaryLegalLink.title}
                                    className="legal-watch-primary-logo"
                                    onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                    }}
                                />
                            </a>
                        )}

                        <div className="legal-watch-grid">
                            {legalWatchLinks.slice(1).map((link) => (
                                <a
                                    key={link.id}
                                    href={link.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="legal-watch-link"
                                    title={link.title}
                                    aria-label={`Найти на ${link.title}`}
                                >
                                    <img
                                        src={link.logo}
                                        alt={link.title}
                                        className="legal-watch-logo"
                                        onError={(e) => {
                                            e.currentTarget.style.display = "none";
                                        }}
                                    />
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {data.trailer_embed && (
                    <button
                        className={trailerBtnClass}
                        onClick={() => setTrailerOpen(true)}
                    >
                        {isCatalog ? "Смотреть трейлер" : (
                            <>
                                <PiVideoCameraFill /> Смотреть трейлер
                            </>
                        )}
                    </button>
                )}
            </aside>

            {trailerOpen && data.trailer_embed &&
                createPortal(
                    <div className="trailer-modal" onClick={() => setTrailerOpen(false)}>
                        <div className="trailer-modal-content" onClick={(e) => e.stopPropagation()}>
                            <button
                                className="trailer-modal-close"
                                onClick={() => setTrailerOpen(false)}
                            >
                                ✕
                            </button>

                            <iframe
                                className="trailer-modal-frame"
                                src={data.trailer_embed}
                                title="Трейлер"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    </div>,
                    document.body
                )
            }
        </>
    );
}

export default MovieDetails;