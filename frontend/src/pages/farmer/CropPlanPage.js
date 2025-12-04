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
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteIcon from "@mui/icons-material/Delete";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

// =======================
// 🔹 Crop Master (Kolar)
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

const SEASONS = [
  "Kharif (Monsoon)",
  "Rabi (Winter)",
  "Zaid (Summer)",
  "Perennial (All Year)",
];

const EMPTY_ROW = {
  crop: "",
  acres: "",
  seedVariety: "",
  sowingDate: "",
  expectedHarvestDate: "",
  expectedYield: "",
};

// helper to format JS Date -> yyyy-mm-dd
const formatDate = (date) => {
  if (!date) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

  const [lands, setLands] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selectedLandId, setSelectedLandId] = useState("");
  const [rows, setRows] = useState([EMPTY_ROW]);
  const [soilType, setSoilType] = useState("");
  const [season, setSeason] = useState("");
  const [irrigationType, setIrrigationType] = useState("");
  const [notes, setNotes] = useState("");
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

  const selectedLand = useMemo(
    () => lands.find((l) => String(l.id) === String(selectedLandId)),
    [lands, selectedLandId]
  );

  const usedForThisLand = useMemo(() => {
    if (!selectedLand) return 0;
    return plans
      .filter((p) => p.land === selectedLand.id)
      .reduce((sum, p) => sum + Number(p.total_acres_allocated || 0), 0);
  }, [plans, selectedLand]);

  const landAreaAcres = selectedLand?.land_area || 0;

  const totalAllocatedAcres = useMemo(
    () => rows.reduce((sum, r) => sum + (Number(r.acres) || 0), 0),
    [rows]
  );

  const rawRemaining = landAreaAcres - usedForThisLand - totalAllocatedAcres;
  const remainingForLand = Math.max(rawRemaining, 0);
  const isOverAllocated = rawRemaining < 0;

  // only block form when no land or over-allocated
  const isDisabledForm = !selectedLandId || isOverAllocated;

  const validateForm = () => {
    const newErrors = {};
    if (!selectedLandId) newErrors.land = "Select land";

    if (!soilType) newErrors.soil = "Required";
    if (!season) newErrors.season = "Required";
    if (!irrigationType) newErrors.irrigation = "Required";

    rows.forEach((r, i) => {
      if (!r.crop) newErrors[`row-${i}-crop`] = "Required";
      if (!r.acres || Number(r.acres) <= 0)
        newErrors[`row-${i}-acres`] = "Invalid";
      if (!r.sowingDate) newErrors[`row-${i}-sowing`] = "Required";
      // expected_* are auto, so no validation errors here
    });

    if (isOverAllocated) {
      newErrors.total = "Exceeds available acres!";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * 🔁 Safely recalc a single row:
   *  - merge partialRow into that row
   *  - recompute harvest date
   *  - call backend to get expectedYield
   *
   * opts can override soilType/season/irrigationType
   */
  const recalcRow = async (index, partialRow = {}, opts = {}) => {
    const currentSoil = opts.soilType ?? soilType;
    const currentSeason = opts.season ?? season;
    const currentIrrigation = opts.irrigationType ?? irrigationType;

    let mergedRow;

    // 1) Safely update state and compute harvest date
    setRows((prev) => {
      if (!prev[index]) {
        // index might be stale (row removed) – keep prev as is
        return prev;
      }
      const updated = [...prev];
      mergedRow = { ...updated[index], ...partialRow };
      mergedRow.expectedHarvestDate = computeHarvestDate(mergedRow);
      updated[index] = mergedRow;
      return updated;
    });

    // If row didn't exist, bail out
    if (!mergedRow) return;

    const { crop, acres, sowingDate } = mergedRow;
    const acresNum = Number(acres) || 0;

    // Not enough info yet to ask backend
    if (
      !crop ||
      !acresNum ||
      !currentSoil ||
      !currentSeason ||
      !currentIrrigation ||
      !sowingDate
    ) {
      return;
    }

    try {
      const res = await api.get("/farmer/yield-estimate/", {
        params: {
          crop,
          acres: acresNum,
          soil_type: currentSoil,
          season: currentSeason,
          irrigation_type: currentIrrigation,
          district: "Kolar",
          state: "Karnataka",
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
      // keep UI usable even if yield API fails
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      land_id: selectedLandId,
      soil_type: soilType,
      season,
      irrigation_type: irrigationType,
      notes,
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

      // ✅ Reset all form state after successful submit
      setRows([EMPTY_ROW]);
      setSelectedLandId("");
      setSoilType("");
      setSeason("");
      setIrrigationType("");
      setNotes("");
      setErrors({});

      alert("🌱 Crop plan saved successfully");

      // navigate to land page; since we don't persist anything locally,
      // coming back to this page will show a clean form
      navigate("/farmer/land");
    } catch (e) {
      alert("❌ Failed to save crop plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: "auto" }}>
      <Typography variant="h6" fontWeight={600} mb={2}>
        Create Crop Plan
      </Typography>

      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* FIELD DETAILS */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Field & Season Details" />
              <CardContent>
                <Stack spacing={2}>
                  <TextField
                    select
                    fullWidth
                    label="Select Land"
                    value={selectedLandId}
                    onChange={(e) => setSelectedLandId(e.target.value)}
                    error={!!errors.land}
                    helperText={errors.land}
                  >
                    {lands.map((l) => (
                      <MenuItem key={l.id} value={l.id}>
                        Land #{l.id} — {l.land_area} acres
                      </MenuItem>
                    ))}
                  </TextField>

                  {selectedLand && (
                    <Typography>
                      Used: {usedForThisLand} / {landAreaAcres} acres — Remaining:{" "}
                      {remainingForLand} acres
                    </Typography>
                  )}

                  {isOverAllocated && (
                    <Typography color="error" fontWeight={600}>
                      🚫 You allocated more acres than available!
                    </Typography>
                  )}

                  <Divider />

                  <TextField
                    select
                    fullWidth
                    label="Soil Type"
                    value={soilType}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSoilType(value);
                      // recalc yield for all rows with new soil
                      rows.forEach((_, idx) => {
                        recalcRow(idx, {}, { soilType: value });
                      });
                    }}
                    disabled={isDisabledForm}
                    error={!!errors.soil}
                    helperText={errors.soil}
                  >
                    {SOIL_TYPES.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    fullWidth
                    label="Season"
                    value={season}
                    onChange={(e) => {
                      const value = e.target.value;
                      setSeason(value);
                      rows.forEach((_, idx) => {
                        recalcRow(idx, {}, { season: value });
                      });
                    }}
                    disabled={isDisabledForm}
                    error={!!errors.season}
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
                    fullWidth
                    label="Irrigation Type"
                    value={irrigationType}
                    onChange={(e) => {
                      const value = e.target.value;
                      setIrrigationType(value);
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

                  <TextField
                    fullWidth
                    multiline
                    label="Notes"
                    minRows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={isDisabledForm}
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* CROP ALLOCATION */}
          <Grid item xs={12}>
            <Card>
              <CardHeader
                title={`Crop Allocation — Remaining: ${remainingForLand} acres`}
              />
              <CardContent>
                <Stack spacing={2}>
                  {rows.map((r, i) => (
                    <Box
                      key={i}
                      sx={{
                        p: 2,
                        border: "1px solid #ddd",
                        borderRadius: 2,
                      }}
                    >
                      <Stack spacing={1}>
                        <TextField
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

                        {/* AUTO Expected Harvest Date (read-only) */}
                        <TextField
                          type="date"
                          fullWidth
                          label="Expected Harvest Date (auto)"
                          InputLabelProps={{ shrink: true }}
                          value={r.expectedHarvestDate}
                          disabled
                        />

                        {/* AUTO Expected Yield (read-only, quintals) */}
                        <TextField
                          fullWidth
                          label="Expected Yield (approx, quintals)"
                          value={r.expectedYield}
                          disabled
                        />

                        <Button
                          color="error"
                          size="small"
                          variant="text"
                          startIcon={<DeleteIcon />}
                          onClick={() =>
                            setRows((prev) =>
                              prev.filter((_, idx) => idx !== i)
                            )
                          }
                          disabled={rows.length === 1 || isDisabledForm}
                        >
                          Remove
                        </Button>
                      </Stack>
                    </Box>
                  ))}

                  <Button
                    startIcon={<AddCircleOutlineIcon />}
                    variant="outlined"
                    fullWidth
                    onClick={() => setRows((prev) => [...prev, EMPTY_ROW])}
                    disabled={remainingForLand <= 0 || isDisabledForm}
                  >
                    Add another crop
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* ACTION BUTTONS */}
          <Grid item xs={12}>
            <Divider />
            <Stack direction="row" justifyContent="flex-end" spacing={2} mt={2}>
              <Button variant="outlined" onClick={() => navigate("/farmer/land")}>
                Cancel
              </Button>
              <Button
                variant="contained"
                type="submit"
                disabled={saving || isOverAllocated}
              >
                {saving ? "Saving..." : "Save Crop Plan"}
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
}
