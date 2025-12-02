import React, { useEffect, useState } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  Autocomplete,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

const AddLand = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    village: "",
    district: "",
    state: "",
    land_area: "",
  });

  // dropdown data
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [villages, setVillages] = useState([]);

  // selected objects
  const [selectedState, setSelectedState] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [selectedVillage, setSelectedVillage] = useState(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ─── Load states on mount ────────────────────────────────────────────────
  useEffect(() => {
    const fetchStates = async () => {
      try {
        const res = await api.get("/locations/states/"); // <-- adjust if needed
        setStates(res.data || []);
      } catch (err) {
        console.error("Error fetching states:", err);
        setError("Could not load states. Please try again.");
      }
    };
    fetchStates();
  }, []);

  // ─── When state changes, load districts ──────────────────────────────────
  const handleStateChange = async (_, newState) => {
    setError("");
    setSelectedState(newState);
    setSelectedDistrict(null);
    setSelectedVillage(null);
    setDistricts([]);
    setVillages([]);

    setFormData((prev) => ({
      ...prev,
      state: newState?.name || "",
      district: "",
      village: "",
    }));

    if (!newState) return;

    try {
      const res = await api.get(
        `/locations/districts/?state=${newState.id}` // <-- adjust
      );
      setDistricts(res.data || []);
    } catch (err) {
      console.error("Error fetching districts:", err);
      setError("Could not load districts for this state.");
    }
  };

  // ─── When district changes, load villages ────────────────────────────────
  const handleDistrictChange = async (_, newDistrict) => {
    setError("");
    setSelectedDistrict(newDistrict);
    setSelectedVillage(null);
    setVillages([]);

    setFormData((prev) => ({
      ...prev,
      district: newDistrict?.name || "",
      village: "",
    }));

    if (!newDistrict) return;

    try {
      const res = await api.get(
        `/locations/villages/?district=${newDistrict.id}` // <-- adjust
      );
      setVillages(res.data || []);
    } catch (err) {
      console.error("Error fetching villages:", err);
      setError("Could not load villages for this district.");
    }
  };

  // ─── When village changes ────────────────────────────────────────────────
  const handleVillageChange = (_, newVillage) => {
    setError("");
    setSelectedVillage(newVillage);
    setFormData((prev) => ({
      ...prev,
      village: newVillage?.name || "",
    }));
  };

  const handleFieldChange = (e) => {
    setError("");
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        village: formData.village,
        district: formData.district,
        state: formData.state,
        land_area: formData.land_area
          ? parseFloat(formData.land_area)
          : null,
      };

      await api.post("/farmer/land/", payload);
      navigate("/farmer/land");
    } catch (err) {
      console.error("Add land error:", err);
      setError("Failed to add land.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h5" fontWeight={600}>
          Add New Land 🌱
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Add your farm location and land size.
        </Typography>
      </Grid>

      <Grid item xs={12} md={8}>
        <Card sx={{ borderRadius: 3 }}>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <Stack spacing={2}>
                {error && <Alert severity="error">{error}</Alert>}

                {/* State */}
                <Autocomplete
                  options={states}
                  getOptionLabel={(option) => option.name || ""}
                  value={selectedState}
                  onChange={handleStateChange}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="State"
                      required
                      fullWidth
                    />
                  )}
                />

                {/* District */}
                <Autocomplete
                  options={districts}
                  getOptionLabel={(option) => option.name || ""}
                  value={selectedDistrict}
                  onChange={handleDistrictChange}
                  disabled={!selectedState}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="District"
                      required
                      fullWidth
                    />
                  )}
                />

                {/* Village */}
                <Autocomplete
                  options={villages}
                  getOptionLabel={(option) => option.name || ""}
                  value={selectedVillage}
                  onChange={handleVillageChange}
                  disabled={!selectedDistrict}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Village"
                      required
                      fullWidth
                    />
                  )}
                />

                {/* Land area */}
                <TextField
                  label="Land Area (Acres)"
                  name="land_area"
                  type="number"
                  value={formData.land_area}
                  onChange={handleFieldChange}
                  required
                  fullWidth
                  inputProps={{ min: 0, step: "0.01" }}
                />

                <Stack direction="row" justifyContent="flex-end" spacing={2}>
                  <Button
                    variant="outlined"
                    onClick={() => navigate("/farmer/land")}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" variant="contained" disabled={saving}>
                    {saving ? "Saving..." : "Add Land"}
                  </Button>
                </Stack>
              </Stack>
            </form>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default AddLand;
