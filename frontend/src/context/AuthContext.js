// src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

// Map backend user to our shape
const normalizeUser = (raw) => {
  if (!raw) return null;
  const roleRaw = raw.role || "farmer";
  const role = String(roleRaw).toLowerCase().includes("admin")
    ? "admin"
    : "farmer";

  return {
    id: raw.id,
    name: raw.name || "",
    phone: raw.phone || "",
    role,
  };
};

const buildAuthUser = (authResponse) => {
  const rawUser = authResponse.user || authResponse;
  const token =
    authResponse.token ||
    authResponse.access ||
    authResponse.auth_token ||
    null;

  const base = normalizeUser(rawUser);

  if (!base || !token) return null;

  return { ...base, token };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // {id, name, phone, role, token}
  const [loading, setLoading] = useState(true);

  // Restore from localStorage so refresh doesn't logout
  useEffect(() => {
    try {
      const stored = localStorage.getItem("authUser");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.token) {
          setUser(parsed);
        } else {
          localStorage.removeItem("authUser");
        }
      }
    } catch (err) {
      console.error("Failed to restore auth:", err);
      localStorage.removeItem("authUser");
    } finally {
      setLoading(false);
    }
  }, []);

  // Call this from OTP verify success
  const login = (authResponse) => {
    const authUser = buildAuthUser(authResponse);
    if (!authUser) {
      console.error("Invalid auth response:", authResponse);
      return;
    }
    setUser(authUser);
    localStorage.setItem("authUser", JSON.stringify(authUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("authUser");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
