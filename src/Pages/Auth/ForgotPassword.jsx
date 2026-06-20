import { useState } from "react";
import { Link } from "react-router";
import "./Auth.css";

function ForgotPasswordPage() {
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            setLoading(true);
            setError("");
            setMessage("");

            const res = await fetch(`${API_URL}/api/auth/forgot-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email
                })
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.message || "Ошибка восстановления");
                return;
            }

            setMessage(data.message || "Письмо отправлено");
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
                <h1>Забыли пароль?</h1>
                <p className="auth-subtitle">Введи email, и мы отправим ссылку для сброса пароля.</p>

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
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />

                <button disabled={loading}>
                    {loading ? "Отправляем..." : "Отправить ссылку"}
                </button>

                <div className="auth-links">
                    <Link to="/login">Вернуться ко входу</Link>
                </div>
            </form>
        </main>
    );
}

export default ForgotPasswordPage;