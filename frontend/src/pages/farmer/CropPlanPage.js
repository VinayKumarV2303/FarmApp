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
  Divider,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

// =======================
// Crop Master (Kolar)
// =======================

const CROP_OPTIONS = [
  // Field crops
  "Ragi",
  "Paddy",
  "Maize",
  "Tur",
  "Horse Gram",
  "Cowpea",
  "Groundnut",
  "Pulses",
  "Sugarcane",
  // Vegetables
  "Tomato",
  "Potato",
  "Onion",
  "Beans",
  "Cabbage",
  "Cauliflower",
  "Brinjal",
  "Chilli",
  "Carrot",
  "Radish",
  "Capsicum",
  "Leafy Vegetables",
];

// Approximate days from sowing → harvest per crop (Kolar-like conditions)
const HARVEST_DAYS = {
  // Field crops
  Ragi: 120,
  Paddy: 120,
  Maize: 110,
  Tur: 160,
  "Horse Gram": 100,
  Cowpea: 90,
  Groundnut: 110,
  Pulses: 90,
  Sugarcane: 365,

  // Vegetables
  Tomato: 120,
  Potato: 110,
  Onion: 120,
  Beans: 75,
  Cabbage: 90,
  Cauliflower: 100,
  Brinjal: 130,
  Chilli: 180,
  Carrot: 110,
  Radish: 60,
  Capsicum: 140,
  "Leafy Vegetables": 45,
};

const IRRIGATION_TYPES = ["Rainfed", "Canal", "Tube well", "Drip", "Sprinkler"];

// Season labels (internal)
const SEASON_LABELS = {
  KHARIF: "Kharif (Monsoon)",
  RABI: "Rabi (Winter)",
  ZAID: "Zaid (Summer)",
};

// Row template
const EMPTY_ROW = {
  crop: "",
  acres: "",
  seedVariety: "",
  sowingDate: "",
  expectedHarvestDate: "",
  expectedYield: "",
  autoSeason: "", // season stored, but NOT shown as a field in the form
};

// helper to format JS Date -> yyyy-mm-dd
const formatDate = (date) => {
  if (!date) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// Season inference: Option A (month-based, India-style)
// June–October  → Kharif
// November–March → Rabi
// April–May     → Zaid
const inferSeasonFromDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const m = d.getMonth() + 1; // 1–12

  if (m >= 6 && m <= 10) return SEASON_LABELS.KHARIF; // Jun–Oct
  if (m === 11 || m === 12 || m === 1 || m === 2 || m === 3)
    return SEASON_LABELS.RABI; // Nov–Mar
  if (m === 4 || m === 5) return SEASON_LABELS.ZAID; // Apr–May

  return "";
};

// compute harvest date only (yield now comes from backend)
const computeHarvestDate = (row) => {
  const crop = row.crop;
  const sowingDate = row.sowingDate;
  let expectedHarvestDate = "";

  if (crop && sowingDate) {
    const days = HARVEST_DAYS[crop] || 100;
    const base = new Date(sowingDate);
    if (!isNaN(base.getTime())) {
      base.setDate(base.getDate() + days);
      expectedHarvestDate = formatDate(base);
    }
  }

  return expectedHarvestDate;
};

