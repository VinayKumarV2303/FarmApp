// src/api/axios.js
import axios from "axios";

const API_BASE_URL = "http://localhost:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  // ❌ remove withCredentials or set it to false
  // withCredentials: true,
});

// keep your interceptor as-is:
api.interceptors.request.use((config) => {
  const saved = localStorage.getItem("alpha_auth");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const token = parsed.token;
      if (token) {
        config.headers.Authorization = `Token ${token}`;
      }
    } catch (err) {
      console.error("Invalid alpha_auth in localStorage", err);
    }
  }
  return config;
});

export default api;
