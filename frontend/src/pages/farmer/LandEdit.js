// src/pages/farmer/LandEdit.js
import React, { useEffect, useState, useRef } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  MenuItem,
  Snackbar,
  Alert,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";

const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
  "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh",
  "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const defaultCenter = { lat: 20.5937, lng: 78.9629 }; // 🇮🇳 India center

export default function LandEdit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const [formData, setFormData] = useState({
    village: "",
    district: "",
    state: "",
    land_area: "",
    latitude: null,
    longitude: null,
  });

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", type: "success" });

  // 📍 Map Loading
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: "YOUR_GOOGLE_MAPS_API_KEY", // replace before deployment
  });

  const handleMapClick = (event) => {
    setFormData((prev) => ({
      ...prev,
      latitude: event.latLng.lat(),
      longitude: event.latLng.lng(),
    }));
  };

  useEffect(() => {
    if (!user) return;
    if (!id) return;

    const loadLand = async () => {
      try {
        const res = await api.get(`/farmer/land/${id}/`);
        setFormData(res.data);
      } catch (err) {
        console.error("Load land error:", err);
      }
    };

    loadLand();
  }, [user, id]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await api.put(`/farmer/land/${id}/`, formData);
      setToast({ open: true, type: "success", message: "Land updated successfully!" });

      setTimeout(() => navigate("/farmer/land"), 1200);
    } catch (err) {
      console.error("Save error:", err);
      setToast({ open: true, type: "error", message: "Failed to update land!" });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return <Typography>Please login again.</Typography>;

  return (
    <>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
        ✏ Update Land Details
      </Typography>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* LEFT FORM */}
          <Grid xs={12} md={6}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Stack spacing={2}>
                  <TextField
                    name="village"
                    label="Village"
                    value={formData.village}
                    onChange={handleChange}
                    required
                    fullWidth
                  />

                  <TextField
                    name="district"
                    label="District"
                    value={formData.district}
                    onChange={handleChange}
                    required
                    fullWidth
                  />

                  <TextField
                    select
                    name="state"
                    label="State"
                    value={formData.state}
                    onChange={handleChange}
                    required
                    fullWidth
                  >
                    {indianStates.map((st) => (
                      <MenuItem key={st} value={st}>{st}</MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    name="land_area"
                    label="Land Area (Acres)"
                    type="number"
                    value={formData.land_area}
                    onChange={handleChange}
                    fullWidth
                    required
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* MAP PICKER */}
          <Grid xs={12} md={6}>
            <Card sx={{ p: 1, borderRadius: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                📍 Tap on map to set exact land location
              </Typography>

              {isLoaded ? (
                <GoogleMap
                  center={{
                    lat: formData.latitude || defaultCenter.lat,
                    lng: formData.longitude || defaultCenter.lng,
                  }}
                  zoom={formData.latitude ? 12 : 5}
                  mapContainerStyle={{ width: "100%", height: "260px", borderRadius: 10 }}
                  onClick={handleMapClick}
                >
                  {formData.latitude && (
                    <Marker position={{ lat: formData.latitude, lng: formData.longitude }} />
                  )}
                </GoogleMap>
              ) : (
                <Typography>Loading map...</Typography>
              )}
            </Card>
          </Grid>

          {/* ACTIONS */}
          <Grid xs={12}>
            <Stack direction="row" justifyContent="flex-end" spacing={2}>
              <Button variant="outlined" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button variant="contained" type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </form>

      {/* SUCCESS / ERROR TOAST */}
      <Snackbar
        open={toast.open}
        autoHideDuration={2000}
        onClose={() => setToast({ ...toast, open: false })}
      >
        <Alert severity={toast.type}>
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
}
