import "./Preloader.css";

export default function Preloader({ text = "Загружаем", variant = "page" }) {
    return (
        <div className={`mt-preloader ${variant}`}>
            <div className="mt-preloader-card">
                <div className="mt-loader">
                    <div className="mt-loader-ring"></div>

                    <div className="mt-loader-core">
                        <span></span>
                    </div>

                    <div className="mt-loader-dots">
                        <i></i>
                        <i></i>
                        <i></i>
                        <i></i>
                    </div>
                </div>

                <h2>{text}</h2>

                <div className="mt-preloader-line">
                    <span></span>
                </div>

                <p>Подбираем фильмы, сериалы и аниме</p>
            </div>
        </div>
    );
}