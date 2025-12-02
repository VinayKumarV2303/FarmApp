// src/context/AuthContext.js
import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("alpha_auth");
      if (saved) {
        setUser(JSON.parse(saved));
      }
    } catch (err) {
      console.error("Error loading auth from storage", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = (userData) => {
  setUser(userData);
  localStorage.setItem("alpha_auth", JSON.stringify(userData));
};


  const logout = () => {
    setUser(null);
    localStorage.removeItem("alpha_auth");
  };

  if (loading) {
    // simple loader while restoring auth state
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
