import { FaHeart, FaEye } from "react-icons/fa";
import { LuEyeClosed } from "react-icons/lu";
import { IoIosHeartDislike } from "react-icons/io";

const statusLabels = {
    favorite: "Хочу посмотреть",
    watching: "Смотрю",
    watched: "Посмотрел",
    dropped: "Бросил"
};

const statusActions = [
    {
        value: "favorite",
        label: "Хочу посмотреть",
        icon: <FaHeart />
    },
    {
        value: "watching",
        label: "Смотрю",
        icon: <FaEye />
    },
    {
        value: "watched",
        label: "Посмотрел",
        icon: <LuEyeClosed />
    },
    {
        value: "dropped",
        label: "Бросил",
        icon: <IoIosHeartDislike />
    }
];

function MovieCard({
    item,
    movie,
    selectedItem,
    selectedMovie,
    getPosterSrc,
    getTypeLabel,
    getShortGenres,
    setCardRef,
    onSelect,
    variant = "movie",
    currentStatus = "",
    onStatusChange
}) {
    const data = item || movie;
    const selected = selectedItem || selectedMovie;

    if (!data) {
        return null;
    }

    const isCatalog = variant === "catalog";
    const itemKey = data.item_key || `${data.section || "movies"}:${data.id}`;
    const selectedKey = selected?.item_key || (selected?.id ? `${selected?.section || "movies"}:${selected.id}` : null);
    const isSelected = selectedKey === itemKey || selected?.id === data.id;

    const poster = data.poster || data.poster_local || data.poster_path;
    const rating = Number(data.rating || data.vote_average || 0).toFixed(1);
    const year = data.year || data.release_date?.slice(0, 4) || "Год неизвестен";
    const genres = getShortGenres ? getShortGenres(data.genres) : data.genres;
    const typeLabel = getTypeLabel ? getTypeLabel(data) : isCatalog ? "Каталог" : "";
    const statusLabel = statusLabels[currentStatus] || "";
    const canChangeStatus = typeof onStatusChange === "function";

    const handleRef = (el) => {
        if (setCardRef) {
            setCardRef(itemKey, el);
        }
    };

    const handleStatusClick = (e, status) => {
        e.stopPropagation();

        if (!canChangeStatus) {
            return;
        }

        const nextStatus = currentStatus === status ? "" : status;
        onStatusChange(data, nextStatus);
    };

    const badges = (
        <div className="movie-card-badges">
            {typeLabel && (
                <span className="movie-card-type-badge">
                    {typeLabel}
                </span>
            )}

            {statusLabel && (
                <span className={`movie-card-status-badge status-${currentStatus}`}>
                    {statusLabel}
                </span>
            )}
        </div>
    );

    const statusButtons = (
        <div className="movie-card-status-actions">
            {statusActions.map((status) => (
                <button
                    key={status.value}
                    type="button"
                    className={`movie-card-status-action status-${status.value} ${currentStatus === status.value ? "active" : ""}`}
                    onClick={(e) => handleStatusClick(e, status.value)}
                    title={status.label}
                    aria-label={status.label}
                    aria-pressed={currentStatus === status.value}
                >
                    {status.icon}
                </button>
            ))}
        </div>
    );

    if (variant === "catalog") {
        return (
            <article
                ref={handleRef}
                className={`catalog-card ${isSelected ? "selected" : ""}`}
                onClick={() => onSelect(data)}
            >
                <div className="catalog-poster-wrap">
                    <img
                        className="catalog-poster"
                        src={getPosterSrc(poster)}
                        alt={data.title}
                        onError={(e) => {
                            e.currentTarget.src = "/images/no-poster.png";
                        }}
                    />

                    {badges}

                    {canChangeStatus && statusButtons}
                </div>

                <div className="catalog-card-info">
                    <h3>{data.title}</h3>

                    <p>
                        ⭐ {rating}
                    </p>

                    {genres && (
                        <p>{genres}</p>
                    )}

                    <p>{year}</p>
                </div>
            </article>
        );
    }

    return (
        <div
            ref={handleRef}
            className={`moviecard ${isSelected ? "selected" : ""}`}
            onClick={() => onSelect(data)}
        >
            <div className="movie-poster-wrap">
                <img
                    className="movie-poster"
                    src={getPosterSrc(poster)}
                    alt={data.title}
                    onError={(e) => {
                        e.currentTarget.src = "/images/no-poster.png";
                    }}
                />

                {badges}

                {canChangeStatus && statusButtons}
            </div>

            <div className="movie-info">
                <h3>{data.title}</h3>

                <p>
                    ⭐ <strong style={{ fontSize: "1.3rem", color: "gold" }}>
                        {rating}
                    </strong>
                </p>

                {data.genres && (
                    <p>{data.genres}</p>
                )}

                {data.country && (
                    <p>{data.country}</p>
                )}

                <p>{year}</p>
            </div>
        </div>
    );
}

export default MovieCard;