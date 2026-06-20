import { useEffect, useRef, useState } from "react";
import "./CatalogPage.css";

import MovieCard from "../../components/MovieCard/MovieCard.jsx";
import MovieDetails from "../../components/MovieDetails/MovieDetails.jsx";
import Preloader from "../../components/Preloader/Preloader.jsx";
import { useAuth } from "../../context/AuthContext";
import { deleteMediaStatus, getMediaStatuses, saveMediaStatus } from "../../api/mediaStatuses";

const CATALOG_LIMIT = 24;

const sections = [
    {
        id: "movies",
        title: "Фильмы"
    },
    {
        id: "series",
        title: "Сериалы"
    },
    {
        id: "anime",
        title: "Аниме"
    }
];

const statusOptions = [
    {
        value: "",
        label: "Нет",
        icon: "○"
    },
    {
        value: "favorite",
        label: "Хочу посмотреть",
        icon: "♡"
    },
    {
        value: "watching",
        label: "Смотрю",
        icon: "👁"
    },
    {
        value: "watched",
        label: "Посмотрел",
        icon: "✓"
    },
    {
        value: "dropped",
        label: "Бросил",
        icon: "✕"
    }
];

const genreOptions = [
    {
        value: "",
        label: "Все жанры"
    },
    {
        value: "Action|Боевик|боевик",
        label: "Боевик"
    },
    {
        value: "Adventure|Приключения|приключения",
        label: "Приключения"
    },
    {
        value: "Comedy|Комедия|комедия",
        label: "Комедия"
    },
    {
        value: "Drama|Драма|драма",
        label: "Драма"
    },
    {
        value: "Horror|Ужасы|ужасы",
        label: "Ужасы"
    },
    {
        value: "Thriller|Триллер|триллер",
        label: "Триллер"
    },
    {
        value: "Romance|Романтика|Мелодрама|романтика|мелодрама",
        label: "Романтика"
    },
    {
        value: "Fantasy|Фэнтези|фэнтези",
        label: "Фэнтези"
    },
    {
        value: "Science Fiction|Sci-Fi|Фантастика|фантастика",
        label: "Фантастика"
    },
    {
        value: "Animation|Анимация|анимация",
        label: "Анимация"
    },
    {
        value: "Crime|Криминал|криминал",
        label: "Криминал"
    },
    {
        value: "Mystery|Детектив|детектив",
        label: "Детектив"
    },
    {
        value: "Family|Семейный|семейный",
        label: "Семейный"
    }
];

const sortOptions = [
    {
        value: "rating_desc",
        label: "Сначала высокий рейтинг"
    },
    {
        value: "rating_asc",
        label: "Сначала низкий рейтинг"
    },
    {
        value: "year_desc",
        label: "Сначала новые"
    },
    {
        value: "year_asc",
        label: "Сначала старые"
    },
    {
        value: "popular_desc",
        label: "Сначала популярные"
    },
    {
        value: "title_asc",
        label: "По названию А-Я"
    }
];

