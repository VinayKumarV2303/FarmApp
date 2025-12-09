// src/pages/farmer/AddLand.js
import React, { useState } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  CircularProgress,
} from "@mui/material";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import api from "../../api/axios";

const AddLand = ({ onSaved, initialData }) => {
  const [form, setForm] = useState({
    village: "",
    district: "",
    state: "",
    pincode: "",
    land_area: "",
    soil_type: "",
    latitude: "",
    longitude: "",
    ...(initialData || {}),
  });

  const [saving, setSaving] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Generic field change
  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError("");
    setSuccess("");
  };

  // -------------- PINCODE LOOKUP --------------
  const handlePincodeBlur = async () => {
    const pin = (form.pincode || "").trim();
    if (pin.length !== 6) return;

    try {
      setLookupLoading(true);
      const res = await api.get("/farmer/location/pincode-lookup/", {
        params: { pincode: pin },
      });

      setForm((prev) => ({
        ...prev,
        district: res.data.district || prev.district,
        state: res.data.state || prev.state,
      }));
    } catch (err) {
      console.error("Pincode lookup failed", err);
      setError("Could not detect district/state from pincode.");
    } finally {
      setLookupLoading(false);
    }
  };

  // -------------- AUTO-DETECT LOCATION (GPS) --------------
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported on this device.");
      return;
    }

    setGeoLoading(true);
    setError("");
    setSuccess("");

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;

        try {
          const res = await api.get("/farmer/location/reverse-geocode/", {
            params: { lat: latitude, lng: longitude },
          });

          setForm((prev) => ({
            ...prev,
            village: res.data.village || prev.village,
            district: res.data.district || prev.district,
            state: res.data.state || prev.state,
            pincode: res.data.pincode || prev.pincode,
            latitude: res.data.latitude,
            longitude: res.data.longitude,
          }));
          setSuccess("Location detected and fields filled.");
        } catch (err) {
          console.error("Reverse geocode failed", err);
          setError("Could not auto-detect location.");
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        console.error("Geolocation error", err);
        setError("Unable to read GPS location.");
        setGeoLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    );
  };

  // -------------- SUBMIT --------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        village: form.village,
        district: form.district,
        state: form.state,
        pincode: form.pincode,
        land_area: form.land_area,
        soil_type: form.soil_type,
        latitude: form.latitude || null,
        longitude: form.longitude || null,
      };

      await api.post("/farmer/land/", payload);
      setSuccess("Land saved successfully.");
      if (onSaved) onSaved();
    } catch (err) {
      console.error("Save land failed", err);
      setError("Failed to save land. Please check details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardContent>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
          Add Land
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            {/* Pincode + Use my location */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Pincode *"
                fullWidth
                value={form.pincode}
                onChange={handleChange("pincode")}
                onBlur={handlePincodeBlur}
                inputProps={{ maxLength: 6 }}
                helperText="Enter 6-digit PIN; district & state fill automatically"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ height: "100%" }}
              >
                <Button
                  type="button"
                  variant="outlined"
                  startIcon={
                    geoLoading ? <CircularProgress size={16} /> : <MyLocationIcon />
                  }
                  onClick={handleUseMyLocation}
                  disabled={geoLoading}
                >
                  Use my location
                </Button>
              </Stack>
            </Grid>

            {/* District (auto from pincode / GPS) */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="District *"
                fullWidth
                value={form.district}
                onChange={handleChange("district")}
                InputProps={{
                  endAdornment: lookupLoading ? (
                    <CircularProgress size={16} />
                  ) : null,
                }}
              />
            </Grid>

            {/* Village */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Village *"
                fullWidth
                value={form.village}
                onChange={handleChange("village")}
              />
            </Grid>

            {/* State */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="State *"
                fullWidth
                value={form.state}
                onChange={handleChange("state")}
              />
            </Grid>

            {/* Land area */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Land area (acres) *"
                type="number"
                fullWidth
                value={form.land_area}
                onChange={handleChange("land_area")}
              />
            </Grid>

            {/* Soil type (optional) */}
            {/* Soil Type Dropdown */}
<Grid item xs={12} sm={6}>
  <TextField
    select
    fullWidth
    label="Soil Type"
    name="soil_type"
    value={form.soil_type}
    onChange={handleChange("soil_type")}
    SelectProps={{ native: true }}
  >
    <option value=""></option>
    <option value="Alluvial">Alluvial</option>
    <option value="Black">Black</option>
    <option value="Red">Red</option>
    <option value="Laterite">Laterite</option>
    <option value="Desert">Desert</option>
    <option value="Mountain">Mountain</option>
    <option value="Sandy Loam">Sandy Loam</option>
    <option value="Clay Loam">Clay Loam</option>
  </TextField>
</Grid>



            {/* Submit */}
            <Grid item xs={12}>
              <Stack direction="row" justifyContent="flex-end">
                <Button
                  type="submit"
                  variant="contained"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Land"}
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddLand;
