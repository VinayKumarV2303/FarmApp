// src/pages/farmer/LandDetails.js
import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Button,
  Grid,
  Divider,
  Skeleton,
  Box,
  Alert,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";

const getStatusColor = (rawStatus) => {
  const status = (rawStatus || "").toLowerCase();
  switch (status) {
    case "approved":
      return "success";
    case "rejected":
      return "error";
    case "pending":
    default:
      return "warning";
  }
};

const getStatusLabel = (rawStatus) => {
  const status = (rawStatus || "").toLowerCase();
  switch (status) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "pending":
    default:
      return "Pending";
  }
};

const LandDetails = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [lands, setLands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading || !user) return;

    const fetchLand = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await api.get("/farmer/land/");
        const data = res.data;

        // API might return a single object or an array
        const landArray = Array.isArray(data) ? data : data ? [data] : [];
        setLands(landArray);
      } catch (err) {
        console.error("Failed to fetch land details", err);
        setLands([]);
        setError("Couldn't load land records. Please try again in a while.");
      } finally {
        setLoading(false);
      }
    };

    fetchLand();
  }, [authLoading, user]);

  if (authLoading || !user) return null;

  // Total area of approved lands
  const totalArea = lands
    .filter(
      (land) => (land.approval_status || "").toLowerCase() === "approved"
    )
    .reduce((sum, land) => sum + (Number(land.land_area) || 0), 0);

  // ✅ updated paths to match App.js
  const handleEdit = (id) => navigate(`/farmer/lands/${id}/edit`);
  const handleAdd = () => navigate(`/farmer/lands/add`);

  const renderLoadingState = () => (
    <Grid container spacing={2}>
      {[1, 2].map((i) => (
        <Grid item xs={12} key={i}>
          <Skeleton variant="rounded" height={120} />
        </Grid>
      ))}
    </Grid>
  );

  const renderEmptyState = () => (
    <Box
      sx={{
        textAlign: "center",
        py: 3,
        px: 1,
      }}
    >
      <Typography variant="body2" color="text.secondary">
        No land added yet.
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        Click <strong>Add Land</strong> to register your first land record.
      </Typography>
      <Button
        variant="contained"
        size="small"
        sx={{ mt: 2 }}
        onClick={handleAdd}
      >
        + Add Land
      </Button>
    </Box>
  );

  // Stable ordering for display (oldest first, fallback to id)
  const sortedLands = lands
    .slice()
    .sort((a, b) => {
      const ta = new Date(a.created_at || 0).getTime();
      const tb = new Date(b.created_at || 0).getTime();
      if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) {
        return ta - tb;
      }
      return (a.id || 0) - (b.id || 0);
    });

  return (
    <Card elevation={4} sx={{ borderRadius: 3 }}>
      <CardContent>
        {/* Header */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="h6" fontWeight={600}>
              My Land Records 🧑‍🌾
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your farm lands and keep them ready for approval.
            </Typography>

            {lands.length > 0 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5, display: "block" }}
              >
                Total approved area: <strong>{totalArea}</strong> acres
              </Typography>
            )}
          </Box>

          <Button variant="contained" size="small" onClick={handleAdd}>
            + Add Land
          </Button>
        </Stack>

        <Divider sx={{ mb: 2 }} />

        {/* Error state */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Main content */}
        {loading && renderLoadingState()}

        {!loading && lands.length === 0 && renderEmptyState()}

        {!loading && lands.length > 0 && (
          <Grid container spacing={2}>
            {sortedLands.map((land, index) => (
              <Grid item xs={12} key={land.id}>
                <Card variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent>
                    <Stack
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                    >
                      <Box>
                        {/* UI label: Land #1, Land #2, ... (not DB id) */}
                        <Typography variant="subtitle1" fontWeight={600}>
                          Land #{index + 1}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(land.village || "-") +
                            (land.district ? `, ${land.district}` : "")}
                        </Typography>
                      </Box>

                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          size="small"
                          label={getStatusLabel(land.approval_status)}
                          color={getStatusColor(land.approval_status)}
                        />
                        <Button
                          size="small"
                          onClick={() => handleEdit(land.id)}
                        >
                          Edit
                        </Button>
                      </Stack>
                    </Stack>

                    {/* Admin remark (for rejected) */}
                    {land.admin_remark &&
                      (land.approval_status || "").toLowerCase() ===
                        "rejected" && (
                        <Typography
                          color="error"
                          variant="body2"
                          sx={{ mt: 1 }}
                        >
                          {land.admin_remark}
                        </Typography>
                      )}

                    <Divider sx={{ my: 1.5 }} />

                    {/* Basic details */}
                    <Grid container spacing={1}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2">
                          <strong>State:</strong> {land.state || "-"}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2">
                          <strong>Area:</strong>{" "}
                          {land.land_area != null ? land.land_area : 0} acres
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </CardContent>
    </Card>
  );
};

export default LandDetails;
