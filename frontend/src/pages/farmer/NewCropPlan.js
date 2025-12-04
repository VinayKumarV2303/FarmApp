// src/pages/farmer/NewCropPlan.js
import React, { useEffect, useState, useMemo } from "react";
import {
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Button,
  Alert,
  Stack,
  Divider,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

const seasons = ["Kharif", "Rabi", "Zaid"];
const soilTypes = ["Red Soil", "Black Soil", "Clay", "Sandy"];
const irrigationTypes = ["Rainfed", "Canal", "Borewell", "Drip"];

const NewCropPlan = () => {
  const navigate = useNavigate();

  const [lands, setLands] = useState([]);
  const [selectedLandId, setSelectedLandId] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    crop_name: "",
    acres: "",
    season: "",
    soil_type: "",
    irrigation_type: "",
    notes: "",
  });

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // ✅ Load ONLY approved lands from backend
  useEffect(() => {
    const fetchApprovedLands = async () => {
      try {
        const res = await api.get("/farmer/land/?only_approved=1");
        setLands(res.data || []);
      } catch (err) {
        console.error("Error loading lands:", err);
        setError("Could not load approved lands.");
      }
    };

    fetchApprovedLands();
  }, []);

  // Selected land details
  const selectedLand = useMemo(
    () =>
      lands.find((l) => String(l.id) === String(selectedLandId)) || null,
    [lands, selectedLandId]
  );

  const totalArea = selectedLand?.land_area || 0;
  const usedArea = 0; // update later if you track existing plans
  const remainingArea = totalArea - usedArea;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!selectedLandId) {
      setError("Please select an approved land.");
      return;
    }

    if (!form.crop_name || !form.acres) {
      setError("Crop name and acres are required.");
      return;
    }

    const acresValue = parseFloat(form.acres || "0");
    if (acresValue <= 0) {
      setError("Acres must be greater than 0.");
      return;
    }

    if (acresValue > remainingArea) {
      setError(
        `You are trying to allocate ${acresValue} acres, but only ${remainingArea} acres are remaining.`
      );
      return;
    }

    const payload = {
      land_id: selectedLandId,
      soil_type: form.soil_type,
      season: form.season,
      irrigation_type: form.irrigation_type,
      notes: form.notes,
      crops: [
        {
          crop_name: form.crop_name,
          acres: acresValue,
        },
      ],
    };

    setSaving(true);
    try {
      console.log("🚀 Crop plan payload:", payload);
      await api.post("/farmer/crop-plan/", payload);
      alert("Crop Plan Created ✅");
      navigate("/farmer/dashboard");
    } catch (err) {
      console.error("Crop plan error:", err.response?.data || err);
      setError(
        err.response?.data?.detail ||
          JSON.stringify(err.response?.data) ||
          "Failed to create crop plan."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card sx={{ maxWidth: 500 }}>
      <CardContent>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Create Crop Plan
        </Typography>

        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600 }}>
          Field &amp; Season Details
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          {/* 🔽 DROPDOWN now uses ONLY approved lands */}
          <TextField
            select
            label="Select Land"
            value={selectedLandId}
            onChange={(e) => setSelectedLandId(e.target.value)}
            fullWidth
            required
            sx={{ mb: 1.5 }}
          >
            {lands.length === 0 && (
              <MenuItem disabled value="">
                No approved lands. Please wait for admin approval.
              </MenuItem>
            )}

            {lands.map((land) => (
              <MenuItem key={land.id} value={land.id}>
                {`Land #${land.id} — ${land.land_area} acres`}
              </MenuItem>
            ))}
          </TextField>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Used: {usedArea} / {totalArea} acres — Remaining:{" "}
            {remainingArea} acres
          </Typography>

          <Divider sx={{ mb: 2 }} />

          <Stack spacing={2}>
            <TextField
              select
              label="Soil Type"
              name="soil_type"
              value={form.soil_type}
              onChange={handleChange}
              fullWidth
            >
              {soilTypes.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Season"
              name="season"
              value={form.season}
              onChange={handleChange}
              fullWidth
              required
            >
              {seasons.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Irrigation Type"
              name="irrigation_type"
              value={form.irrigation_type}
              onChange={handleChange}
              fullWidth
            >
              {irrigationTypes.map((i) => (
                <MenuItem key={i} value={i}>
                  {i}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Crop Name"
              name="crop_name"
              value={form.crop_name}
              onChange={handleChange}
              fullWidth
              required
            />

            <TextField
              label="Acres to Allocate"
              name="acres"
              type="number"
              value={form.acres}
              onChange={handleChange}
              fullWidth
              required
              inputProps={{ min: 0, step: "0.01" }}
            />

            <TextField
              label="Notes (Optional)"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              fullWidth
              multiline
              minRows={2}
            />

            <Stack direction="row" justifyContent="flex-end" spacing={2}>
              <Button
                variant="outlined"
                onClick={() => navigate("/farmer/dashboard")}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={saving || lands.length === 0}
              >
                {saving ? "Saving..." : "Save Plan"}
              </Button>
            </Stack>
          </Stack>
        </form>
      </CardContent>
    </Card>
  );
};

export default NewCropPlan;
