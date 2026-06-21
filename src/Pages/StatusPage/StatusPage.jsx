import { useEffect, useMemo, useState } from "react";
import MovieCard from "../../components/MovieCard/MovieCard";
import MovieDetails from "../../components/MovieDetails/MovieDetails";
import Preloader from "../../components/Preloader/Preloader";
import { useAuth } from "../../context/AuthContext";
import { deleteMediaStatus, getMediaStatuses, saveMediaStatus } from "../../../api/mediaStatuses"
import "./StatusPage.css";

import { API_URL } from '../../../api'

const statusOptions = [
    {
        value: "",
        label: "Без статуса",
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

function StatusPage({ status, title }) {
    const { token, isAuth } = useAuth();
    const isAuthorized = typeof isAuth === "boolean" ? isAuth : !!token;

    const [items, setItems] = useState([]);
    const [selectedItem, setSelectedItem] = useState(null);
    const [loading, setLoading] = useState(false);
    const [statusMap, setStatusMap] = useState({});

    const parseStatusRow = (row) => {
        const rawKey = row.item_key || `${row.section || "movies"}:${row.media_id || row.id}`;
        const rawKeyString = String(rawKey);
        const hasSectionInKey = rawKeyString.includes(":");
        const [keySection, keyId] = hasSectionInKey ? rawKeyString.split(":") : [null, rawKeyString];

        const section = row.section || keySection || "movies";
        const id = row.media_id || row.id || keyId || rawKeyString;
        const itemKey = row.item_key || `${section}:${id}`;
        const lookupKey = hasSectionInKey ? rawKeyString : `${section}:${id}`;

        return {
            ...row,
            id,
            media_id: row.media_id || id,
            section,
            item_key: itemKey,
            lookup_key: lookupKey,
            title: row.title || "",
            poster: row.poster || row.poster_local || row.poster_path || null,
            poster_local: row.poster_local || row.poster || row.poster_path || null,
            rating: row.rating || row.vote_average || 0,
            year: row.year || (row.release_date ? String(row.release_date).slice(0, 4) : null),
            status: row.status
        };
    };

    const fetchMediaDetails = async (row) => {
        const baseItem = parseStatusRow(row);

        if (
            baseItem.title &&
            baseItem.title !== baseItem.item_key &&
            (baseItem.poster || baseItem.poster_local || baseItem.poster_path)
        ) {
            return baseItem;
        }

        const lookupId = encodeURIComponent(baseItem.lookup_key || baseItem.id);

        const urls = baseItem.section === "movies"
            ? [
                `${API_URL}/api/movie/${baseItem.id}`,
                `${API_URL}/api/catalog/movies/${lookupId}`
            ]
            : [
                `${API_URL}/api/catalog/${baseItem.section}/${lookupId}`
            ];

        for (const url of urls) {
            try {
                const response = await fetch(url);

                if (!response.ok) {
                    continue;
                }

                const details = await response.json();

                return {
                    ...baseItem,
                    ...details,
                    id: details.id || baseItem.id,
                    media_id: baseItem.media_id || details.id || details.tmdb_id || baseItem.id,
                    section: baseItem.section,
                    item_key: baseItem.item_key,
                    lookup_key: baseItem.lookup_key,
                    status: baseItem.status,
                    title: details.title || details.name || baseItem.title || baseItem.item_key,
                    poster: details.poster || details.poster_local || details.poster_path || baseItem.poster,
                    poster_local: details.poster_local || details.poster || details.poster_path || baseItem.poster_local,
                    rating: details.rating || details.vote_average || baseItem.rating || 0,
                    year: details.year
                        || (details.release_date ? String(details.release_date).slice(0, 4) : null)
                        || (details.first_air_date ? String(details.first_air_date).slice(0, 4) : null)
                        || baseItem.year,
                    genres: details.genres || baseItem.genres,
                    country: details.country || details.origin_country || baseItem.country
                };
            } catch (error) {
                console.error(error);
            }
        }

        return {
            ...baseItem,
            title: baseItem.title || baseItem.item_key
        };
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

    const getMediaKey = (item) => {
        if (!item) return "";

        return item.item_key || `${item.section || "movies"}:${item.media_id || item.id}`;
    };

    const loadItems = async () => {
        if (!token) {
            setItems([]);
            setStatusMap({});
            return;
        }

        try {
            setLoading(true);

            const data = await getMediaStatuses(token, status);
            const rows = Array.isArray(data) ? data : data.results || [];
            const enrichedItems = await Promise.all(rows.map(fetchMediaDetails));

            const nextMap = {};

            enrichedItems.forEach((item) => {
                nextMap[getMediaKey(item)] = item.status;
            });

            setItems(enrichedItems);
            setStatusMap(nextMap);
        } catch (error) {
            console.error(error);
            setItems([]);
            setStatusMap({});
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadItems();
    }, [token, status]);

    const handleStatusChange = async (item, nextStatus) => {
        if (!isAuthorized || !token) {
            return;
        }

        const itemKey = getMediaKey(item);

        try {
            if (!nextStatus) {
                await deleteMediaStatus(token, itemKey);

                setItems((prev) => prev.filter((el) => getMediaKey(el) !== itemKey));

                setStatusMap((prev) => {
                    const copy = { ...prev };
                    delete copy[itemKey];
                    return copy;
                });

                if (selectedItem && getMediaKey(selectedItem) === itemKey) {
                    setSelectedItem(null);
                }

                return;
            }

            const saved = await saveMediaStatus(token, item, nextStatus);
            const savedStatus = saved?.status || nextStatus;

            setStatusMap((prev) => ({
                ...prev,
                [itemKey]: savedStatus
            }));

            if (nextStatus !== status) {
                setItems((prev) => prev.filter((el) => getMediaKey(el) !== itemKey));

                if (selectedItem && getMediaKey(selectedItem) === itemKey) {
                    setSelectedItem(null);
                }

                return;
            }

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

    const currentItems = useMemo(() => {
        return items.filter((item) => {
            const itemKey = getMediaKey(item);
            return statusMap[itemKey] === status || item.status === status;
        });
    }, [items, statusMap, status]);

    const selectedStatus = selectedItem ? statusMap[getMediaKey(selectedItem)] || selectedItem.status || "" : "";

    return (
        <main className="status-page">
            <section className="status-hero">
                <p className="status-kicker">Movie Tracker</p>
                <h1>{title}</h1>
                <p>Здесь отображаются фильмы и тайтлы, которые ты добавил в этот статус.</p>
            </section>

            <section className={`status-content ${selectedItem ? "details-open" : ""}`}>
                <div className="status-list">
                    {loading && (
                        <Preloader text={`Загружаем "${title}"`} variant="block" />
                    )}

                    {!loading && currentItems.length === 0 && (
                        <div className="status-message">
                            Тут пока пусто
                        </div>
                    )}

                    {!loading && currentItems.length > 0 && (
                        <div className="catalog-grid">
                            {currentItems.map((item) => (
                                <MovieCard
                                key={getMediaKey(item)}
                                item={item}
                                selectedItem={selectedItem}
                                getPosterSrc={getPosterSrc}
                                getTypeLabel={getTypeLabel}
                                getShortGenres={getShortGenres}
                                onSelect={setSelectedItem}
                                variant="catalog"
                                currentStatus={statusMap[getMediaKey(item)] || item.status || ""}
                            />
                            ))}
                        </div>
                    )}
                </div>

                {selectedItem && (
                    <MovieDetails
                        item={selectedItem}
                        getPosterSrc={getPosterSrc}
                        getTypeLabel={getTypeLabel}
                        onClose={() => setSelectedItem(null)}
                        variant="catalog"
                        isAuth={isAuthorized}
                        statusOptions={statusOptions}
                        currentStatus={selectedStatus}
                        onStatusChange={handleStatusChange}
                    />
                )}
            </section>
        </main>
    );
}

export default StatusPage;