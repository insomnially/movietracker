import Preloader from "../../components/Preloader/Preloader";
import { Link, useNavigate } from "react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getMediaStatuses } from "../../api/mediaStatuses";
import { IoIosArrowRoundBack } from "react-icons/io";
import "./ProfilePage.css";

const statusNames = {
    favorite: "Хочу посмотреть",
    watching: "Смотрю",
    watched: "Посмотрел",
    dropped: "Бросил"
};

function ProfilePage() {
    const navigate = useNavigate();
    const { user, token, logout } = useAuth();

    const [profileUser, setProfileUser] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [avatarLoading, setAvatarLoading] = useState(false);

    const fileInputRef = useRef(null);

    const API_URL = "http://localhost:5000";

    useEffect(() => {
        const loadProfileUser = async () => {
            try {
                if (!token) return;

                const res = await fetch(`${API_URL}/api/user`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (!res.ok) {
                    throw new Error("Ошибка загрузки пользователя");
                }

                const data = await res.json();

                setProfileUser(data);
                localStorage.setItem("user", JSON.stringify(data));
            } catch (error) {
                console.error(error);
                setProfileUser(user);
            }
        };

        loadProfileUser();
    }, [token]);

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
        return items.reduce((acc, item) => {
            acc[item.status] = (acc[item.status] || 0) + 1;
            return acc;
        }, {});
    }, [items]);

    const total = items.length;

    const currentUser = profileUser || user;

    const getAvatarSrc = () => {
        if (!currentUser?.avatar_url) return null;

        if (currentUser.avatar_url.startsWith("http")) {
            return currentUser.avatar_url;
        }

        return `${API_URL}${currentUser.avatar_url}`;
    };

    const getUserLetter = () => {
        return currentUser?.name?.[0]?.toUpperCase() || "U";
    };

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];

        if (!file) return;

        try {
            setAvatarLoading(true);

            const formData = new FormData();
            formData.append("avatar", file);

            const res = await fetch(`${API_URL}/api/user/avatar`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`
                },
                body: formData
            });

            if (!res.ok) {
                throw new Error("Ошибка загрузки аватарки");
            }

            const data = await res.json();

            setProfileUser(data);
            localStorage.setItem("user", JSON.stringify(data));
            window.dispatchEvent(new CustomEvent("user-updated", { detail: data }));
        } catch (error) {
            console.error(error);
        } finally {
            setAvatarLoading(false);
            e.target.value = "";
        }
    };

    const handleLogout = () => {
        logout();
        navigate("/login");
    };

    const avatarSrc = getAvatarSrc();

    return (
        <main className="profile-page">
            <div className="back-from-settings">
                <Link to="/movietracker"><IoIosArrowRoundBack /></Link>
            </div>
            <section className="profile-hero">
                <div className="profile-avatar-box">
                    <button
                        type="button"
                        className="profile-avatar"
                        onClick={handleAvatarClick}
                        disabled={avatarLoading}
                    >
                        {avatarSrc ? (
                            <img src={avatarSrc} alt="Аватар" className="profile-avatar-img" />
                        ) : (
                            <span>{getUserLetter()}</span>
                        )}
                    </button>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="profile-avatar-input"
                        onChange={handleAvatarChange}
                    />

                    <button
                        type="button"
                        className="profile-avatar-change"
                        onClick={handleAvatarClick}
                        disabled={avatarLoading}
                    >
                        {avatarLoading ? "Загрузка..." : "Изменить фото"}
                    </button>
                </div>

                <div>
                    <p className="profile-kicker">Профиль</p>
                    <h1>{currentUser?.name || "Пользователь"}</h1>
                    <p>{currentUser?.email}</p>
                </div>
            </section>

            <section className="profile-grid">
                <div className="profile-card profile-main-card">
                    <h2>Аккаунт</h2>

                    <div className="profile-info-list">
                        <p>
                            <span>Имя</span>
                            <b>{currentUser?.name || "Не указано"}</b>
                        </p>

                        <p>
                            <span>Email</span>
                            <b>{currentUser?.email || "Не указан"}</b>
                        </p>

                        <p>
                            <span>Дата регистрации</span>
                            <b>
                                {currentUser?.created_at
                                    ? new Date(currentUser.created_at).toLocaleDateString("ru-RU")
                                    : "Нет данных"}
                            </b>
                        </p>
                    </div>

                    <button className="profile-logout-btn" onClick={handleLogout}>
                        Выйти из аккаунта
                    </button>
                </div>

                <div className="profile-card">
                    <h2>Моя статистика</h2>

                    {loading ? (
                            <Preloader text="Загружаем статистику" variant="small" />
                        ) : (
                        <div className="profile-stats">
                            <div>
                                <span>Всего</span>
                                <b>{total}</b>
                            </div>

                            <div>
                                <span>{statusNames.favorite}</span>
                                <b>{stats.favorite || 0}</b>
                            </div>

                            <div>
                                <span>{statusNames.watching}</span>
                                <b>{stats.watching || 0}</b>
                            </div>

                            <div>
                                <span>{statusNames.watched}</span>
                                <b>{stats.watched || 0}</b>
                            </div>

                            <div>
                                <span>{statusNames.dropped}</span>
                                <b>{stats.dropped || 0}</b>
                            </div>
                        </div>
                    )}
                </div>
            </section>

            <section className="profile-links">
                <Link to="/movietracker/favorite">Хочу посмотреть</Link>
                <Link to="/movietracker/watching">Смотрю</Link>
                <Link to="/movietracker/watched">Посмотрел</Link>
                <Link to="/movietracker/dropped">Бросил</Link>
                <Link to="/movietracker/statistics">Статистика</Link>
                <Link to="/movietracker/settings">Настройки</Link>
            </section>
        </main>
    );
}

export default ProfilePage;