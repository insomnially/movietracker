import { createContext, useContext, useEffect, useState } from "react";
import { API_URL } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem("token"));
    const [loading, setLoading] = useState(true);

    const isAuth = Boolean(token && user);

    useEffect(() => {
        const loadUser = async () => {
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const res = await fetch(`${API_URL}/api/auth/me`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (!res.ok) {
                    localStorage.removeItem("token");
                    setToken(null);
                    setUser(null);
                    return;
                }

                const data = await res.json();
                setUser(data);
            } catch (error) {
                localStorage.removeItem("token");
                setToken(null);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        loadUser();
    }, [token]);

    const login = (newToken, newUser) => {
        localStorage.setItem("token", newToken);
        setToken(newToken);
        setUser(newUser);
    };

    const logout = () => {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, isAuth, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}