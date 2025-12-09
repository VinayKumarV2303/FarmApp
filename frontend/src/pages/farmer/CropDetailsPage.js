// src/pages/farmer/CropDetailsPage.js
// (only showing full file with the one changed line)

import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Box,
  Button,
} from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import GrainIcon from "@mui/icons-material/Grain";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { useAuth } from "../../context/AuthContext";

const getStatusColor = (rawStatus) => {
  const status = (rawStatus || "").toLowerCase();
  switch (status) {
    case "approved":
      return "success";
    case "rejected":
      return "error";
    default:
      return "warning";
  }
};

const getStatusLabel = (rawStatus) => {
  const status = (rawStatus || "").toLowerCase();
  return status.charAt(0).toUpperCase() + status.slice(1);
};

// hide fallback names like "Crop plan #29"
const getCropDisplayName = (rawName) => {
  if (!rawName) return "";
  const name = String(rawName);
  if (name.trim().toLowerCase().startsWith("crop plan #")) return "";
  return name;
};

const CropDetailsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.token) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const res = await api.get("/farmer/profile/");
        const all = res.data.crop_plans || [];
        setCrops(all);
      } catch (err) {
        console.error("Crops load failed:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  if (!user?.token) {
    return (
      <Typography color="text.secondary">
        Please login to view your crop details.
      </Typography>
    );
  }

  if (loading) return <Typography>Loading...</Typography>;

  const approvedCount = crops.filter(
    (c) => (c.approval_status || "").toLowerCase() === "approved"
  ).length;

  const sortedCrops = crops
    .slice()
    .sort((a, b) => {
      const ta = new Date(a.created_at || 0).getTime();
      const tb = new Date(b.created_at || 0).getTime();
      if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return ta - tb;
      return (a.id || 0) - (b.id || 0);
    });

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <GrainIcon fontSize="small" />
        <Typography variant="h5" fontWeight={600}>
          Crop Details
        </Typography>
        <Chip label={`${approvedCount} approved`} size="small" color="success" />
      </Stack>

      {/* Add Crop Button */}
      <Box sx={{ textAlign: "right", mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddCircleIcon />}
          // ✅ open CropPlanPage here
          onClick={() => navigate("/farmer/crop-plan")}
        >
          Add Crop Plan
        </Button>
      </Box>

      {/* No Crops */}
      {sortedCrops.length === 0 ? (
        <Typography color="text.secondary">
          No crop plans added yet. Click "Add Crop Plan" to get started.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {sortedCrops.map((c, index) => {
            const acres = Number(
              c.acres ??
                c.area ??
                c.planned_area ??
                c.total_acres_allocated ??
                0
            );

            const status = (c.approval_status || "").toLowerCase();
            const displayName = getCropDisplayName(c.crop_name);

            return (
              <Card key={c.id} variant="outlined" sx={{ borderRadius: 2 }}>
                <CardContent sx={{ py: 1.5 }}>
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 700 }}>
                        Crop #{index + 1}
                      </Typography>

                      {displayName && (
                        <Typography sx={{ fontWeight: 500 }}>
                          {displayName}
                        </Typography>
                      )}
                    </Box>

                    <Chip
                      label={getStatusLabel(status)}
                      size="small"
                      color={getStatusColor(status)}
                    />
                  </Stack>

                  <Typography variant="body2" color="text.secondary">
                    Land used: {acres.toFixed(2)} acres
                  </Typography>

                  {c.land_village && (
                    <Typography variant="body2" color="text.secondary">
                      Location: {c.land_village}
                      {c.land_district ? `, ${c.land_district}` : ""}
                      {c.land_state ? `, ${c.land_state}` : ""}
                    </Typography>
                  )}

                  {(c.season || c.soil_type || c.irrigation_type) && (
                    <Typography variant="caption" color="text.secondary">
                      {c.season && `Season: ${c.season}`}
                      {c.soil_type && ` • Soil: ${c.soil_type}`}
                      {c.irrigation_type &&
                        ` • Irrigation: ${c.irrigation_type}`}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}
    </Box>
  );
};

export default CropDetailsPage;
