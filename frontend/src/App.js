// src/App.js
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";

import FarmerDashboard from "./pages/farmer/Dashboard";
import LandDetails from "./pages/farmer/LandDetails";
import LandEdit from "./pages/farmer/LandEdit";
import AddLand from "./pages/farmer/AddLand";
import ProfilePage from "./pages/farmer/ProfilePage";
import CropDetailsPage from "./pages/farmer/CropDetailsPage";
import CropPlanPage from "./pages/farmer/CropPlanPage";

import AdminLogin from "./pages/admin/AdminLogin";
import AdminDashboard from "./pages/admin/AdminDashboard";
import Approvals from "./pages/admin/Approvals";
import AdminNewsPage from "./pages/admin/News";

import { useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./components/layout/MainLayout";

// ---------- ADMIN GUARD ----------
const AdminRoute = ({ children }) => {
  const { user } = useAuth();
  const ctxRole = user?.user?.role || user?.role;
  const adminRoleLS = localStorage.getItem("adminRole");
  const adminToken = localStorage.getItem("adminToken");

  if (ctxRole === "admin" || (adminRoleLS === "admin" && adminToken)) {
    return children;
  }

  return <Navigate to="/admin/login" replace />;
};

export default function App() {
  return (
    <Routes>
      {/* ---------- ROOT ---------- */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* ---------- PUBLIC AUTH ---------- */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* ---------- ADMIN ROUTES ---------- */}
      <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
      <Route path="/admin/login" element={<AdminLogin />} />

      <Route
        path="/admin/dashboard"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/approvals"
        element={
          <AdminRoute>
            <Approvals />
          </AdminRoute>
        }
      />
      <Route
        path="/admin/news"
        element={
          <AdminRoute>
            <AdminNewsPage />
          </AdminRoute>
        }
      />

      {/* ---------- FARMER ROUTES (wrapped in MainLayout) ---------- */}
      <Route
        path="/farmer"
        element={
          <ProtectedRoute allowedRoles={["farmer"]}>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<FarmerDashboard />} />

        <Route path="lands" element={<LandDetails />} />
        <Route path="lands/add" element={<AddLand />} />
        <Route path="lands/:id/edit" element={<LandEdit />} />

        {/* 👇 These two are the ones Crop pages use */}
        <Route path="cropdetails" element={<CropDetailsPage />} />
        <Route path="crop-plan" element={<CropPlanPage />} />

        <Route path="profile" element={<ProfilePage />} />

        {/* default /farmer → /farmer/dashboard */}
        <Route index element={<Navigate to="dashboard" replace />} />
      </Route>

      {/* ---------- FALLBACK ---------- */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
