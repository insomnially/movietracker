import "./MovieTracker.css";
import { useState, useEffect, useRef } from "react";

import { FaFilter } from "react-icons/fa";

import MovieCard from "../../components/MovieCard/MovieCard";
import MovieDetails from "../../components/MovieDetails/MovieDetails.jsx";
import Preloader from "../../components/Preloader/Preloader.jsx";
import { useAuth } from "../../context/AuthContext";
import { deleteMediaStatus, getMediaStatuses, saveMediaStatus } from "../../api/mediaStatuses";

import { API_URL } from '../api'

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

function MovieTracker() {
    const { token, isAuth } = useAuth();
    const isAuthorized = typeof isAuth === "boolean" ? isAuth : !!token;

    const [movies, setMovies] = useState([]);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);

    const [selectedMovie, setSelectedMovie] = useState(null);

    const [showFilters, setShowFilters] = useState(false);
    const [genre, setGenre] = useState("");
    const [minRating, setMinRating] = useState("");
    const [yearFrom, setYearFrom] = useState("");
    const [yearTo, setYearTo] = useState("");
    const [sort, setSort] = useState("rating_desc");
    const [hasTrailer, setHasTrailer] = useState(false);
    const [statusFilter, setStatusFilter] = useState("");

    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [statusMap, setStatusMap] = useState({});

    const movieCardRefs = useRef({});

    const limit = 50;

    const safeMovies = Array.isArray(movies) ? movies : [];

    const normalizeMovie = (movie) => {
        if (!movie) return movie;

        const id = movie.id || movie.media_id;
        const itemKey = movie.item_key || `movies:${id}`;

        return {
            ...movie,
            id,
            section: movie.section || "movies",
            item_key: itemKey,
            poster: movie.poster || movie.poster_local || movie.poster_path || null,
            rating: movie.rating || movie.vote_average || 0,
            year: movie.year || (movie.release_date ? String(movie.release_date).slice(0, 4) : null)
        };
    };

    const getMediaKey = (movie) => {
        if (!movie) return "";

        const id = movie.id || movie.media_id;

        return movie.item_key || `${movie.section || "movies"}:${id}`;
    };

    const selectedStatus = selectedMovie ? statusMap[getMediaKey(selectedMovie)] || selectedMovie.status || "" : "";

    const getTypeLabel = () => {
        return "Фильм";
    };

    const getPosterSrc = (poster) => {
        if (!poster) {
            return "/images/no-poster.png";
        }

        if (String(poster).startsWith("http")) {
            return poster;
        }

        const cleanPoster = String(poster)
            .replaceAll("\\", "/")
            .replace(/^\.?\//, "");

        return `${API_URL}/${cleanPoster}`;
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

    const handleStatusChange = async (item, nextStatus) => {
        if (!isAuthorized || !token) {
            return;
        }

        const normalizedItem = normalizeMovie(item);
        const itemKey = getMediaKey(normalizedItem);

        try {
            if (!nextStatus) {
                await deleteMediaStatus(token, itemKey);

                setStatusMap((prev) => {
                    const copy = { ...prev };
                    delete copy[itemKey];
                    return copy;
                });

                setSelectedMovie((prev) => (
                    prev && getMediaKey(prev) === itemKey
                        ? {
                            ...prev,
                            status: ""
                        }
                        : prev
                ));

                setMovies((prev) => (
                    prev.map((movie) => (
                        getMediaKey(normalizeMovie(movie)) === itemKey
                            ? {
                                ...movie,
                                status: ""
                            }
                            : movie
                    ))
                ));

                return;
            }

            const saved = await saveMediaStatus(token, normalizedItem, nextStatus);
            const savedStatus = saved?.status || nextStatus;

            setStatusMap((prev) => ({
                ...prev,
                [itemKey]: savedStatus
            }));

            setSelectedMovie((prev) => (
                prev && getMediaKey(prev) === itemKey
                    ? {
                        ...prev,
                        status: savedStatus
                    }
                    : prev
            ));

            setMovies((prev) => (
                prev.map((movie) => (
                    getMediaKey(normalizeMovie(movie)) === itemKey
                        ? {
                            ...movie,
                            status: savedStatus
                        }
                        : movie
                ))
            ));
        } catch (error) {
            console.error(error);
        }
    };

    const fetchMovies = async (pageNumber = 1) => {
        const params = new URLSearchParams();

        params.set("page", pageNumber);
        params.set("limit", limit);
        params.set("sort", sort);

        if (search.trim()) {
            params.set("query", search.trim());
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

        const res = await fetch(`${API_URL}/api/movies?${params.toString()}`);

        if (!res.ok) {
            throw new Error("Ошибка загрузки фильмов");
        }

        return await res.json();
    };

    const selectMovie = async (movie) => {
        const normalizedMovie = normalizeMovie(movie);

        try {
            const res = await fetch(`${API_URL}/api/movie/${normalizedMovie.id}`);

            if (!res.ok) {
                setSelectedMovie(normalizedMovie);
                return;
            }

            const data = await res.json();
            const normalizedDetails = normalizeMovie(data);

            setSelectedMovie({
                ...normalizedMovie,
                ...normalizedDetails
            });
        } catch (err) {
            console.error(err);
            setSelectedMovie(normalizedMovie);
        }
    };

    const scrollToSelectedMovie = () => {
        if (!selectedMovie?.id) return;

        const card = movieCardRefs.current[selectedMovie.id];

        if (!card) return;

        card.scrollIntoView({
            behavior: "smooth",
            block: "center",
            inline: "nearest"
        });
    };

    const setCardRef = (id, el) => {
        if (el) {
            movieCardRefs.current[id] = el;
        } else {
            delete movieCardRefs.current[id];
        }
    };

    useEffect(() => {
        loadStatuses();
    }, [token]);

    useEffect(() => {
        let ignore = false;

        const timer = setTimeout(async () => {
            try {
                setLoading(true);

                const data = await fetchMovies(page);

                if (ignore) return;

                setMovies(data.results || []);
                setTotal(data.total || 0);
                setTotalPages(data.totalPages || 1);
            } catch (err) {
                console.error(err);
                setMovies([]);
                setTotal(0);
                setTotalPages(1);
            } finally {
                if (!ignore) {
                    setLoading(false);
                }
            }
        }, 250);

        return () => {
            ignore = true;
            clearTimeout(timer);
        };
    }, [page, search, genre, minRating, yearFrom, yearTo, sort, hasTrailer]);

    const handleSearchChange = (e) => {
        setSearch(e.target.value);
        setPage(1);
        setSelectedMovie(null);
    };

    const resetFilters = () => {
        setGenre("");
        setMinRating("");
        setYearFrom("");
        setYearTo("");
        setSort("rating_desc");
        setHasTrailer(false);
        setStatusFilter("");
        setPage(1);
        setSelectedMovie(null);
    };

    const goToPage = (pageNumber) => {
        if (pageNumber < 1 || pageNumber > totalPages || pageNumber === page) return;

        setPage(pageNumber);
        setSelectedMovie(null);

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };

    const formatMoney = (value) => {
        if (!value || Number(value) === 0) {
            return "Нет данных";
        }

        return new Intl.NumberFormat("ru-RU", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0
        }).format(Number(value));
    };

    const getPaginationPages = () => {
        const pages = [];
        const start = Math.max(1, page - 2);
        const end = Math.min(totalPages, page + 2);

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }

        return pages;
    };

    const normalizedMovies = safeMovies.map(normalizeMovie);

    const filteredMovies = normalizedMovies.filter((movie) => {
        if (!movie.title) {
            return false;
        }

        if (statusFilter) {
            const movieStatus = statusMap[getMediaKey(movie)] || movie.status || "";

            if (movieStatus !== statusFilter) {
                return false;
            }
        }

        return true;
    });

    return (
        <>
            <div className="topbar">
                <div className="searchbar-movietracker">
                    <input
                        id="searchbarid"
                        type="text"
                        placeholder="🔎︎ Поиск фильмов..."
                        value={search}
                        onChange={handleSearchChange}
                    />
                </div>

                <div className="filters-wrapper">
                    <button
                        type="button"
                        className={`filters-btn ${showFilters ? "active" : ""}`}
                        onClick={() => setShowFilters((prev) => !prev)}
                    >
                        <FaFilter />
                        Фильтры
                    </button>

                    {showFilters && (
                        <div className="filters-dropdown filters-panel">
                            <label>
                                <span>Жанр</span>

                                <select value={genre} onChange={(e) => {
                                    setGenre(e.target.value);
                                    setPage(1);
                                    setSelectedMovie(null);
                                }}>
                                    {genreOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                <span>Рейтинг от</span>

                                <select value={minRating} onChange={(e) => {
                                    setMinRating(e.target.value);
                                    setPage(1);
                                    setSelectedMovie(null);
                                }}>
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
                                    placeholder="2000"
                                    value={yearFrom}
                                    onChange={(e) => {
                                        setYearFrom(e.target.value);
                                        setPage(1);
                                        setSelectedMovie(null);
                                    }}
                                />
                            </label>

                            <label>
                                <span>Год до</span>

                                <input
                                    type="number"
                                    placeholder="2026"
                                    value={yearTo}
                                    onChange={(e) => {
                                        setYearTo(e.target.value);
                                        setPage(1);
                                        setSelectedMovie(null);
                                    }}
                                />
                            </label>

                            <label>
                                <span>Сортировка</span>

                                <select value={sort} onChange={(e) => {
                                    setSort(e.target.value);
                                    setPage(1);
                                    setSelectedMovie(null);
                                }}>
                                    {sortOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                <span>Мой статус</span>

                                <select value={statusFilter} onChange={(e) => {
                                    setStatusFilter(e.target.value);
                                    setPage(1);
                                    setSelectedMovie(null);
                                }}>
                                    {statusOptions.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className="filters-check">
                                <input
                                    type="checkbox"
                                    checked={hasTrailer}
                                    onChange={(e) => {
                                        setHasTrailer(e.target.checked);
                                        setPage(1);
                                        setSelectedMovie(null);
                                    }}
                                />

                                <span>Только с трейлером</span>
                            </label>

                            <button
                                type="button"
                                className="filters-reset"
                                onClick={resetFilters}
                            >
                                Сбросить
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className={`content-area ${selectedMovie ? "details-open" : ""}`}>
                <div className="movies-section">
                    <h2 className="movies-title">
                        Популярное
                    </h2>

                    {loading && (
                        <Preloader text="Загружаем фильмы" variant="block" />
                    )}

                    {!loading && filteredMovies.length === 0 && (
                        <div className="movies-empty">
                            Фильмы не найдены
                        </div>
                    )}

                    {!loading && (
                    <div className="moviecards-main">
                        {filteredMovies.map((movie) => (
                            <MovieCard
                                key={movie.id}
                                movie={movie}
                                selectedMovie={selectedMovie}
                                getPosterSrc={getPosterSrc}
                                getTypeLabel={getTypeLabel}
                                setCardRef={setCardRef}
                                onSelect={selectMovie}
                                currentStatus={statusMap[getMediaKey(movie)] || movie.status || ""}
                                onStatusChange={handleStatusChange}
                            />
                        ))}
                    </div>
                    )}

                    {!statusFilter && totalPages > 1 && (
                        <>
                            <div className="pagination_movietracker">
                                <button
                                    className="pagination-btn"
                                    onClick={() => goToPage(page - 1)}
                                    disabled={page === 1 || loading}
                                >
                                    Назад
                                </button>

                                {page > 3 && (
                                    <>
                                        <button
                                            className="pagination-btn"
                                            onClick={() => goToPage(1)}
                                            disabled={loading}
                                        >
                                            1
                                        </button>

                                        <span className="pagination-info">...</span>
                                    </>
                                )}

                                {getPaginationPages().map((pageNumber) => (
                                    <button
                                        key={pageNumber}
                                        className={`pagination-btn ${pageNumber === page ? "active" : ""}`}
                                        onClick={() => goToPage(pageNumber)}
                                        disabled={loading}
                                    >
                                        {pageNumber}
                                    </button>
                                ))}

                                {page < totalPages - 2 && (
                                    <>
                                        <span className="pagination-info">...</span>

                                        <button
                                            className="pagination-btn"
                                            onClick={() => goToPage(totalPages)}
                                            disabled={loading}
                                        >
                                            {totalPages}
                                        </button>
                                    </>
                                )}

                                <button
                                    className="pagination-btn"
                                    onClick={() => goToPage(page + 1)}
                                    disabled={page === totalPages || loading}
                                >
                                    Вперёд
                                </button>
                            </div>

                            <div style={{ marginBottom: "10px" }} className="pagination-info">
                                Страница {page} из {totalPages} · Всего фильмов: {statusFilter ? filteredMovies.length : total}
                            </div>
                        </>
                    )}
                </div>

                {selectedMovie && (
                    <MovieDetails
                        item={selectedMovie}
                        getPosterSrc={getPosterSrc}
                        formatMoney={formatMoney}
                        scrollToSelected={scrollToSelectedMovie}
                        onClose={() => setSelectedMovie(null)}
                        isAuth={isAuthorized}
                        statusOptions={statusOptions}
                        currentStatus={selectedStatus}
                        onStatusChange={handleStatusChange}
                    />
                )}
            </div>
        </>
    );
}

export default MovieTracker;