function CatalogPage() {
    const { token, isAuth } = useAuth();

    const [activeSection, setActiveSection] = useState("movies");
    const [items, setItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [activeSearch, setActiveSearch] = useState("");
    const [loading, setLoading] = useState(false);
    const [firstLoading, setFirstLoading] = useState(true);
    const [error, setError] = useState("");
    const [statusMap, setStatusMap] = useState({});

    const [showFilters, setShowFilters] = useState(false);
    const [genre, setGenre] = useState("");
    const [minRating, setMinRating] = useState("");
    const [yearFrom, setYearFrom] = useState("");
    const [yearTo, setYearTo] = useState("");
    const [sort, setSort] = useState("rating_desc");
    const [hasTrailer, setHasTrailer] = useState(false);
    const [mediaType, setMediaType] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const cardRefs = useRef({});
    const totalPages = Math.ceil(total / CATALOG_LIMIT);

    const normalizeItem = (item) => {
        if (!item) {
            return item;
        }

        const section = item.section || activeSection;
        const id = item.id || item.media_id || item.tmdb_id;
        const itemKey = item.item_key || `${section}:${id}`;

        return {
            ...item,
            id,
            section,
            item_key: itemKey
        };
    };

    const getMediaKey = (item) => {
        if (!item) {
            return "";
        }

        return item.item_key || `${item.section || activeSection}:${item.id || item.media_id || item.tmdb_id}`;
    };

    const loadCatalog = async () => {
        setLoading(true);
        setError("");

        try {
            const params = new URLSearchParams({
                page: String(page),
                limit: String(CATALOG_LIMIT),
                sort
            });

            if (activeSearch) {
                params.set("search", activeSearch);
            }

            if (genre) {
                params.set("genre", genre);
            }

            if (minRating) {
                params.set("rating", minRating);
            }

            if (yearFrom) {
                params.set("yearFrom", yearFrom);
            }

            if (yearTo) {
                params.set("yearTo", yearTo);
            }

            if (hasTrailer) {
                params.set("hasTrailer", "1");
            }

            if (activeSection === "anime" && mediaType) {
                params.set("mediaType", mediaType);
            }

            const response = await fetch(`${API_URL}/api/catalog/${activeSection}?${params.toString()}`);

            if (!response.ok) {
                throw new Error("Ошибка загрузки каталога");
            }

            const data = await response.json();
            const results = Array.isArray(data.results) ? data.results : [];
            const normalized = results.map(normalizeItem);

            setItems(normalized);
            setTotal(Number(data.total) || 0);
        } catch (error) {
            console.error(error);
            setItems([]);
            setTotal(0);
            setError("Не удалось загрузить каталог");
        } finally {
            setLoading(false);
            setFirstLoading(false);
        }
    };

    const loadStatuses = async () => {
        if (!token) {
            setStatusMap({});
            return;
        }

        try {
            const data = await getMediaStatuses(token);
            const rows = Array.isArray(data) ? data : data.results || [];
            const nextMap = {};

            rows.forEach((row) => {
                const itemKey = row.item_key || `${row.section || "movies"}:${row.media_id || row.id}`;

                if (itemKey) {
                    nextMap[itemKey] = row.status;
                }
            });

            setStatusMap(nextMap);
        } catch (error) {
            console.error(error);
            setStatusMap({});
        }
    };

    useEffect(() => {
        const timeout = setTimeout(() => {
            setPage(1);
            setActiveSearch(search.trim());
        }, 350);

        return () => clearTimeout(timeout);
    }, [search]);

    useEffect(() => {
        loadCatalog();
    }, [activeSection, page, activeSearch, genre, minRating, yearFrom, yearTo, sort, hasTrailer, mediaType]);

    useEffect(() => {
        loadStatuses();
    }, [token]);

    const selectedStatus = selectedItem ? statusMap[getMediaKey(selectedItem)] || selectedItem.status || "" : "";

    const filteredItems = statusFilter
        ? items.filter((item) => {
            const itemStatus = statusMap[getMediaKey(item)] || item.status || "";
            return itemStatus === statusFilter;
        })
        : items;

    const changeSection = (section) => {
        setActiveSection(section);
        setPage(1);
        setSelectedItem(null);
        setMediaType("");
        setStatusFilter("");
    };

    const resetFilters = () => {
        setGenre("");
        setMinRating("");
        setYearFrom("");
        setYearTo("");
        setSort("rating_desc");
        setHasTrailer(false);
        setMediaType("");
        setStatusFilter("");
        setPage(1);
    };

    const getPosterSrc = (poster) => {
        if (!poster) {
            return "/images/no-poster.png";
        }

        if (typeof poster === "string" && poster.startsWith("http")) {
            return poster;
        }

        const cleanPoster = String(poster)
            .replaceAll("\\", "/")
            .replace(/^\.?\//, "");

        return `${API_URL}/${cleanPoster}`;
    };

    const getTypeLabel = (item) => {
        if (item.section === "movies") {
            return "Фильм";
        }

        if (item.section === "series") {
            return "Сериал";
        }

        if (item.section === "anime" && item.media_type === "movie") {
            return "Аниме-фильм";
        }

        if (item.section === "anime" && item.media_type === "tv") {
            return "Аниме-сериал";
        }

        return "Каталог";
    };

    const getShortGenres = (genres) => {
        if (!genres) {
            return "";
        }

        return String(genres).split(",").slice(0, 2).join(", ");
    };

    const setCardRef = (itemKey, el) => {
        if (el) {
            cardRefs.current[itemKey] = el;
        } else {
            delete cardRefs.current[itemKey];
        }
    };

    const scrollToSelectedCard = () => {
        if (!selectedItem?.item_key) {
            return;
        }

        const card = cardRefs.current[selectedItem.item_key];

        if (!card) {
            return;
        }

        card.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest"
        });
    };

    const handleSelectItem = (item) => {
        setSelectedItem(normalizeItem(item));
    };

    const handleStatusChange = async (item, nextStatus) => {
        if (!isAuth || !token) {
            return;
        }

        const normalizedItem = normalizeItem(item);
        const itemKey = getMediaKey(normalizedItem);

        try {
            if (!nextStatus) {
                await deleteMediaStatus(token, itemKey);

                setStatusMap((prev) => {
                    const copy = { ...prev };
                    delete copy[itemKey];
                    return copy;
                });

                setItems((prev) => (
                    prev.map((el) => (
                        getMediaKey(el) === itemKey
                            ? {
                                ...el,
                                status: ""
                            }
                            : el
                    ))
                ));

                setSelectedItem((prev) => (
                    prev && getMediaKey(prev) === itemKey
                        ? {
                            ...prev,
                            status: ""
                        }
                        : prev
                ));

                return;
            }

            const saved = await saveMediaStatus(token, normalizedItem, nextStatus);
            const savedStatus = saved?.status || nextStatus;

            setStatusMap((prev) => ({
                ...prev,
                [itemKey]: savedStatus
            }));

            setItems((prev) => (
                prev.map((el) => (
                    getMediaKey(el) === itemKey
                        ? {
                            ...el,
                            status: savedStatus
                        }
                        : el
                ))
            ));

            setSelectedItem((prev) => (
                prev && getMediaKey(prev) === itemKey
                    ? {
                        ...prev,
                        status: savedStatus
                    }
                    : prev
            ));
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <main className="catalog-page">
            <section className="catalog-hero">
                <div>
                    <p className="catalog-kicker">Movie Tracker</p>
                    <h1>Каталог</h1>
                    <p>Выбирай фильмы, сериалы или аниме и открывай подробную информацию.</p>
                </div>

                <div className="catalog-search">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Поиск по названию или жанру"
                    />

                    <button
                        type="button"
                        className={`catalog-filter-toggle ${showFilters ? "active" : ""}`}
                        onClick={() => setShowFilters((prev) => !prev)}
                    >
                        Фильтры
                    </button>
                </div>
            </section>

            <section className="catalog-tabs">
                {sections.map((section) => (
                    <button
                        key={section.id}
                        className={`catalog-tab ${activeSection === section.id ? "active" : ""}`}
                        onClick={() => changeSection(section.id)}
                    >
                        {section.title}
                    </button>
                ))}
            </section>

            {showFilters && (
                <section className="catalog-filters">
                    <label>
                        <span>Жанр</span>

                        <select
                            value={genre}
                            onChange={(e) => {
                                setGenre(e.target.value);
                                setPage(1);
                            }}
                        >
                            {genreOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label>
                        <span>Рейтинг от</span>

                        <select
                            value={minRating}
                            onChange={(e) => {
                                setMinRating(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">Любой</option>
                            <option value="5">5+</option>
                            <option value="6">6+</option>
                            <option value="7">7+</option>
                            <option value="8">8+</option>
                            <option value="9">9+</option>
                        </select>
                    </label>

                    <label>
                        <span>Год от</span>

                        <input
                            type="number"
                            value={yearFrom}
                            onChange={(e) => {
                                setYearFrom(e.target.value);
                                setPage(1);
                            }}
                            placeholder="2000"
                        />
                    </label>

                    <label>
                        <span>Год до</span>

                        <input
                            type="number"
                            value={yearTo}
                            onChange={(e) => {
                                setYearTo(e.target.value);
                                setPage(1);
                            }}
                            placeholder="2026"
                        />
                    </label>

                    <label>
                        <span>Сортировка</span>

                        <select
                            value={sort}
                            onChange={(e) => {
                                setSort(e.target.value);
                                setPage(1);
                            }}
                        >
                            {sortOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    {activeSection === "anime" && (
                        <label>
                            <span>Тип аниме</span>

                            <select
                                value={mediaType}
                                onChange={(e) => {
                                    setMediaType(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <option value="">Любой</option>
                                <option value="tv">Сериал</option>
                                <option value="movie">Фильм</option>
                            </select>
                        </label>
                    )}

                    <label>
                        <span>Мой статус</span>

                        <select
                            value={statusFilter}
                            onChange={(e) => {
                                setStatusFilter(e.target.value);
                                setPage(1);
                            }}
                        >
                            {statusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="catalog-filter-check">
                        <input
                            type="checkbox"
                            checked={hasTrailer}
                            onChange={(e) => {
                                setHasTrailer(e.target.checked);
                                setPage(1);
                            }}
                        />

                        <span>Только с трейлером</span>
                    </label>

                    <button
                        type="button"
                        className="catalog-filter-reset"
                        onClick={resetFilters}
                    >
                        Сбросить
                    </button>
                </section>
            )}

            <section className={`catalog-content ${selectedItem ? "details-open" : ""}`}>
                <div className="catalog-list">
                    <div className="catalog-list-top">
                        <h2>
                            {sections.find((section) => section.id === activeSection)?.title}
                        </h2>

                        <span>
                            Найдено: {statusFilter ? filteredItems.length : total}
                        </span>
                    </div>

                    {firstLoading ? (
                        <Preloader text="Загружаем каталог" variant="block" />
                    ) : (
                        <>
                            {error && (
                                <div className="catalog-message">
                                    {error}
                                </div>
                            )}

                            {loading && (
                                <Preloader text="Обновляем подборку" variant="small" />
                            )}

                            {!loading && !error && filteredItems.length === 0 && (
                                <div className="catalog-message">
                                    Ничего не найдено
                                </div>
                            )}

                            {!error && filteredItems.length > 0 && (
                                <div className={`catalog-grid ${loading ? "catalog-grid-loading" : ""}`}>
                                    {filteredItems.map((item) => (
                                        <MovieCard
                                            key={getMediaKey(item)}
                                            item={item}
                                            movie={item}
                                            selectedItem={selectedItem}
                                            selectedMovie={selectedItem}
                                            getPosterSrc={getPosterSrc}
                                            getTypeLabel={getTypeLabel}
                                            getShortGenres={getShortGenres}
                                            setCardRef={setCardRef}
                                            onSelect={handleSelectItem}
                                            variant="catalog"
                                            currentStatus={statusMap[getMediaKey(item)] || item.status || ""}
                                            onStatusChange={handleStatusChange}
                                        />
                                    ))}
                                </div>
                            )}

                            {!statusFilter && !loading && !error && totalPages > 1 && (
                                <div className="catalog-pagination">
                                    <button
                                        disabled={page <= 1}
                                        onClick={() => setPage((prev) => prev - 1)}
                                    >
                                        Назад
                                    </button>

                                    <span>
                                        {page} / {totalPages}
                                    </span>

                                    <button
                                        disabled={page >= totalPages}
                                        onClick={() => setPage((prev) => prev + 1)}
                                    >
                                        Вперёд
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {selectedItem && (
                    <MovieDetails
                        item={selectedItem}
                        getPosterSrc={getPosterSrc}
                        getTypeLabel={getTypeLabel}
                        scrollToSelected={scrollToSelectedCard}
                        onClose={() => setSelectedItem(null)}
                        variant="catalog"
                        isAuth={isAuth}
                        statusOptions={statusOptions}
                        currentStatus={selectedStatus}
                        onStatusChange={handleStatusChange}
                    />
                )}
            </section>
        </main>
    );
}

export default CatalogPage;