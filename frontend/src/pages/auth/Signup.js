// src/pages/auth/Signup.js

import React, { useState } from "react";
import {
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
  Box,
  Stack,
  Alert,
  FormControlLabel,
  Checkbox,
  Link,
} from "@mui/material";
import api from "../../api/axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function Signup() {
  const [step, setStep] = useState(1);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [otp, setOtp] = useState("");
  const [serverOtp, setServerOtp] = useState("");
  const [farmerAck, setFarmerAck] = useState(false);

  const [stateVal, setStateVal] = useState("");
  const [pincode, setPincode] = useState("");

  const [error, setError] = useState("");
  const [loadingSend, setLoadingSend] = useState(false);
  const [loadingVerify, setLoadingVerify] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  const [pinLoading, setPinLoading] = useState(false);
  const [pinError, setPinError] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth();
  const isDev = process.env.NODE_ENV === "development";

  const trimmedName = name.trim();
  const trimmedPhone = phone.trim();
  const trimmedOtp = otp.trim();
  const trimmedPincode = pincode.trim();
  const isPhoneValid = /^\d{10}$/.test(trimmedPhone);
  const isOtpValid = /^\d{4,6}$/.test(trimmedOtp);

  // STEP 1: SEND OTP
  const handleSendOtp = async () => {
    setError("");

    if (!trimmedName) {
      setError("Please enter your name.");
      return;
    }

    if (!isPhoneValid) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }

    try {
      setLoadingSend(true);

      const res = await api.post("/farmer/send-otp/", {
        phone: trimmedPhone,
        name: trimmedName,
        mode: "signup",
      });

      setServerOtp(res.data.otp || "1234");
      setStep(2);
    } catch (err) {
      console.error("Signup send OTP error:", err);
      setError(
        err.response?.data?.detail || "Failed to send OTP. Please try again."
      );
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
        name: trimmedName,
        mode: "signup",
      });

      setServerOtp(res.data.otp || "1234");
    } catch (err) {
      console.error("Resend OTP error:", err);
      setError(
        err.response?.data?.detail || "Failed to resend OTP. Please try again."
      );
    } finally {
      setLoadingSend(false);
    }
  };

  // STEP 2: VERIFY OTP
  const handleVerifyOtp = async () => {
    setError("");

    if (!trimmedOtp) {
      setError("Please enter the OTP.");
      return;
    }

    if (!farmerAck) {
      setError("Please acknowledge that you are a farmer to continue.");
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
        name: trimmedName,
        mode: "signup",
      });

      const data = res.data;

      if (!data.success || !data.token || !data.user) {
        setError("Signup verification failed. Please try again.");
        return;
      }

      // Save auth
      login(data);

      // Move to step 3
      setStep(3);
    } catch (err) {
      console.error("Signup verify OTP error:", err.response?.data || err);
      setError(
        err.response?.data?.detail || "Signup failed. Please try again."
      );
    } finally {
      setLoadingVerify(false);
    }
  };

  // PINCODE → STATE
  const handlePincodeBlur = async () => {
    const pin = trimmedPincode;
    if (!/^\d{6}$/.test(pin)) return;

    try {
      setPinLoading(true);
      setPinError("");

      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();

      if (
        Array.isArray(data) &&
        data[0]?.Status === "Success" &&
        Array.isArray(data[0].PostOffice) &&
        data[0].PostOffice.length > 0
      ) {
        const detectedState = data[0].PostOffice[0].State || "";
        setStateVal(detectedState);
      } else {
        setPinError("Could not detect state for this pincode.");
      }
    } catch (e) {
      console.error("PIN lookup error:", e);
      setPinError("Failed to lookup pincode.");
    } finally {
      setPinLoading(false);
    }
  };

  // STEP 3: SAVE FARMER PROFILE
  const handleSaveProfile = async () => {
    setError("");

    if (!/^\d{6}$/.test(trimmedPincode)) {
      setError("Please enter a valid 6-digit pincode.");
      return;
    }

    if (!stateVal.trim()) {
      setError("State not detected. Please enter a valid pincode.");
      return;
    }

    try {
      setLoadingProfile(true);

      const profilePayload = {
        state: stateVal.trim(),
        pincode: trimmedPincode,
      };

      await api.put("/farmer/profile/", profilePayload);

      navigate("/farmer/dashboard", { replace: true });
    } catch (err) {
      console.error("Profile save error:", err.response?.data || err);
      setError(
        err.response?.data?.detail ||
          "Failed to save profile. You can update it later from Profile page."
      );
    } finally {
      setLoadingProfile(false);
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
            {step === 1 && "Create Account"}
            {step === 2 && "OTP Verification"}
            {step === 3 && "Farmer Details"}
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
                  label="Full Name"
                  fullWidth
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
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
                  {loadingSend ? "Sending..." : "Send OTP"}
                </Button>
                <Button
                  variant="text"
                  fullWidth
                  onClick={() => navigate("/login")}
                >
                  Already have an account? Login
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

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={farmerAck}
                      onChange={(e) => setFarmerAck(e.target.checked)}
                    />
                  }
                  label="I acknowledge that I am a farmer producing agricultural produce."
                />

                <Stack direction="row" spacing={2} sx={{ fontSize: 12 }}>
                  <Link component="button">Privacy Policy</Link>
                  <Link component="button">Terms &amp; Conditions</Link>
                </Stack>

                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleVerifyOtp}
                  disabled={loadingVerify || !farmerAck}
                  sx={{ mt: 1 }}
                >
                  {loadingVerify ? "Verifying..." : "Verify OTP"}
                </Button>

                <Button variant="text" fullWidth onClick={() => setStep(1)}>
                  Change Name / Phone
                </Button>
              </>
            )}

            {step === 3 && (
              <>
                <Typography variant="body2">
                  Tell us a bit more so we can customise recommendations.
                </Typography>

                <TextField
                  label="Pincode"
                  fullWidth
                  value={pincode}
                  onChange={(e) => {
                    setPincode(e.target.value);
                    setPinError("");
                  }}
                  onBlur={handlePincodeBlur}
                  inputProps={{ maxLength: 6 }}
                  helperText={
                    pinError ||
                    (pinLoading ? "Detecting state from pincode..." : "")
                  }
                  FormHelperTextProps={{
                    sx: { color: pinError ? "error.main" : "text.secondary" },
                  }}
                />

                <TextField
                  label="State"
                  fullWidth
                  value={stateVal}
                  InputProps={{
                    readOnly: true,
                  }}
                />

                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleSaveProfile}
                  disabled={loadingProfile}
                >
                  {loadingProfile ? "Saving..." : "Save & Continue"}
                </Button>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
