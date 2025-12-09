// src/pages/farmer/ProfilePage.js
import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Avatar,
  useMediaQuery,
  useTheme,
  Skeleton,
} from "@mui/material";
import LandscapeIcon from "@mui/icons-material/Landscape";
import GrainIcon from "@mui/icons-material/Grain";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";

const getStatusColor = (status) => {
  const s = (status || "").toLowerCase();
  switch (s) {
    case "approved":
      return "success";
    case "rejected":
      return "error";
    default:
      return "warning";
  }
};

const ProfilePage = () => {
  const { user, loading: authLoading } = useAuth();

  const [lands, setLands] = useState([]);
  const [cropPlans, setCropPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    if (!user || authLoading) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get("/farmer/profile/");
        setLands(res.data.lands || []);
        setCropPlans(res.data.crop_plans || []);
      } catch (err) {
        console.error("Profile load error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user, authLoading]);

  // approved lands, sorted
  const approvedLands = useMemo(
    () =>
      lands
        .filter(
          (l) => (l.approval_status || "").toLowerCase() === "approved"
        )
        .sort((a, b) => {
          const ta = new Date(a.created_at || 0).getTime();
          const tb = new Date(b.created_at || 0).getTime();
          if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) {
            return ta - tb;
          }
          return (a.id || 0) - (b.id || 0);
        }),
    [lands]
  );

  const totalLandArea = approvedLands.reduce(
    (sum, l) => sum + (Number(l.land_area) || 0),
    0
  );

  // only approved crop plans
  const approvedCropPlans = useMemo(
    () =>
      cropPlans.filter(
        (c) => (c.approval_status || "").toLowerCase() === "approved"
      ),
    [cropPlans]
  );

  const totalPlannedArea = approvedCropPlans.reduce(
    (sum, c) =>
      sum +
      (Number(
        c.acres ??
          c.area ??
          c.planned_area ??
          c.total_acres_allocated ??
          0
      ) || 0),
    0
  );

  const farmerName = user?.name || user?.username || "Farmer";
  const initials = farmerName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // group approved crops by land id
  const cropsByLand = useMemo(() => {
    const groups = {};
    approvedCropPlans.forEach((c) => {
      const landId = c.land_id;
      if (!landId) return;
      if (!groups[landId]) groups[landId] = [];
      groups[landId].push(c);
    });
    return groups;
  }, [approvedCropPlans]);

  const ProfileSkeleton = () => (
    <Card sx={{ mb: 3, borderRadius: 3, boxShadow: 2 }}>
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Skeleton variant="circular" width={56} height={56} />
          <Box sx={{ flexGrow: 1 }}>
            <Skeleton variant="text" width="40%" />
            <Skeleton variant="text" width="60%" />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );

  if (!user) {
    return <Typography sx={{ mt: 2 }}>Please login again.</Typography>;
  }

  if (loading || authLoading) {
    return <ProfileSkeleton />;
  }

  return (
    <Box>
      {/* Header card */}
      <Card
        sx={{
          mb: 3,
          borderRadius: 3,
          boxShadow: 2,
          background: "linear-gradient(135deg, #e3f2fd, #e8f5e9)",
        }}
      >
        <CardContent>
          <Stack
            direction={isMobile ? "column" : "row"}
            spacing={2}
            alignItems={isMobile ? "flex-start" : "center"}
            flexWrap="wrap"
          >
            <Avatar
              sx={{
                bgcolor: "#0d6efd",
                width: 56,
                height: 56,
                fontSize: 24,
                fontWeight: 600,
              }}
            >
              {initials}
            </Avatar>

            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                {farmerName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your profile, land and crop overview at a glance.
              </Typography>

              <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap">
                <Chip
                  size="small"
                  label={`Approved land: ${totalLandArea} acres`}
                  icon={<LandscapeIcon sx={{ fontSize: "1rem" }} />}
                />
                <Chip
                  size="small"
                  label={`Crops planned: ${totalPlannedArea.toFixed(
                    2
                  )} acres`}
                  icon={<GrainIcon sx={{ fontSize: "1rem" }} />}
                />
              </Stack>
            </Box>

            <Stack direction="row" spacing={3}>
              <Stack spacing={0.3}>
                <Typography variant="caption">Phone</Typography>
                <Typography variant="body2">{user.phone || "-"}</Typography>
              </Stack>

              <Stack spacing={0.3}>
                <Typography variant="caption">
                  Approved crop entries
                </Typography>
                <Typography variant="body2">
                  {approvedCropPlans.length}
                </Typography>
              </Stack>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Crops grouped by land */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card sx={{ borderRadius: 3, boxShadow: 1 }}>
            <CardContent>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ mb: 1.5 }}
              >
                <GrainIcon fontSize="small" />
                <Typography variant="h6">Crop Details</Typography>
              </Stack>

              {approvedLands.length === 0 ? (
                <Typography color="text.secondary">
                  No approved lands yet.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  {approvedLands.map((land, landIndex) => {
                    const crops = cropsByLand[land.id] || [];
                    const landStatusRaw = (
                      land.approval_status || "approved"
                    ).toLowerCase();
                    const landStatusLabel =
                      landStatusRaw.charAt(0).toUpperCase() +
                      landStatusRaw.slice(1);

                    return (
                      <Card
                        key={land.id}
                        variant="outlined"
                        sx={{ borderRadius: 2 }}
                      >
                        <CardContent sx={{ py: 1.5 }}>
                          {/* Land header */}
                          <Box
                            sx={{
                              bgcolor: "#e3f2fd",
                              p: 1.5,
                              borderRadius: 2,
                              border: "1px solid #bbdefb",
                              mb: 1.5,
                            }}
                          >
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                            >
                              <Box>
                                <Typography
                                  variant="subtitle1"
                                  fontWeight={700}
                                  sx={{ color: "#0d47a1" }}
                                >
                                  Land #{landIndex + 1}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  sx={{ color: "#01579b", fontWeight: 500 }}
                                >
                                  {land.village || "-"},{" "}
                                  {land.district || ""} {land.state || ""}
                                </Typography>
                              </Box>

                              <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                              >
                                <Chip
                                  size="small"
                                  label={landStatusLabel}
                                  color={getStatusColor(landStatusRaw)}
                                  sx={{ fontWeight: 600 }}
                                />
                                <Chip
                                  size="small"
                                  variant="outlined"
                                  label={`${crops.length} crop${
                                    crops.length === 1 ? "" : "s"
                                  }`}
                                  sx={{ fontWeight: 600 }}
                                />
                              </Stack>
                            </Stack>
                          </Box>

                          {/* Crops inside this land */}
                          {crops.length === 0 ? (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                            >
                              No approved crop plans yet for this land.
                            </Typography>
                          ) : (
                            <Stack spacing={1}>
                              {crops.map((c) => {
                                const acres =
                                  c.acres ??
                                  c.area ??
                                  c.planned_area ??
                                  c.total_acres_allocated ??
                                  0;

                                return (
                                  <Stack
                                    key={c.id}
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="center"
                                  >
                                    <Box>
                                      {/* Crop name only */}
                                      <Typography sx={{ fontWeight: 700 }}>
                                        {c.crop_name || "Crop"}
                                      </Typography>

                                      <Typography
                                        variant="body2"
                                        color="text.secondary"
                                      >
                                        {Number(acres).toFixed(2)} acres
                                        {c.season ? ` • ${c.season}` : ""}
                                      </Typography>
                                    </Box>

                                    <Chip
                                      size="small"
                                      label="Approved"
                                      color="success"
                                    />
                                  </Stack>
                                );
                              })}
                            </Stack>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProfilePage;
