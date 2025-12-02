import React, { useState } from "react";
import { Card, CardContent, TextField, Button, Typography } from "@mui/material";
import { registerAccount, sendOtp, verifyOtp } from "../../api/alphaApi";
// if you use AuthContext, import useAuth as well

const OtpLogin = () => {
  const [step, setStep] = useState(1);    // 1 = enter phone, 2 = enter OTP
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");

  const handleRegisterOrSendOtp = async () => {
    if (!phone) return alert("Enter phone");

    // 1) Register (or ensure account exists)
    await registerAccount(phone, name);
    // 2) Send OTP
    await sendOtp(phone);
    setStep(2);
  };

  const handleVerify = async () => {
    try {
      const res = await verifyOtp(phone, otp);
      if (!res.data.success) {
        return alert(res.data.message || "Invalid OTP");
      }

      const user = res.data.user; // { id, phone, name, ... }
      // save user in localStorage / AuthContext
      localStorage.setItem("alpha_user", JSON.stringify(user));
      alert("OTP Verified — logged in!");

      // navigate to farmer dashboard, e.g. /farmer
      // navigate("/farmer");
    } catch (err) {
      console.error(err);
      alert("Error verifying OTP");
    }
  };

  return (
    <Card sx={{ maxWidth: 400, margin: "80px auto" }}>
      <CardContent>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Login with Phone & OTP
        </Typography>

        {step === 1 && (
          <>
            <TextField
              fullWidth
              label="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button fullWidth variant="contained" onClick={handleRegisterOrSendOtp}>
              Send OTP
            </Button>
          </>
        )}

        {step === 2 && (
          <>
            <Typography sx={{ mb: 1 }}>OTP sent to {phone}</Typography>
            <TextField
              fullWidth
              label="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button fullWidth variant="contained" onClick={handleVerify}>
              Verify OTP
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default OtpLogin;
