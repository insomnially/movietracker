import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import "./Auth.css";

import { API_URL } from '../api'

function RegisterPage() {
    const navigate = useNavigate();
    const { login } = useAuth();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            setError("");

            const res = await fetch(`${API_URL}/api/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name,
                    email,
                    password
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message || "Ошибка регистрации");
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
                <h1>Регистрация</h1>
                <p className="auth-subtitle">Создай аккаунт, чтобы вести свой список фильмов.</p>

                {error && (
                    <div className="auth-error">
                        {error}
                    </div>
                )}

                <input
                    type="text"
                    placeholder="Имя"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />

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
                    {loading ? "Создаём..." : "Зарегистрироваться"}
                </button>

                <div className="auth-links">
                    <Link to="/login">Уже есть аккаунт?</Link>
                </div>
            </form>
        </main>
    );
}

export default RegisterPage;