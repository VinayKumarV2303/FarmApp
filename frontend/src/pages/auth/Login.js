// src/pages/auth/Login.js

import React, { useState } from "react";
import {
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  Box,
} from "@mui/material";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [serverOtp, setServerOtp] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSendOtp = async () => {
    if (!phone || phone.trim().length < 4) {
      alert("Enter a valid phone (at least 4 digits in dev).");
      return;
    }

    try {
      // Call our farmer OTP endpoint
      const res = await api.post("/farmer/send-otp/", { phone: phone.trim() });

      console.log("Send OTP response:", res.data);
      setServerOtp(res.data.otp || "1234"); // DEV ONLY
      setStep(2);
    } catch (err) {
      console.error("Send OTP error:", err);
      alert("Failed to send OTP. Check backend logs.");
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) {
      alert("Enter OTP");
      return;
    }

    try {
      console.log("VERIFY sending:", { phone, otp });

      const res = await api.post("/farmer/verify-otp/", {
        phone: phone.trim(),
        otp: otp.trim(),
      });

      // Expect: { id, name, phone, token }
      const { token, id, name, phone: ph } = res.data;

      if (!token) {
        alert("No token received from server.");
        return;
      }

      const authUser = {
        token,
        id,
        name,
        phone: ph,
        role: "farmer",
      };

      // Save in context + localStorage
      login(authUser);

      // Redirect to farmer dashboard
      navigate("/farmer/dashboard", { replace: true });
    } catch (err) {
      console.error("Verify OTP error:", err.response?.data || err);
      alert(err.response?.data?.detail || "Failed to verify OTP.");
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
      }}
    >
      <Card sx={{ width: 400, p: 3 }}>
        <CardContent>
          <Typography variant="h5" sx={{ mb: 3 }}>
            Login With OTP
          </Typography>

          {step === 1 && (
            <>
              <TextField
                label="Phone Number"
                fullWidth
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button variant="contained" fullWidth onClick={handleSendOtp}>
                Send OTP
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              {/* DEV DEBUG: show OTP on screen */}
              <Typography sx={{ fontSize: 12, color: "green", mb: 1 }}>
                Debug OTP (dev only): <b>{serverOtp}</b>
              </Typography>

              <TextField
                label="Enter OTP"
                fullWidth
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Button variant="contained" fullWidth onClick={handleVerifyOtp}>
                Verify OTP
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
