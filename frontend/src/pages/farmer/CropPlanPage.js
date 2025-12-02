// src/pages/farmer/CropPlanPage.js
import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  MenuItem,
  Stack,
  Button,
  Chip,
  Divider,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios"; // shared axios instance

const CROP_OPTIONS = [
  "Wheat",
  "Rice",
  "Maize",
  "Cotton",
  "Sugarcane",
  "Pulses",
  "Groundnut",
  "Mustard",
  "Vegetables Mix",
];

const SOIL_TYPES = [
  "Alluvial",
  "Black",
  "Red",
  "Laterite",
  "Desert",
  "Mountain",
  "Sandy Loam",
  "Clay Loam",
];

const IRRIGATION_TYPES = ["Rainfed", "Canal", "Tube well", "Drip", "Sprinkler"];

// UI-friendly labels for farmers
const SEASONS = [
  "Kharif (Monsoon)",
  "Rabi (Winter)",
  "Zaid (Summer)",
  "Perennial (All Year)",
];

// Base yields per acre (dummy example values – adjust as needed)
const BASE_YIELD_PER_ACRE = {
  Wheat: 20,
  Rice: 25,
  Maize: 18,
  Cotton: 10,
  Sugarcane: 40,
  Pulses: 8,
  Groundnut: 12,
  Mustard: 10,
  "Vegetables Mix": 15,
};

const SOIL_MULTIPLIER = {
  Alluvial: 1.1,
  Black: 1.05,
  Red: 0.95,
  Laterite: 0.9,
  Desert: 0.7,
  Mountain: 0.85,
  "Sandy Loam": 1.0,
  "Clay Loam": 1.0,
};

const IRRIGATION_MULTIPLIER = {
  Drip: 1.15,
  Sprinkler: 1.1,
  Canal: 1.0,
  "Tube well": 1.0,
  Rainfed: 0.85,
};

// Use simple season keys internally
const SEASON_MULTIPLIER = {
  Kharif: 1.0,
  Rabi: 1.05,
  Zaid: 0.95,
  Perennial: 1.0,
};

// Approx days from sowing to harvest by crop (rough)
const CROP_DURATION_DAYS = {
  Wheat: 120,
  Rice: 120,
  Maize: 100,
  Cotton: 180,
  Sugarcane: 300,
  Pulses: 90,
  Groundnut: 110,
  Mustard: 120,
  "Vegetables Mix": 70,
};

const EMPTY_ROW = {
  crop: "",
  acres: "",
  seedVariety: "",
  sowingDate: "",
};

function normalizeSeasonKey(seasonLabel) {
  if (!seasonLabel) return null;
  if (seasonLabel.startsWith("Kharif")) return "Kharif";
  if (seasonLabel.startsWith("Rabi")) return "Rabi";
  if (seasonLabel.startsWith("Zaid")) return "Zaid";
  if (seasonLabel.startsWith("Perennial")) return "Perennial";
  return null;
}

