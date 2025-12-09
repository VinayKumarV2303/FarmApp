// src/pages/admin/AdminLogin.js
import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Stack,
  Link,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

export default function AdminLogin() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async () => {
    setError("");

    if (!phone.trim() || !password.trim()) {
      setError("Phone and password are required.");
      return;
    }

    try {
      setLoading(true);

      const res = await api.post("/admin/api/login/", {
        phone: phone.trim(),
        password: password.trim(),
      });

      const data = res.data;
      console.log("Admin login response:", data);

      if (!data.success) {
        setError(data.message || "Admin login failed.");
        return;
      }

      if (!data.token || !data.user) {
        setError("Invalid server response (missing token or user).");
        return;
      }

      // Store admin token & role
      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("adminRole", "admin");

      // Update global auth context
      login({
        ...data,
        user: { ...data.user, role: "admin" },
      });

      // Redirect to admin dashboard
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      console.error("Admin login error:", err.response?.data || err);
      setError(
        err.response?.data?.message ||
          err.response?.data?.detail ||
          "Failed to login as admin."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#f5f7fb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        p: 2,
      }}
    >
      <Card sx={{ width: 420, p: 3 }}>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Admin Login
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Stack spacing={2}>
            <TextField
              label="Admin Phone Number"
              fullWidth
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button
              variant="contained"
              fullWidth
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? "Logging in..." : "LOGIN AS ADMIN"}
            </Button>

            <Link
              component="button"
              type="button"
              onClick={() => navigate("/login")}
              sx={{ mt: 1 }}
            >
              GO TO FARMER LOGIN (OTP)
            </Link>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
