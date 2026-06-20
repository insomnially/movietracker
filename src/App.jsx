import "./App.css";
import { Routes, Route } from "react-router";

import MainPage from "./Pages/Main-Page/Main-Page.jsx";
import AppLayout from "./components/Layouts/AppLayout.jsx";

import MovieTracker from "./Pages/MovieTracker/MovieTracker.jsx";
import CatalogPage from "./Pages/CatalogPage/CatalogPage.jsx";
import ProfilePage from "./Pages/Profile/ProfilePage.jsx";
import StatusPage from "./Pages/StatusPage/StatusPage.jsx";
import StatisticsPage from "./Pages/StatisticsPage/StatisticsPage.jsx";
import SettingsPage from "./Pages/Settings/SettingsPage.jsx";

import LoginPage from "./Pages/Auth/LoginPage.jsx";
import RegisterPage from "./Pages/Auth/RegisterPage.jsx";
import ForgotPasswordPage from "./Pages/Auth/ForgotPassword.jsx";
import ResetPasswordPage from "./Pages/Auth/ResetPassword.jsx";

import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute.jsx";
import RoutePreloader from "./components/RoutePreloader/RoutePreloader.jsx";
import { SettingsProvider } from "./context/SettingsContext.jsx";

function App() {
    return (
        <SettingsProvider>
            <RoutePreloader />

            <Routes>
                <Route path="/" element={<MainPage />} />

                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                <Route path="/movietracker" element={<AppLayout />}>
                    <Route index element={<MovieTracker />} />
                    <Route path="catalog" element={<CatalogPage />} />

                    <Route
                        path="favorite"
                        element={
                            <ProtectedRoute>
                                <StatusPage status="favorite" title="Хочу посмотреть" />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="watching"
                        element={
                            <ProtectedRoute>
                                <StatusPage status="watching" title="Смотрю" />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="watched"
                        element={
                            <ProtectedRoute>
                                <StatusPage status="watched" title="Посмотрел" />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="dropped"
                        element={
                            <ProtectedRoute>
                                <StatusPage status="dropped" title="Бросил" />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="statistics"
                        element={
                            <ProtectedRoute>
                                <StatisticsPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="settings"
                        element={
                            <ProtectedRoute>
                                <SettingsPage />
                            </ProtectedRoute>
                        }
                    />
                </Route>

                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute>
                            <ProfilePage />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </SettingsProvider>
    );
}

export default App;