function addDays(dateStr, days) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function CropPlanPage() {
  const navigate = useNavigate();

  // Land state
  const [lands, setLands] = useState([]);
  const [selectedLandId, setSelectedLandId] = useState("");
  const [landsLoading, setLandsLoading] = useState(false);

  // Plan-level state
  const [soilType, setSoilType] = useState("");
  const [season, setSeason] = useState("");
  const [irrigationType, setIrrigationType] = useState("");
  const [notes, setNotes] = useState("");

  // Dynamic crop rows
  const [rows, setRows] = useState([EMPTY_ROW]);

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // 👉 selected land & its area
  const selectedLand = useMemo(
    () => lands.find((l) => String(l.id) === String(selectedLandId)),
    [lands, selectedLandId]
  );

  const landAreaAcres = useMemo(() => {
    if (!selectedLand) return null;

    // SUPPORT multiple possible field names
    const area =
      selectedLand.land_area ??
      selectedLand.area_acres ??
      selectedLand.total_area_acres ??
      selectedLand.area ??
      selectedLand.acre ??
      selectedLand.land_size ??
      null;

    return area != null ? Number(area) : null;
  }, [selectedLand]);

  // Total acres allocated
  const totalAllocatedAcres = useMemo(
    () =>
      rows.reduce((sum, row) => {
        const val = parseFloat(row.acres);
        return sum + (isNaN(val) ? 0 : val);
      }, 0),
    [rows]
  );

  // Remaining acres (for display only)
  const remainingAcres = useMemo(() => {
    if (landAreaAcres == null) return null;
    const rem = landAreaAcres - totalAllocatedAcres;
    return Number(rem.toFixed(2));
  }, [landAreaAcres, totalAllocatedAcres]);

  // Helper to calculate expected yield per acre for a given crop row
  const getExpectedYieldPerAcre = (cropName) => {
    if (!cropName) return "";
    const base =
      BASE_YIELD_PER_ACRE[cropName] ?? BASE_YIELD_PER_ACRE["Vegetables Mix"];

    const soilMul = SOIL_MULTIPLIER[soilType] ?? 1;
    const irrMul = IRRIGATION_MULTIPLIER[irrigationType] ?? 1;
    const seasonKey = normalizeSeasonKey(season);
    const seasonMul = SEASON_MULTIPLIER[seasonKey] ?? 1;

    const result = base * soilMul * irrMul * seasonMul;
    if (!result || isNaN(result)) return "";
    return Number(result.toFixed(1));
  };

  // Helper to compute harvest date for a crop row
  const getExpectedHarvestDate = (sowingDate, cropName) => {
    if (!sowingDate) return "";
    const days =
      CROP_DURATION_DAYS[cropName] ?? CROP_DURATION_DAYS["Vegetables Mix"];
    return addDays(sowingDate, days);
  };

  // Fetch farmer lands on mount
  useEffect(() => {
    const fetchLands = async () => {
      try {
        setLandsLoading(true);
        const res = await api.get("/farmer/land/");
        const data = Array.isArray(res.data)
          ? res.data
          : res.data?.results || [];
        setLands(data);
      } catch (err) {
        console.error("Error fetching lands:", err);
        setLands([]);
      } finally {
        setLandsLoading(false);
      }
    };

    fetchLands();
  }, []);

  const handleRowChange = (index, field, value) => {
    setRows((prev) => {
      const clone = [...prev];
      clone[index] = { ...clone[index], [field]: value };
      return clone;
    });
  };

  const handleAddRow = () => {
    setRows((prev) => [...prev, EMPTY_ROW]);
  };

  const handleRemoveRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!selectedLandId) newErrors.land = "Select a land";
    if (!soilType) newErrors.soilType = "Select soil type";
    if (!season) newErrors.season = "Select season";
    if (!irrigationType) newErrors.irrigationType = "Select irrigation type";

    rows.forEach((row, idx) => {
      if (!row.crop) newErrors[`row-${idx}-crop`] = "Select crop";
      if (!row.acres || Number(row.acres) <= 0) {
        newErrors[`row-${idx}-acres`] = "Select valid acres";
      }
      if (!row.sowingDate) {
        newErrors[`row-${idx}-sowingDate`] = "Select sowing date";
      }
    });

    // ✅ Main rule: allocated acres cannot exceed land area
    if (
      landAreaAcres != null &&
      landAreaAcres > 0 &&
      totalAllocatedAcres > landAreaAcres
    ) {
      newErrors.totalAcres = `Allocated acres (${totalAllocatedAcres}) exceed land area (${landAreaAcres})`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      land_id: selectedLandId,
      soil_type: soilType,
      season,
      irrigation_type: irrigationType,
      notes: notes || "",
      total_acres_allocated: totalAllocatedAcres,
      crops: rows.map((row) => {
        const expectedYield = getExpectedYieldPerAcre(row.crop);
        const harvestDate = getExpectedHarvestDate(row.sowingDate, row.crop);
        return {
          crop_name: row.crop,
          acres: Number(row.acres),
          seed_variety: row.seedVariety || null,
          sowing_date: row.sowingDate || null,
          expected_harvest_date: harvestDate || null,
          expected_yield_per_acre: expectedYield || null,
        };
      }),
    };

    try {
      setSaving(true);
      await api.post("/farmer/crop-plan/", payload);
      alert("✅ Crop plan saved successfully");
      navigate(-1);
    } catch (error) {
      console.error("Error saving crop plan:", error);
      console.log("Server said:", error.response?.data);

      const serverMsg =
        error.response?.data?.detail ||
        (error.response?.data
          ? JSON.stringify(error.response.data, null, 2)
          : "Unknown error");

      alert(`❌ Failed to save crop plan.\n\n${serverMsg}`);
    } finally {
      setSaving(false);
    }
  };

  // Generate dropdown options for acres: 0.5, 1.0, 1.5, ...
  const getAcreOptions = () => {
    const max = landAreaAcres && landAreaAcres > 0 ? landAreaAcres : 10;
    const steps = Math.floor(max * 2); // 0.5 steps
    return Array.from({ length: steps }, (_, i) => (i + 1) * 0.5);
  };

  return (
    <Box
      sx={{
        p: { xs: 2, md: 4 },
        maxWidth: 1100,
        mx: "auto",
      }}
    >
      <Typography variant="h6" fontWeight={600} mb={1}>
        Create Crop Plan
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        Select a land and plan crops for that land.
      </Typography>

      <form onSubmit={handleSubmit} noValidate>
        <Grid container spacing={2}>
          {/* Plan level card */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2, boxShadow: { xs: 1, md: 2 } }}>
              <CardHeader
                titleTypographyProps={{ variant: "subtitle1", fontWeight: 600 }}
                title="Field & Season Details"
                subheader="Land, soil, season and irrigation details."
              />
              <CardContent sx={{ pt: 1 }}>
                <Stack spacing={1.5}>
                  {/* Land selection */}
                  <TextField
                    select
                    label={
                      landsLoading
                        ? "Loading lands..."
                        : lands.length === 0
                        ? "No lands found – add land first"
                        : "Select Land"
                    }
                    fullWidth
                    size="small"
                    value={selectedLandId}
                    onChange={(e) => setSelectedLandId(e.target.value)}
                    disabled={landsLoading || lands.length === 0}
                    error={Boolean(errors.land)}
                    helperText={
                      errors.land ||
                      (landAreaAcres != null && landAreaAcres > 0
                        ? `Available: ${landAreaAcres} acres`
                        : "")
                    }
                  >
                    {lands.map((land) => (
                      <MenuItem key={land.id} value={land.id}>
                        {(land.name || land.nick_name || `Land #${land.id}`) +
                          (land.village ? ` - ${land.village}` : "")}
                        {land.land_area || land.area_acres || land.total_area
                          ? ` (${land.land_area || land.area_acres || land.total_area} acres)`
                          : ""}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label="Soil Type"
                    fullWidth
                    size="small"
                    value={soilType}
                    onChange={(e) => setSoilType(e.target.value)}
                    error={Boolean(errors.soilType)}
                    helperText={errors.soilType}
                  >
                    {SOIL_TYPES.map((soil) => (
                      <MenuItem key={soil} value={soil}>
                        {soil}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label="Season"
                    fullWidth
                    size="small"
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    error={Boolean(errors.season)}
                    helperText={errors.season}
                  >
                    {SEASONS.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    label="Irrigation Type"
                    fullWidth
                    size="small"
                    value={irrigationType}
                    onChange={(e) => setIrrigationType(e.target.value)}
                    error={Boolean(errors.irrigationType)}
                    helperText={errors.irrigationType}
                  >
                    {IRRIGATION_TYPES.map((i) => (
                      <MenuItem key={i} value={i}>
                        {i}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    label="Notes / Special Instructions"
                    fullWidth
                    size="small"
                    multiline
                    minRows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Crop allocation card */}
          <Grid item xs={12}>
            <Card sx={{ borderRadius: 2, boxShadow: { xs: 1, md: 2 } }}>
              <CardHeader
                titleTypographyProps={{ variant: "subtitle1", fontWeight: 600 }}
                title="Crop Allocation"
                subheader="Add one or more crops and allocate acres for each."
                action={
                  <Stack direction="column" alignItems="flex-end" spacing={0.5}>
                    <Chip
                      size="small"
                      label={`Allocated: ${totalAllocatedAcres || 0} acres`}
                      variant="outlined"
                    />
                    {landAreaAcres != null && landAreaAcres > 0 && (
                      <Typography
                        variant="caption"
                        color={
                          errors.totalAcres ||
                          (remainingAcres != null && remainingAcres < 0)
                            ? "error.main"
                            : "text.secondary"
                        }
                      >
                        Land area: {landAreaAcres} acres{" "}
                        {remainingAcres != null &&
                          ` • Remaining: ${Math.max(remainingAcres, 0)} acres`}
                      </Typography>
                    )}
                    {errors.totalAcres && (
                      <Typography variant="caption" color="error.main">
                        {errors.totalAcres}
                      </Typography>
                    )}
                  </Stack>
                }
              />
              <CardContent sx={{ pt: 1 }}>
                <Stack spacing={2}>
                  {rows.map((row, index) => {
                    const rowYield = getExpectedYieldPerAcre(row.crop);
                    const rowHarvestDate = getExpectedHarvestDate(
                      row.sowingDate,
                      row.crop
                    );
                    const acreOptions = getAcreOptions();

                    return (
                      <Box
                        key={index}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          border: "1px solid",
                          borderColor: "divider",
                          bgcolor: "background.default",
                        }}
                      >
                        <Stack spacing={1.2}>
                          <TextField
                            select
                            label="Crop / Plant"
                            size="small"
                            fullWidth
                            value={row.crop}
                            onChange={(e) =>
                              handleRowChange(index, "crop", e.target.value)
                            }
                            error={Boolean(errors[`row-${index}-crop`])}
                            helperText={errors[`row-${index}-crop`] || ""}
                          >
                            {CROP_OPTIONS.map((crop) => (
                              <MenuItem key={crop} value={crop}>
                                {crop}
                              </MenuItem>
                            ))}
                          </TextField>

                          {/* Acres dropdown in 0.5 steps */}
                          <TextField
                            select
                            label="Acres Allocated"
                            size="small"
                            fullWidth
                            value={row.acres}
                            onChange={(e) =>
                              handleRowChange(index, "acres", e.target.value)
                            }
                            error={Boolean(errors[`row-${index}-acres`])}
                            helperText={errors[`row-${index}-acres`] || ""}
                          >
                            {acreOptions.map((val) => {
                              // Prevent over allocation: (total - old + new) <= landArea
                              const newTotal =
                                totalAllocatedAcres -
                                (Number(row.acres) || 0) +
                                val;
                              const disabled =
                                landAreaAcres &&
                                newTotal > landAreaAcres;

                              return (
                                <MenuItem
                                  key={val}
                                  value={val}
                                  disabled={!!disabled}
                                >
                                  {val} acres
                                  {disabled ? " (exceeds land)" : ""}
                                </MenuItem>
                              );
                            })}
                          </TextField>

                          <TextField
                            label="Seed Variety (optional)"
                            size="small"
                            fullWidth
                            value={row.seedVariety}
                            onChange={(e) =>
                              handleRowChange(
                                index,
                                "seedVariety",
                                e.target.value
                              )
                            }
                          />

                          {/* Sowing Date per crop */}
                          <TextField
                            label="Sowing Date"
                            fullWidth
                            size="small"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            value={row.sowingDate}
                            onChange={(e) =>
                              handleRowChange(
                                index,
                                "sowingDate",
                                e.target.value
                              )
                            }
                            error={Boolean(errors[`row-${index}-sowingDate`])}
                            helperText={errors[`row-${index}-sowingDate`] || ""}
                          />

                          {/* Auto Expected Harvest Date */}
                          <TextField
                            label="Expected Harvest Date (auto)"
                            fullWidth
                            size="small"
                            type="date"
                            InputLabelProps={{ shrink: true }}
                            value={rowHarvestDate}
                            InputProps={{ readOnly: true }}
                            helperText={
                              row.sowingDate && rowHarvestDate
                                ? "Auto based on crop duration."
                                : "Select sowing date to see expected harvest date."
                            }
                          />

                          {/* Auto Expected Yield per Acre per crop */}
                          <TextField
                            label="Expected Yield / Acre (auto)"
                            fullWidth
                            size="small"
                            value={rowYield !== "" ? rowYield : ""}
                            InputProps={{ readOnly: true }}
                            helperText={
                              rowYield
                                ? "Auto from crop + soil + season + irrigation."
                                : "Select crop, soil, season & irrigation to see yield."
                            }
                          />

                          <Stack direction="row" justifyContent="flex-end">
                            <Button
                              size="small"
                              variant="text"
                              color="error"
                              startIcon={<DeleteIcon fontSize="small" />}
                              onClick={() => handleRemoveRow(index)}
                              disabled={rows.length === 1}
                            >
                              Remove
                            </Button>
                          </Stack>
                        </Stack>
                      </Box>
                    );
                  })}

                  <Button
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={handleAddRow}
                    variant="outlined"
                    fullWidth
                    size="medium"
                  >
                    Add another crop
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Actions */}
          <Grid item xs={12}>
            <Divider sx={{ mb: 1 }} />
            <Stack direction="row" spacing={1.5} justifyContent="flex-end">
              <Button
                variant="outlined"
                onClick={() => navigate(-1)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? "Saving..." : "Save Crop Plan"}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
}
