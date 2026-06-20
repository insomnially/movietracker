import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../context/SettingsContext.jsx";
import "./SettingsPage.css";

const cardSizeOptions = [
    {
        value: "small",
        title: "Компактные",
        text: "Больше карточек на экране"
    },
    {
        value: "medium",
        title: "Стандартные",
        text: "Оптимальный размер"
    },
    {
        value: "large",
        title: "Крупные",
        text: "Больше постер и текст"
    }
];

const themeOptions = [
    {
        value: "dark",
        title: "Тёмная",
        text: "Классический тёмный стиль MovieTracker"
    },
    {
        value: "light",
        title: "Светлая",
        text: "Светлый интерфейс с мягкими карточками"
    }
];

const detailsPositionOptions = [
    {
        value: "right",
        title: "Справа",
        text: "Детали открываются рядом с карточками"
    },
    {
        value: "modal",
        title: "Модальное окно",
        text: "Детали открываются поверх страницы"
    }
];

const animationOptions = [
    {
        value: "on",
        title: "Включены",
        text: "Плавные переходы и hover-эффекты"
    },
    {
        value: "off",
        title: "Отключены",
        text: "Интерфейс становится спокойнее"
    }
];

const compactOptions = [
    {
        value: "off",
        title: "Обычный",
        text: "Больше воздуха между блоками"
    },
    {
        value: "on",
        title: "Компактный",
        text: "Меньше отступов и плотнее сетка"
    }
];

const accentOptions = [
    {
        value: "purple",
        title: "Фиолетовый"
    },
    {
        value: "blue",
        title: "Синий"
    },
    {
        value: "pink",
        title: "Розовый"
    },
    {
        value: "green",
        title: "Зелёный"
    },
    {
        value: "orange",
        title: "Оранжевый"
    }
];

function SettingsPage() {
    const { user, logout } = useAuth();
    const { settings, updateSetting, resetSettings } = useSettings();
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        setSaved(true);

        const timer = setTimeout(() => {
            setSaved(false);
        }, 900);

        return () => clearTimeout(timer);
    }, [settings]);

    const handleSettingChange = (key, value) => {
        updateSetting(key, value);
    };

    return (
        <main className="settings-page">
            <section className="settings-hero">
                <div>
                    <p className="settings-kicker">Movie Tracker</p>
                    <h1>Настройки</h1>
                    <p>Настраивай внешний вид, карточки, детали и анимации интерфейса.</p>
                </div>

                <div className="settings-hero-panel">
                    <span className={`settings-save-indicator ${saved ? "active" : ""}`}>
                        {saved ? "Сохранено" : "Автосохранение"}
                    </span>

                    <button
                        type="button"
                        className="settings-reset-btn"
                        onClick={resetSettings}
                    >
                        Сбросить
                    </button>
                </div>
            </section>

            <section className="settings-grid">
                <div className="settings-card settings-account-card">
                    <div className="settings-card-head">
                        <div>
                            <p>Аккаунт</p>
                            <h2>Профиль</h2>
                        </div>

                        <div className="settings-avatar">
                            {(user?.name || user?.email || "U").slice(0, 1).toUpperCase()}
                        </div>
                    </div>

                    <div className="settings-account">
                        <p>
                            <span>Имя</span>
                            <b>{user?.name || "Не указано"}</b>
                        </p>

                        <p>
                            <span>Email</span>
                            <b>{user?.email || "Не указан"}</b>
                        </p>
                    </div>

                    <button className="settings-danger-btn" onClick={logout}>
                        Выйти из аккаунта
                    </button>
                </div>

                                    <div className="settings-card">
                    <div className="settings-card-head">
                        <div>
                            <p>Тема</p>
                            <h2>Оформление сайта</h2>
                        </div>
                    </div>

                    <div className="settings-options">
                        {themeOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={`settings-option ${settings.theme === option.value ? "active" : ""}`}
                                onClick={() => handleSettingChange("theme", option.value)}
                            >
                                <strong>{option.title}</strong>
                                <span>{option.text}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="settings-card">
                    <div className="settings-card-head">
                        <div>
                            <p>Карточки</p>
                            <h2>Размер карточек</h2>
                        </div>
                    </div>

                    <div className="settings-options">
                        {cardSizeOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={`settings-option ${settings.cardSize === option.value ? "active" : ""}`}
                                onClick={() => handleSettingChange("cardSize", option.value)}
                            >
                                <strong>{option.title}</strong>
                                <span>{option.text}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="settings-card">
                    <div className="settings-card-head">
                        <div>
                            <p>Details section</p>
                            <h2>Положение деталей</h2>
                        </div>
                    </div>

                    <div className="settings-options">
                        {detailsPositionOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={`settings-option ${settings.detailsPosition === option.value ? "active" : ""}`}
                                onClick={() => handleSettingChange("detailsPosition", option.value)}
                            >
                                <strong>{option.title}</strong>
                                <span>{option.text}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="settings-card">
                    <div className="settings-card-head">
                        <div>
                            <p>Оформление</p>
                            <h2>Акцентный цвет</h2>
                        </div>
                    </div>

                    <div className="settings-accents">
                        {accentOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={`settings-accent settings-accent-${option.value} ${settings.accent === option.value ? "active" : ""}`}
                                onClick={() => handleSettingChange("accent", option.value)}
                                aria-label={option.title}
                            >
                                <span></span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="settings-card">
                    <div className="settings-card-head">
                        <div>
                            <p>Анимации</p>
                            <h2>Движение интерфейса</h2>
                        </div>
                    </div>

                    <div className="settings-options">
                        {animationOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={`settings-option ${settings.animations === option.value ? "active" : ""}`}
                                onClick={() => handleSettingChange("animations", option.value)}
                            >
                                <strong>{option.title}</strong>
                                <span>{option.text}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="settings-card">
                    <div className="settings-card-head">
                        <div>
                            <p>Интерфейс</p>
                            <h2>Плотность интерфейса</h2>
                        </div>
                    </div>

                    <div className="settings-options">
                        {compactOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={`settings-option ${settings.compactMode === option.value ? "active" : ""}`}
                                onClick={() => handleSettingChange("compactMode", option.value)}
                            >
                                <strong>{option.title}</strong>
                                <span>{option.text}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </section>
        </main>
    );
}

export default SettingsPage;