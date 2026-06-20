import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import "./Auth.css";

function ResetPasswordPage() {
    const navigate = useNavigate();
    const [params] = useSearchParams();

    const token = params.get("token");

    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!token) {
            setError("Нет токена восстановления");
            return;
        }

        try {
            setLoading(true);
            setError("");
            setMessage("");

            const res = await fetch(`${API_URL}/api/auth/reset-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    token,
                    password
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message || "Ошибка сброса пароля");
                return;
            }

            setMessage(data.message || "Пароль изменён");

            setTimeout(() => {
                navigate("/login");
            }, 1200);
        } catch (err) {
            setError("Ошибка сервера");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="auth-page">
            <form className="auth-card" onSubmit={handleSubmit}>
                <p className="auth-kicker">Movie Tracker</p>
                <h1>Новый пароль</h1>
                <p className="auth-subtitle">Придумай новый пароль для аккаунта.</p>

                {error && (
                    <div className="auth-error">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="auth-success">
                        {message}
                    </div>
                )}

                <input
                    type="password"
                    placeholder="Новый пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button disabled={loading}>
                    {loading ? "Сохраняем..." : "Сменить пароль"}
                </button>

                <div className="auth-links">
                    <Link to="/login">Вернуться ко входу</Link>
                </div>
            </form>
        </main>
    );
}

export default ResetPasswordPage;