export default function CropPlanPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [lands, setLands] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedLandId, setSelectedLandId] = useState("");
  const [rows, setRows] = useState([EMPTY_ROW]);
  const [irrigationType, setIrrigationType] = useState("");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Load only approved lands and existing plans
  useEffect(() => {
    const loadData = async () => {
      try {
        const landRes = await api.get("/farmer/land/?only_approved=1");
        const planRes = await api.get("/farmer/crop-plan/");
        setLands(landRes.data || []);
        setPlans(planRes.data || []);
      } catch (e) {
        console.error("Load failed", e);
      }
    };
    loadData();
  }, []);

  // Give each land a UI index: Land #1, Land #2, ...
  const landOptions = useMemo(
    () =>
      lands.map((l, idx) => ({
        ...l,
        uiIndex: idx + 1,
      })),
    [lands]
  );

  const selectedLand = useMemo(
    () =>
      landOptions.find((l) => String(l.id) === String(selectedLandId)) || null,
    [landOptions, selectedLandId]
  );

  const usedForThisLand = useMemo(() => {
    if (!selectedLand) return 0;
    return plans
      .filter((p) => p.land === selectedLand.id)
      .reduce((sum, p) => sum + Number(p.total_acres_allocated || 0), 0);
  }, [plans, selectedLand]);

  const landAreaAcres = selectedLand?.land_area || 0;
  const landSoilType = selectedLand?.soil_type || "";

  const totalAllocatedAcres = useMemo(
    () => rows.reduce((sum, r) => sum + (Number(r.acres) || 0), 0),
    [rows]
  );

  const rawRemaining = landAreaAcres - usedForThisLand - totalAllocatedAcres;
  const remainingForLand = Math.max(rawRemaining, 0);
  const isOverAllocated = rawRemaining < 0;

  // total expected yield (sum of all rows)
  const totalExpectedYield = useMemo(
    () =>
      rows.reduce((sum, r) => sum + (Number(r.expectedYield || 0) || 0), 0),
    [rows]
  );

  // only block form when no land or over-allocated
  const isDisabledForm = !selectedLandId || isOverAllocated;

  const validateForm = () => {
    const newErrors = {};

    if (!selectedLandId) {
      newErrors.land = "Select land to continue";
    } else if (!landSoilType) {
      newErrors.land =
        "Selected land has no soil type. Please edit land and set soil.";
    }

    if (!irrigationType) newErrors.irrigation = "Choose irrigation type";

    rows.forEach((r, i) => {
      if (!r.crop) newErrors[`row-${i}-crop`] = "Select crop";
      if (!r.acres || Number(r.acres) <= 0)
        newErrors[`row-${i}-acres`] = "Enter acres";
      if (!r.sowingDate) newErrors[`row-${i}-sowing`] = "Pick sowing date";
    });

    if (isOverAllocated) {
      newErrors.total = "Total acres exceed this land's available area.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Safely recalc a single row:
   *  - merge partialRow into that row
   *  - recompute harvest date
   *  - recompute autoSeason from sowing date (hidden field)
   *  - call backend to get expectedYield
   *
   * opts can override irrigationType (when header changes)
   */
  const recalcRow = async (index, partialRow = {}, opts = {}) => {
    const currentIrrigation = opts.irrigationType ?? irrigationType;
    const soilForYield = landSoilType; // from selected land only

    let mergedRow;

    // 1) Safely update state and compute harvest date + auto season
    setRows((prev) => {
      if (!prev[index]) return prev;
      const updated = [...prev];
      mergedRow = { ...updated[index], ...partialRow };

      mergedRow.expectedHarvestDate = computeHarvestDate(mergedRow);
      mergedRow.autoSeason = inferSeasonFromDate(mergedRow.sowingDate);

      updated[index] = mergedRow;
      return updated;
    });

    if (!mergedRow) return;

    const { crop, acres, sowingDate, autoSeason } = mergedRow;
    const acresNum = Number(acres) || 0;

    // Not enough info yet to ask backend
    if (
      !crop ||
      !acresNum ||
      !soilForYield ||
      !currentIrrigation ||
      !sowingDate ||
      !autoSeason
    ) {
      return;
    }

    try {
      const res = await api.get("/farmer/yield-estimate/", {
        params: {
          crop,
          acres: acresNum,
          soil_type: soilForYield,
          season: autoSeason,
          irrigation_type: currentIrrigation,
          district: selectedLand?.district || "Kolar",
          state: selectedLand?.state || "Karnataka",
        },
      });

      const expectedYield = res.data?.expected_yield;

      if (expectedYield != null) {
        setRows((prev) => {
          if (!prev[index]) return prev; // row might be removed
          const updated = [...prev];
          updated[index] = {
            ...updated[index],
            expectedYield: String(expectedYield),
          };
          return updated;
        });
      }
    } catch (err) {
      console.error("Failed to fetch yield estimate", err);
      // UI still usable even if yield API fails
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Pick plan-level season from first row that has autoSeason
    const planSeason = rows.find((r) => r.autoSeason)?.autoSeason || "";

    const payload = {
      land_id: selectedLandId,
      soil_type: landSoilType,
      season: planSeason,
      irrigation_type: irrigationType,
      total_acres_allocated: totalAllocatedAcres,
      crops: rows.map((r) => ({
        crop_name: r.crop,
        acres: Number(r.acres),
        seed_variety: r.seedVariety,
        sowing_date: r.sowingDate,
        expected_harvest_date: r.expectedHarvestDate,
        expected_yield: Number(r.expectedYield || 0), // total quintals
      })),
    };

    try {
      setSaving(true);
      await api.post("/farmer/crop-plan/", payload);

      // Reset all form state after successful submit
      setRows([EMPTY_ROW]);
      setSelectedLandId("");
      setIrrigationType("");
      setErrors({});

      alert("🌱 Crop plan saved successfully");
      // 🔁 FIXED: go back to Crop Details page instead of invalid /farmer/land
      navigate("/farmer/cropdetails");
    } catch (e) {
      alert("❌ Failed to save crop plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2, md: 3 },
        maxWidth: 1200,
        mx: "auto",
      }}
    >
      <Typography variant="h6" fontWeight={600} mb={{ xs: 1.5, md: 2 }}>
        Create Crop Plan
      </Typography>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={{ xs: 2, md: 3 }}>
          {/* LEFT: MAIN FORM (single form for mobile + desktop) */}
          <Grid item xs={12} md={8}>
            <Card elevation={isMobile ? 1 : 2}>
              <CardHeader
                title="Crop Plan Details"
                sx={{ pb: 0.5, "& .MuiCardHeader-title": { fontSize: 16 } }}
              />
              <CardContent sx={{ pt: 1.5, pb: 2 }}>
                {/* LAND & BASIC DETAILS */}
                <Stack spacing={1.5} mb={2.5}>
                  <TextField
                    size="small"
                    select
                    fullWidth
                    label="Select Land"
                    value={selectedLandId}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSelectedLandId(value);
                      // reset rows when switching land to avoid mixing areas/soil
                      setRows([EMPTY_ROW]);
                      setErrors({});
                    }}
                    error={!!errors.land}
                    helperText={errors.land}
                  >
                    {landOptions.map((l) => (
                      <MenuItem key={l.id} value={l.id}>
                        {/* UI label: Land #1, Land #2, ... */}
                        Land #{l.uiIndex} — {l.land_area} acres
                      </MenuItem>
                    ))}
                  </TextField>

                  {selectedLand && (
                    <Typography variant="body2" color="text.secondary">
                      Soil: <strong>{landSoilType || "Not set"}</strong> •
                      Total: <strong>{landAreaAcres}</strong> acres • Already
                      planned: <strong>{usedForThisLand}</strong> acres
                    </Typography>
                  )}

                  {isOverAllocated && (
                    <Typography color="error" sx={{ mb: 0.5 }} variant="body2">
                      🚫 Total planned acres are more than available on this
                      land.
                    </Typography>
                  )}

                  <TextField
                    size="small"
                    select
                    fullWidth
                    label="Irrigation Type"
                    value={irrigationType}
                    onChange={(e) => {
                      const value = e.target.value;
                      setIrrigationType(value);
                      // recalc yield for all rows with new irrigation
                      rows.forEach((_, idx) => {
                        recalcRow(idx, {}, { irrigationType: value });
                      });
                    }}
                    disabled={isDisabledForm}
                    error={!!errors.irrigation}
                    helperText={errors.irrigation}
                  >
                    {IRRIGATION_TYPES.map((i) => (
                      <MenuItem key={i} value={i}>
                        {i}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>

                {/* CROP ALLOCATION */}
                <Typography
                  variant="subtitle2"
                  fontWeight={600}
                  gutterBottom
                  sx={{ mt: 0.5 }}
                >
                  Crop Allocation
                  {selectedLand && (
                    <Typography
                      component="span"
                      variant="body2"
                      sx={{ ml: 1, color: "text.secondary" }}
                    >
                      (Free area: {remainingForLand.toFixed(2)} acres)
                    </Typography>
                  )}
                </Typography>

                {errors.total && (
                  <Typography color="error" sx={{ mb: 1 }} variant="body2">
                    {errors.total}
                  </Typography>
                )}

                <Stack spacing={1.5}>
                  {rows.map((r, i) => (
                    <Box
                      key={i}
                      sx={{
                        p: 1.5,
                        border: "1px solid #ddd",
                        borderRadius: 2,
                      }}
                    >
                      <Stack spacing={1}>
                        <TextField
                          size="small"
                          select
                          fullWidth
                          label="Crop"
                          value={r.crop}
                          onChange={(e) =>
                            recalcRow(i, { crop: e.target.value })
                          }
                          disabled={isDisabledForm}
                          error={!!errors[`row-${i}-crop`]}
                          helperText={errors[`row-${i}-crop`] || ""}
                        >
                          {CROP_OPTIONS.map((c) => (
                            <MenuItem key={c} value={c}>
                              {c}
                            </MenuItem>
                          ))}
                        </TextField>

                        {/* Acres dropdown with smart disabling */}
                        <TextField
                          size="small"
                          select
                          fullWidth
                          label="Acres"
                          value={r.acres}
                          onChange={(e) =>
                            recalcRow(i, { acres: e.target.value })
                          }
                          disabled={isDisabledForm}
                          error={!!errors[`row-${i}-acres`]}
                          helperText={errors[`row-${i}-acres`] || ""}
                        >
                          {(() => {
                            const maxPossible = landAreaAcres || 0;
                            const count = Math.floor(maxPossible * 2); // 0.5 steps
                            const allowedForNewPlan =
                              landAreaAcres - usedForThisLand;

                            const currentRowAcres = Number(r.acres) || 0;

                            const options = Array.from(
                              { length: count },
                              (_, idx) => (idx + 1) * 0.5
                            );

                            return options.map((v) => {
                              const newTotal =
                                totalAllocatedAcres - currentRowAcres + v;
                              const exceeds = newTotal > allowedForNewPlan;

                              return (
                                <MenuItem key={v} value={v} disabled={exceeds}>
                                  {v}
                                </MenuItem>
                              );
                            });
                          })()}
                        </TextField>

                        <TextField
                          size="small"
                          type="date"
                          fullWidth
                          label="Sowing Date"
                          InputLabelProps={{ shrink: true }}
                          value={r.sowingDate}
                          onChange={(e) =>
                            recalcRow(i, { sowingDate: e.target.value })
                          }
                          disabled={isDisabledForm}
                          error={!!errors[`row-${i}-sowing`]}
                          helperText={errors[`row-${i}-sowing`] || ""}
                        />
                      </Stack>
                    </Box>
                  ))}

                  <Button
                    startIcon={<AddCircleOutlineIcon />}
                    variant="outlined"
                    fullWidth
                    size="small"
                    onClick={() => setRows((prev) => [...prev, EMPTY_ROW])}
                    disabled={remainingForLand <= 0 || isDisabledForm}
                  >
                    Add another crop
                  </Button>
                </Stack>

                {/* ACTION BUTTONS */}
                <Divider sx={{ my: 2.5 }} />

                <Stack
                  direction="row"
                  justifyContent="flex-end"
                  spacing={1.5}
                >
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => navigate("/farmer/cropdetails")}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="contained"
                    type="submit"
                    size="small"
                    disabled={saving || isOverAllocated}
                  >
                    {saving ? "Saving..." : "Save Crop Plan"}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* RIGHT: LIVE SUMMARY PANEL (shows live data as farmer types) */}
          <Grid item xs={12} md={4}>
            <Card
              elevation={isMobile ? 1 : 2}
              sx={{
                position: isMobile ? "static" : "sticky",
                top: isMobile ? 0 : 16,
              }}
            >
              <CardHeader
                title="Live Plan Summary"
                sx={{ pb: 0.5, "& .MuiCardHeader-title": { fontSize: 15 } }}
              />
              <CardContent sx={{ pt: 1.5, pb: 2 }}>
                {!selectedLand ? (
                  <Typography variant="body2" color="text.secondary">
                    Select land and fill the form. This summary updates
                    instantly as you change values.
                  </Typography>
                ) : (
                  <Stack spacing={0.5} mb={1.5}>
                    <Typography variant="subtitle2">
                      {/* Use UI index here as well */}
                      Land #{selectedLand.uiIndex} — {landAreaAcres} acres
                    </Typography>
                    <Typography variant="body2">
                      Soil: <strong>{landSoilType || "Not set"}</strong>
                    </Typography>
                    <Typography variant="body2">
                      Already planned: <strong>{usedForThisLand}</strong> acres
                    </Typography>
                    <Typography variant="body2">
                      This plan: <strong>{totalAllocatedAcres}</strong> acres
                    </Typography>
                    <Typography variant="body2">
                      Area left after this plan:{" "}
                      <strong>{remainingForLand.toFixed(2)}</strong> acres
                    </Typography>
                    {isOverAllocated && (
                      <Typography variant="body2" color="error">
                        🚫 Over-allocated! Reduce acres.
                      </Typography>
                    )}
                  </Stack>
                )}

                <Divider sx={{ mb: 1 }} />

                <Typography variant="subtitle2" gutterBottom>
                  Crop-wise details
                </Typography>

                {rows.length === 0 && (
                  <Typography variant="body2" color="text.secondary">
                    No crops added yet.
                  </Typography>
                )}

                <Stack
                  spacing={0.75}
                  maxHeight={isMobile ? 220 : 320}
                  sx={{ overflowY: "auto" }}
                >
                  {rows.map((r, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        p: 0.75,
                        borderRadius: 1,
                        border: "1px solid #eee",
                      }}
                    >
                      <Typography variant="body2" fontWeight={600}>
                        {r.crop || `Crop #${idx + 1}`}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Acres: {r.acres || "—"}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Season: {r.autoSeason || "—"}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Sowing: {r.sowingDate || "—"}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Harvest: {r.expectedHarvestDate || "—"}
                      </Typography>
                      <Typography variant="caption" display="block">
                        Expected yield: {r.expectedYield || "—"} q
                      </Typography>
                    </Box>
                  ))}
                </Stack>

                <Divider sx={{ my: 1.5 }} />

                <Typography variant="body2">
                  Total expected yield (this plan):{" "}
                  <strong>{totalExpectedYield.toFixed(1)}</strong> quintals
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
}
