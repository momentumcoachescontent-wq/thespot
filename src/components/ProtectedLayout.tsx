import { Outlet } from "react-router-dom";
import AuthGuard from "./AuthGuard";
import DashboardLayout from "./DashboardLayout";

const ProtectedLayout = () => {
    return (
        <AuthGuard>
            <DashboardLayout>
                <Outlet />
            </DashboardLayout>
        </AuthGuard>
    );
};

export default ProtectedLayout;
