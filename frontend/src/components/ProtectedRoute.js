// src/components/ProtectedRoute.js
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  // While we are still checking localStorage, don't redirect yet
  if (loading) {
    return null; // or a spinner component
  }

  // After loading: if no user, go to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Logged in: show the protected content
  return children;
};

export default ProtectedRoute;
