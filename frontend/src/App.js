// src/App.js
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Login from "./pages/auth/Login";

import FarmerDashboard from "./pages/farmer/Dashboard";
import LandDetails from "./pages/farmer/LandDetails";
import LandEdit from "./pages/farmer/LandEdit";
import AddLand from "./pages/farmer/AddLand";
import ProfilePage from "./pages/farmer/ProfilePage";

// ✅ NEW: Import CropPlanPage
import CropPlanPage from "./pages/farmer/CropPlanPage";

import AdminDashboard from "./pages/admin/AdminDashboard";
import Approvals from "./pages/admin/Approvals";

import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./components/layout/MainLayout";

const App = () => {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Admin area */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/approvals"
        element={
          <ProtectedRoute>
            <Approvals />
          </ProtectedRoute>
        }
      />

      {/* Farmer area with layout */}
      <Route
        path="/farmer"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Default redirect to dashboard */}
        <Route index element={<Navigate to="dashboard" replace />} />

        {/* Farmer main pages */}
        <Route path="dashboard" element={<FarmerDashboard />} />
        <Route path="profile" element={<ProfilePage />} />

        {/* Land routes */}
        <Route path="land" element={<LandDetails />} />
        <Route path="land/add" element={<AddLand />} />
        <Route path="land/edit/:id" element={<LandEdit />} />

        {/* ✅ New Crop Plan page (inside farmer layout) */}
        <Route path="crop-plan/create" element={<CropPlanPage />} />
      </Route>

      {/* Default */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;
