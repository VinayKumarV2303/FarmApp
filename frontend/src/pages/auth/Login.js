// src/pages/auth/Login.js

import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Stack,
  Alert,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

export default function Login() {
  const [step, setStep] = useState(1); // 1 = phone, 2 = OTP

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [serverOtp, setServerOtp] = useState("");

  const [error, setError] = useState("");
  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);

  // popup state for "account not found"
  const [accountNotFoundOpen, setAccountNotFoundOpen] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();
  const isDev = process.env.NODE_ENV === "development";

  const trimmedPhone = phone.trim();
  const trimmedOtp = otp.trim();
  const isPhoneValid = /^\d{10}$/.test(trimmedPhone);
  const isOtpValid = /^\d{4,6}$/.test(trimmedOtp); // adjust to your OTP length

  const isAccountNotFoundError = (err) => {
    const status = err?.response?.status;
    const detail = err?.response?.data?.detail || "";
    return (
      status === 404 ||
      /account not found/i.test(detail) ||
      /no account/i.test(detail)
    );
  };

  // STEP 1: SEND OTP
  const handleSendOtp = async () => {
    setError("");

    if (!isPhoneValid) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }

    try {
      setLoadingSend(true);

      const res = await api.post("/farmer/send-otp/", {
        phone: trimmedPhone,
        mode: "login",
      });

      setServerOtp(res.data.otp || "1234");
      setStep(2);
    } catch (err) {
      console.error("Login send OTP error:", err);
      if (isAccountNotFoundError(err)) {
        setAccountNotFoundOpen(true); // 🔔 open popup
      } else {
        setError(
          err.response?.data?.detail ||
            "Failed to send OTP. Please try again."
        );
      }
    } finally {
      setLoadingSend(false);
    }
  };

  const handleResendOtp = async () => {
    setError("");

    if (!isPhoneValid) {
      setError("Phone number missing or invalid. Go back and enter it again.");
      return;
    }

    try {
      setLoadingSend(true);

      const res = await api.post("/farmer/send-otp/", {
        phone: trimmedPhone,
        mode: "login",
      });

      setServerOtp(res.data.otp || "1234");
    } catch (err) {
      console.error("Resend OTP error:", err);
      if (isAccountNotFoundError(err)) {
        setAccountNotFoundOpen(true); // 🔔 open popup
      } else {
        setError(
          err.response?.data?.detail ||
            "Failed to resend OTP. Please try again."
        );
      }
    } finally {
      setLoadingSend(false);
    }
  };

  // STEP 2: VERIFY OTP & LOGIN
  const handleVerifyOtp = async () => {
    setError("");

    if (!trimmedOtp) {
      setError("Please enter the OTP.");
      return;
    }

    if (!isPhoneValid) {
      setError("Phone number is invalid. Go back and correct it.");
      return;
    }

    try {
      setLoadingVerify(true);

      const res = await api.post("/farmer/verify-otp/", {
        phone: trimmedPhone,
        otp: trimmedOtp,
        mode: "login",
      });

      const data = res.data;

      if (!data.success || !data.token || !data.user) {
        setError("Login failed. Please try again.");
        return;
      }

      login(data);
      navigate("/farmer/dashboard", { replace: true });
    } catch (err) {
      console.error("Login verify OTP error:", err.response?.data || err);
      if (isAccountNotFoundError(err)) {
        setAccountNotFoundOpen(true); // 🔔 open popup
      } else {
        setError(
          err.response?.data?.detail || "Login failed. Please try again."
        );
      }
    } finally {
      setLoadingVerify(false);
    }
  };

  // popup handlers
  const handleCloseAccountNotFound = () => {
    setAccountNotFoundOpen(false);
  };

  const handleGoToSignup = () => {
    setAccountNotFoundOpen(false);
    navigate("/signup");
  };

  return (
    <>
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
              {step === 1 ? "Login" : "Enter OTP"}
            </Typography>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <Stack spacing={2}>
              {step === 1 && (
                <>
                  <TextField
                    label="Phone Number"
                    fullWidth
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputProps={{ maxLength: 10 }}
                    helperText={
                      phone && !isPhoneValid
                        ? "Enter a valid 10-digit phone number."
                        : ""
                    }
                  />
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleSendOtp}
                    disabled={loadingSend}
                  >
                    {loadingSend ? "Sending OTP..." : "Send OTP"}
                  </Button>

                  <Button
                    variant="text"
                    fullWidth
                    onClick={() => navigate("/signup")}
                  >
                    New user? Create an account
                  </Button>
                </>
              )}

              {step === 2 && (
                <>
                  {isDev && serverOtp && (
                    <Typography sx={{ fontSize: 12, color: "green" }}>
                      Debug OTP (dev only): <b>{serverOtp}</b>
                    </Typography>
                  )}

                  <Typography variant="body2">
                    Enter the OTP sent to <b>+91 {trimmedPhone}</b>
                  </Typography>

                  <TextField
                    label="OTP"
                    fullWidth
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    inputProps={{ maxLength: 6 }}
                    helperText={
                      otp && !isOtpValid ? "Enter a valid OTP." : ""
                    }
                  />

                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Didn&apos;t receive the OTP?{" "}
                    <Link component="button" onClick={handleResendOtp}>
                      Click here to Resend
                    </Link>
                  </Typography>

                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleVerifyOtp}
                    disabled={loadingVerify}
                  >
                    {loadingVerify ? "Verifying..." : "Verify & Login"}
                  </Button>

                  <Button variant="text" fullWidth onClick={() => setStep(1)}>
                    Change Phone Number
                  </Button>

                  <Button
                    variant="text"
                    fullWidth
                    onClick={() => navigate("/signup")}
                  >
                    New user? Create an account
                  </Button>
                </>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Box>

      {/* POPUP DIALOG FOR ACCOUNT NOT FOUND */}
      <Dialog
        open={accountNotFoundOpen}
        onClose={handleCloseAccountNotFound}
      >
        <DialogTitle sx={{ color: "error.main" }}>
          Account not found
        </DialogTitle>
        <DialogContent>
          <Typography>
            Account not found for this mobile number. You can create a new
            account using Sign Up.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseAccountNotFound}>Cancel</Button>
          <Button variant="contained" onClick={handleGoToSignup}>
            Go to Sign Up
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
