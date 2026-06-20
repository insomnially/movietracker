import { createContext, useContext, useEffect, useMemo, useState } from "react";
import "../styles/MovieTrackerSettings.css";

const SettingsContext = createContext(null);

const SETTINGS_KEY = "movieTrackerSettings";

const defaultSettings = {
    theme: "dark",
    cardSize: "medium",
    detailsPosition: "right",
    animations: "on",
    accent: "purple",
    compactMode: "off"
};

const accentMap = {
    purple: {
        main: "#8b5cf6",
        second: "#6c7bff",
        soft: "rgba(139, 92, 246, 0.18)",
        border: "rgba(139, 92, 246, 0.45)"
    },
    blue: {
        main: "#3b82f6",
        second: "#06b6d4",
        soft: "rgba(59, 130, 246, 0.18)",
        border: "rgba(59, 130, 246, 0.45)"
    },
    pink: {
        main: "#ec4899",
        second: "#f43f5e",
        soft: "rgba(236, 72, 153, 0.18)",
        border: "rgba(236, 72, 153, 0.45)"
    },
    green: {
        main: "#22c55e",
        second: "#14b8a6",
        soft: "rgba(34, 197, 94, 0.18)",
        border: "rgba(34, 197, 94, 0.45)"
    },
    orange: {
        main: "#f97316",
        second: "#f59e0b",
        soft: "rgba(249, 115, 22, 0.18)",
        border: "rgba(249, 115, 22, 0.45)"
    }
};

function getInitialSettings() {
    try {
        const saved = localStorage.getItem(SETTINGS_KEY);

        if (saved) {
            return normalizeSettings(JSON.parse(saved));
        }

        return normalizeSettings({
            ...defaultSettings,
            cardSize: localStorage.getItem("movieTrackerCardSize") || defaultSettings.cardSize,
            detailsPosition: localStorage.getItem("movieTrackerDetailsPosition") || defaultSettings.detailsPosition,
            animations: localStorage.getItem("movieTrackerAnimations") || defaultSettings.animations
        });
    } catch {
        return defaultSettings;
    }
}

function normalizeSettings(settings) {
    const nextSettings = {
        ...defaultSettings,
        ...settings
    };

    if (nextSettings.detailsPosition === "top") {
        nextSettings.detailsPosition = "modal";
    }

    return nextSettings;
}

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState(getInitialSettings);

    useEffect(() => {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    }, [settings]);

    useEffect(() => {
        const root = document.documentElement;
        const accent = accentMap[settings.accent] || accentMap.purple;

        root.dataset.mtTheme = settings.theme;
        root.dataset.mtCardSize = settings.cardSize;
        root.dataset.mtDetailsPosition = settings.detailsPosition;
        root.dataset.mtAnimations = settings.animations;
        root.dataset.mtAccent = settings.accent;
        root.dataset.mtCompactMode = settings.compactMode;

        root.style.colorScheme = settings.theme === "light" ? "light" : "dark";
        root.style.setProperty("--accent", accent.main);
        root.style.setProperty("--mt-accent", accent.main);
        root.style.setProperty("--mt-accent-second", accent.second);
        root.style.setProperty("--mt-accent-soft", accent.soft);
        root.style.setProperty("--mt-accent-border", accent.border);
    }, [settings]);

    const updateSetting = (key, value) => {
        setSettings((prev) => ({
            ...prev,
            [key]: value
        }));
    };

    const resetSettings = () => {
        setSettings(defaultSettings);
        localStorage.removeItem("movieTrackerCardSize");
        localStorage.removeItem("movieTrackerDetailsPosition");
        localStorage.removeItem("movieTrackerAnimations");
    };

    const value = useMemo(() => ({
        settings,
        updateSetting,
        resetSettings,
        accentMap
    }), [settings]);

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);

    if (!context) {
        throw new Error("useSettings должен использоваться внутри SettingsProvider");
    }

    return context;
}