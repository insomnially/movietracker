import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router";
import Preloader from "../Preloader/Preloader.jsx";
import "./RoutePreloader.css";

export default function RoutePreloader() {
    const location = useLocation();
    const firstRender = useRef(true);
    const [visible, setVisible] = useState(false);
    const [text, setText] = useState("Загружаем");

    useEffect(() => {
        if (firstRender.current) {
            firstRender.current = false;
            return;
        }

        const isMainPage = location.pathname === "/";
        const isMovieTrackerMainPage = location.pathname === "/movietracker";

        if (!isMainPage && !isMovieTrackerMainPage) {
            return;
        }

        setText(isMainPage ? "Открываем главную" : "Открываем MovieTracker");
        setVisible(true);

        const timer = setTimeout(() => {
            setVisible(false);
        }, 750);

        return () => clearTimeout(timer);
    }, [location.pathname]);

    if (!visible) {
        return null;
    }

    return (
        <div className="route-preloader-overlay">
            <Preloader text={text} variant="page" />
        </div>
    );
}