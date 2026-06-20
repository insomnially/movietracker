import Preloader from "../../components/Preloader/Preloader";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getMediaStatuses } from "../../api/mediaStatuses";
import "./StatisticsPage.css";

const statusNames = {
    favorite: "Хочу посмотреть",
    watching: "Смотрю",
    watched: "Посмотрел",
    dropped: "Бросил"
};

function StatisticsPage() {
    const { token } = useAuth();

    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const loadStats = async () => {
            try {
                setLoading(true);

                const data = await getMediaStatuses(token);
                setItems(data);
            } catch (error) {
                console.error(error);
                setItems([]);
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            loadStats();
        }
    }, [token]);

    const stats = useMemo(() => {
        const statusCounts = {
            favorite: 0,
            watching: 0,
            watched: 0,
            dropped: 0
        };

        const sectionCounts = {};
        const genreCounts = {};

        items.forEach((item) => {
            if (statusCounts[item.status] !== undefined) {
                statusCounts[item.status] += 1;
            }

            if (item.section) {
                sectionCounts[item.section] = (sectionCounts[item.section] || 0) + 1;
            }

            if (item.genres) {
                item.genres.split(",").forEach((genre) => {
                    const cleanGenre = genre.trim();

                    if (cleanGenre) {
                        genreCounts[cleanGenre] = (genreCounts[cleanGenre] || 0) + 1;
                    }
                });
            }
        });

        const topGenres = Object.entries(genreCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6);

        return {
            total: items.length,
            statusCounts,
            sectionCounts,
            topGenres
        };
    }, [items]);

    return (
        <main className="statistics-page">
            <section className="statistics-hero">
                <p className="statistics-kicker">Movie Tracker</p>
                <h1>Статистика</h1>
                <p>Обзор твоих фильмов, сериалов и аниме по статусам и жанрам.</p>
            </section>

            {loading ? (
                    <Preloader text="Считаем статистику" variant="block" />
                ) : (
                <>
                    <section className="statistics-cards">
                        <div className="statistics-card main">
                            <span>Всего тайтлов</span>
                            <b>{stats.total}</b>
                        </div>

                        <div className="statistics-card">
                            <span>{statusNames.favorite}</span>
                            <b>{stats.statusCounts.favorite}</b>
                        </div>

                        <div className="statistics-card">
                            <span>{statusNames.watching}</span>
                            <b>{stats.statusCounts.watching}</b>
                        </div>

                        <div className="statistics-card">
                            <span>{statusNames.watched}</span>
                            <b>{stats.statusCounts.watched}</b>
                        </div>

                        <div className="statistics-card">
                            <span>{statusNames.dropped}</span>
                            <b>{stats.statusCounts.dropped}</b>
                        </div>
                    </section>

                    <section className="statistics-grid">
                        <div className="statistics-panel">
                            <h2>По разделам</h2>

                            {Object.keys(stats.sectionCounts).length === 0 ? (
                                <p className="statistics-muted">Пока нет данных</p>
                            ) : (
                                <div className="statistics-list">
                                    {Object.entries(stats.sectionCounts).map(([section, count]) => (
                                        <div key={section}>
                                            <span>{section}</span>
                                            <b>{count}</b>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="statistics-panel">
                            <h2>Любимые жанры</h2>

                            {stats.topGenres.length === 0 ? (
                                <p className="statistics-muted">Пока нет данных</p>
                            ) : (
                                <div className="statistics-list">
                                    {stats.topGenres.map(([genre, count]) => (
                                        <div key={genre}>
                                            <span>{genre}</span>
                                            <b>{count}</b>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                </>
            )}
        </main>
    );
}

export default StatisticsPage;