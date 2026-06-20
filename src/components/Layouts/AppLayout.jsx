import { useState } from "react";
import { Outlet } from "react-router";
import Sidebar from "../Sidebar/Sidebar";
import "./AppLayout.css";

function AppLayout() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <div className="body_movietracker">
            <div className="movietracker_wrapper">
                <Sidebar
                    sidebarOpen={sidebarOpen}
                    setSidebarOpen={setSidebarOpen}
                />

                <main className={`main_movietracker ${sidebarOpen ? "shift-open" : "shift-collapsed"}`}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default AppLayout;