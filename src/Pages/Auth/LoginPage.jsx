import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import "./Auth.css";
import { API_URL } from '../../../api'

function LoginPage() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            setError("");

            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email,
                    password
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message || "Ошибка входа");
                return;
            }

            login(data.token, data.user);
            navigate("/movietracker/catalog");
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
                <h1>Вход</h1>
                <p className="auth-subtitle">Войди, чтобы сохранять фильмы и статусы.</p>

                {error && (
                    <div className="auth-error">
                        {error}
                    </div>
                )}

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <input
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                <button disabled={loading}>
                    {loading ? "Входим..." : "Войти"}
                </button>

                <div className="auth-links">
                    <Link to="/register">Создать аккаунт</Link>
                    <Link to="/forgot-password">Забыли пароль?</Link>
                </div>
            </form>
        </main>
    );
}

export default LoginPage;