import { Navigate } from "react-router";
import { useAuth } from "../../context/AuthContext";

function ProtectedRoute({ children }) {
    const { isAuth, loading } = useAuth();

    if (loading) {
        return null;
    }

    if (!isAuth) {
        return <Navigate to="/login" replace />;
    }

    return children;
}

export default ProtectedRoute;