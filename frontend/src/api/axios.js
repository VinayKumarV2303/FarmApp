// src/api/axios.js
import axios from "axios";

const API_BASE_URL = "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Attach token from localStorage on every request
api.interceptors.request.use(
  (config) => {
    try {
      const stored = localStorage.getItem("authUser");
      if (stored) {
        const authUser = JSON.parse(stored);
        if (authUser?.token) {
          config.headers.Authorization = `Token ${authUser.token}`;
        }
      }
    } catch (err) {
      console.error("Failed to read authUser", err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
