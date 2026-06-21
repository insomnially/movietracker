import { NavLink } from "react-router";
import "./Sidebar.css";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";

import { IoIosApps } from "react-icons/io";
import { FaHeart, FaEye, FaChartBar } from "react-icons/fa";
import { LuEyeClosed } from "react-icons/lu";
import { IoIosHeartDislike, IoIosSettings, IoIosArrowDown } from "react-icons/io";
import { MdAccountCircle } from "react-icons/md";

import { API_URL } from '../../../api'

function Sidebar({ sidebarOpen, setSidebarOpen }) {
    const { user, token } = useAuth();
    const [sidebarUser, setSidebarUser] = useState(user);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
    setSidebarUser(user);
}, [user]);

useEffect(() => {
    const handleUserUpdated = (event) => {
        setSidebarUser(event.detail);
    };

    window.addEventListener("user-updated", handleUserUpdated);

    return () => {
        window.removeEventListener("user-updated", handleUserUpdated);
    };
}, []);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const token = localStorage.getItem("token");

                if (!token) return;

                const res = await fetch(`${API_URL}/api/user`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (!res.ok) return;

                const data = await res.json();
                setSidebarUser(data);
            } catch (err) {
                console.error(err);
            }
        };

        fetchUser();
    }, []);

    const getUserName = () => {
        if (!user) return "Профиль";

        const fullName = [user.surname, user.name, user.patronymic]
            .filter(Boolean)
            .join(" ");

        return fullName || user.username || user.email || "Профиль";
    };

    const currentUser = sidebarUser || user;

    const getAvatarSrc = (avatarUrl) => {
        if (!avatarUrl) return null;

        const cleanAvatarUrl = String(avatarUrl).replace(/^\.?\//, "/");

        if (cleanAvatarUrl.startsWith("http")) {
            return cleanAvatarUrl;
        }

        return `${API_URL}${cleanAvatarUrl.startsWith("/") ? cleanAvatarUrl : `/${cleanAvatarUrl}`}`;
    };

    const avatarSrc = getAvatarSrc(currentUser?.avatar_url);

    return (
        <div className={`sidebar_movietracker ${sidebarOpen ? "open" : "collapsed"}`}>
            <div className="sidebarandback">
                <div
                    className={`sidebar-arrow ${sidebarOpen ? "open" : "collapsed"}`}
                    onClick={() => setSidebarOpen((p) => !p)}
                >
                    ❯
                </div>

                <div className="logo_movietracker">
                <NavLink to="/movietracker" end>
                    <img src="/images/play.png" alt="" />
                    <h1>MOVIETRACKER</h1>
                </NavLink>
            </div>
            </div>

            <ul className="sidebar_movietracker_ul">
                <li>
                    <NavLink to="/movietracker/catalog">
                        <IoIosApps />
                        <span>Каталог</span>
                    </NavLink>
                </li>

                <li>
                    <NavLink to="/movietracker/favorite">
                        <FaHeart />
                        <span>Хочу посмотреть</span>
                    </NavLink>
                </li>

                <li>
                    <NavLink to="/movietracker/watching">
                        <FaEye />
                        <span>Смотрю</span>
                    </NavLink>
                </li>

                <li>
                    <NavLink to="/movietracker/watched">
                        <LuEyeClosed />
                        <span>Посмотрел</span>
                    </NavLink>
                </li>

                <li>
                    <NavLink to="/movietracker/dropped">
                        <IoIosHeartDislike />
                        <span>Бросил</span>
                    </NavLink>
                </li>

                <li>
                    <NavLink to="/movietracker/statistics">
                        <FaChartBar />
                        <span>Статистика</span>
                    </NavLink>
                </li>

                <li>
                    <NavLink to="/movietracker/settings">
                        <IoIosSettings />
                        <span>Настройки</span>
                    </NavLink>
                </li>
            </ul>

            <div className="profile_movietracker">
            <NavLink to="/profile" className="profile_movietracker_link">
                <div className="profile_avatar_button">
                    {avatarSrc ? (
                        <img src={avatarSrc} alt="avatar" className="profile_avatar_img" />
                    ) : (
                        <MdAccountCircle className="profile_avatar_icon" />
                    )}
                </div>

                <div className="profile_movietracker_info">
                    <p>{getUserName()}</p>
                    <p>Профиль</p>
                </div>

                <div className="arrowdown-movietracker">
                    <IoIosArrowDown />
                </div>
            </NavLink>
        </div>
        </div>
    );
}

export default Sidebar;