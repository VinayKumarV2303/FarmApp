import React, { useEffect, useState } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Stack,
  Chip,
  Avatar,
  Divider,
  useMediaQuery,
  useTheme,
  Skeleton,
} from "@mui/material";
import AgricultureIcon from "@mui/icons-material/Agriculture";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import LandscapeIcon from "@mui/icons-material/Landscape";
import GrainIcon from "@mui/icons-material/Grain";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";

const getStatusColor = (status) => {
  switch (status) {
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

  // ===== Load profile from /farmer/profile/ =====
  useEffect(() => {
    if (!user || authLoading) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await api.get("/farmer/profile/");
        console.log("PROFILE DATA:", res.data);

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

  if (!user) return <Typography sx={{ mt: 2 }}>Please login again.</Typography>;

  // -----------------------
  // Summary calculations
  // -----------------------
  const approvedLands = lands.filter((l) => l.approval_status === "approved");

  const totalLandArea = approvedLands.reduce(
    (sum, l) => sum + (Number(l.land_area) || 0),
    0
  );

  const totalPlannedArea = cropPlans.reduce(
    (sum, p) => sum + (Number(p.total_acres_allocated) || 0),
    0
  );

  const farmerName = user?.name || user?.username || "Farmer";
  const initials = farmerName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // -----------------------
  // Loading skeleton
  // -----------------------
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

  if (loading || authLoading) return <ProfileSkeleton />;

  return (
    <Box>
      {/* HEADER Profile Card */}
      <Card
        sx={{
          mb: 3,
          borderRadius: 3,
          boxShadow: 2,
          background: "linear-gradient(135deg, #e3f2fd 0%, #e8f5e9 100%)",
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
                  label={`Total land (approved): ${totalLandArea} acres`}
                  icon={<LandscapeIcon sx={{ fontSize: "1rem" }} />}
                />
                <Chip
                  size="small"
                  label={`Planned area: ${totalPlannedArea} acres`}
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
                <Typography variant="caption">Crop Plans</Typography>
                <Typography variant="body2">{cropPlans.length}</Typography>
              </Stack>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* -------- Main panels -------- */}
      <Grid container spacing={3}>
        {/* 🥬 Crop Details */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, boxShadow: 1 }}>
            <CardContent>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1.5 }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <GrainIcon fontSize="small" />
                  <Typography variant="h6">Crop Details</Typography>
                </Stack>
                <Chip label={`${cropPlans.length} plans`} size="small" />
              </Stack>

              {cropPlans.length === 0 ? (
                <Typography color="text.secondary">
                  No crop plans added yet. Add crop plans from your dashboard.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {cropPlans.map((p) => (
                    <Card key={p.id} variant="outlined" sx={{ borderRadius: 2 }}>
                      <CardContent sx={{ py: 1.5 }}>
                        <Typography sx={{ fontWeight: 600 }}>
                          Season: {p.season}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total acres: {p.total_acres_allocated}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* 🚜 Land Details */}
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, boxShadow: 1 }}>
            <CardContent>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1.5 }}
              >
                <Stack direction="row" spacing={1}>
                  <AgricultureIcon fontSize="small" />
                  <Typography variant="h6">Land Details</Typography>
                </Stack>
                <Chip
                  label={`${approvedLands.length} approved`}
                  size="small"
                />
              </Stack>

              {approvedLands.length === 0 ? (
                <Typography color="text.secondary">
                  No approved lands yet.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {approvedLands.map((l) => (
                    <Card key={l.id} variant="outlined" sx={{ borderRadius: 2 }}>
                      <CardContent sx={{ py: 1.5 }}>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          sx={{ mb: 1 }}
                        >
                          <Typography variant="subtitle1" fontWeight={600}>
                            Land #{l.id}
                          </Typography>
                          <Chip
                            size="small"
                            label={l.approval_status}
                            color={getStatusColor(l.approval_status)}
                          />
                        </Stack>

                        <Typography variant="body2">
                          Village: {l.village}
                        </Typography>
                        <Typography variant="body2">
                          District: {l.district}
                        </Typography>
                        <Typography variant="body2">State: {l.state}</Typography>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="body2">
                          Area: {l.land_area} acres
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
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
