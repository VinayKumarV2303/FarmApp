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
import { getFarmerPlans } from "../../api/alphaApi";
import api from "../../api/axios"; // same axios instance used in LandDetails.js

const getStatusColor = (status) => {
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

const getStatusLabel = (status) => {
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

const ProfilePage = () => {
  const { user, loading: authLoading } = useAuth();

  const [lands, setLands] = useState([]);    // ✅ full lands list
  const [plans, setPlans] = useState([]);    // crop plans
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setError("");
        setLoading(true);

        // Get crops + land in parallel
        const [plansRes, landRes] = await Promise.all([
          getFarmerPlans(user.id),
          api.get("/farmer/land/"),
        ]);

        // crop plans
        setPlans(Array.isArray(plansRes.data) ? plansRes.data : plansRes.data ? [plansRes.data] : []);

        // lands
        const landArray = Array.isArray(landRes.data)
          ? landRes.data
          : landRes.data
          ? [landRes.data]
          : [];
        setLands(landArray);   // ✅ keep whole array (no second overwrite)
      } catch (err) {
        console.error("Profile page load error:", err);
        setError("Could not load your profile details right now.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [authLoading, user]);

  const farmerName = user?.name || user?.username || "Farmer";
  const initials = farmerName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // ✅ Only approved lands
  const approvedLands = lands.filter(
    (l) => l.approval_status === "approved"
  );

  // Summary metrics
  const totalLandArea = approvedLands.reduce(
    (sum, land) => sum + (Number(land.land_area) || 0),
    0
  );

  const totalPlannedArea = plans.reduce(
    (sum, plan) =>
      sum +
      Number(
        plan.area ||
          plan.land_area ||
          plan.acres ||
          0
      ),
    0
  );

  const ProfileSkeleton = () => (
    <Box>
      <Card
        sx={{
          mb: 3,
          borderRadius: 3,
          boxShadow: 2,
        }}
      >
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <Skeleton variant="circular" width={56} height={56} />
            <Box sx={{ flexGrow: 1 }}>
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="text" width="70%" />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, boxShadow: 1 }}>
            <CardContent>
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="rectangular" height={140} sx={{ mt: 2 }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: 3, boxShadow: 1 }}>
            <CardContent>
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="rectangular" height={140} sx={{ mt: 2 }} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );

  if (authLoading || loading) {
    return <ProfileSkeleton />;
  }

  if (!user) {
    return (
      <Typography sx={{ mt: 2 }}>
        Please login again.
      </Typography>
    );
  }

  return (
    <Box>
      {/* Header: Farmer basic info */}
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

            <Box sx={{ flexGrow: 1, minWidth: 180 }}>
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                {farmerName}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Your profile, land and crop overview at a glance.
              </Typography>

              {/* Summary row */}
              <Stack
                direction="row"
                spacing={1}
                sx={{ mt: 1 }}
                flexWrap="wrap"
              >
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

            <Stack
              direction={isMobile ? "row" : "row"}
              spacing={2}
              flexWrap="wrap"
              justifyContent={isMobile ? "flex-start" : "flex-end"}
            >
              <Stack spacing={0.3}>
                <Typography variant="caption" color="text.secondary">
                  Phone
                </Typography>
                <Typography variant="body2">
                  {user.phone || "-"}
                </Typography>
              </Stack>
              <Stack spacing={0.3}>
                <Typography variant="caption" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body2">
                  {user.email || "-"}
                </Typography>
              </Stack>
              <Stack spacing={0.3}>
                <Typography variant="caption" color="text.secondary">
                  Crop Plans
                </Typography>
                <Typography variant="body2">
                  {plans.length}
                </Typography>
              </Stack>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {/* Two-column layout: crops left, land right */}
      <Grid container spacing={3}>
        {/* LEFT: Crop details */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: "100%",
              borderRadius: 3,
              boxShadow: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <CardContent sx={{ pb: 1.5 }}>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1.5 }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <GrainIcon fontSize="small" />
                  <Typography variant="h6">
                    Crop Details
                  </Typography>
                </Stack>
                <Chip
                  label={`${plans.length} plan${
                    plans.length === 1 ? "" : "s"
                  }`}
                  size="small"
                  sx={{ fontSize: "0.75rem" }}
                />
              </Stack>

              {plans.length === 0 ? (
                <Typography color="text.secondary">
                  No crop plans added yet. Add crop plans from your
                  dashboard or planning section.
                </Typography>
              ) : (
                <Box
                  sx={{
                    maxHeight: 360,
                    overflowY: "auto",
                    pr: 0.5,
                  }}
                >
                  <Stack spacing={1.5}>
                    {plans.map((plan) => {
                      const cropName =
                        plan.crop_name ||
                        plan.crop?.name ||
                        plan.crop ||
                        "Crop";
                      const season =
                        plan.season_name ||
                        plan.season ||
                        plan.season_label;
                      const area =
                        plan.area || plan.land_area || plan.acres;
                      const status =
                        plan.status || plan.plan_status || "";

                      return (
                        <Card
                          key={plan.id}
                          variant="outlined"
                          sx={{
                            borderRadius: 2,
                            borderStyle: "dashed",
                            transition:
                              "box-shadow 0.15s ease, transform 0.15s ease",
                            "&:hover": {
                              boxShadow: 3,
                              transform: "translateY(-2px)",
                            },
                          }}
                        >
                          <CardContent sx={{ py: 1.5 }}>
                            <Stack
                              direction="row"
                              justifyContent="space-between"
                              alignItems="center"
                            >
                              <Typography
                                variant="subtitle1"
                                sx={{ fontWeight: 500 }}
                              >
                                {cropName}
                              </Typography>
                              {status && (
                                <Chip
                                  label={status}
                                  size="small"
                                  sx={{
                                    textTransform: "capitalize",
                                  }}
                                />
                              )}
                            </Stack>

                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 0.5 }}
                            >
                              {season && `Season: ${season}`}
                              {season && area ? " • " : ""}
                              {area && `Area: ${area} acres`}
                            </Typography>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* RIGHT: Land details – only approved lands */}
        <Grid item xs={12} md={6}>
          <Card
            sx={{
              height: "100%",
              borderRadius: 3,
              boxShadow: 1,
            }}
          >
            <CardContent>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1.5 }}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <AgricultureIcon fontSize="small" />
                  <Typography variant="h6">
                    Land Details
                  </Typography>
                </Stack>

                <Chip
                  label={`${approvedLands.length} approved`}
                  size="small"
                />
              </Stack>

              {approvedLands.length === 0 ? (
                lands.length > 0 ? (
                  <Stack direction="row" spacing={1}>
                    <WarningAmberIcon fontSize="small" sx={{ mt: "2px" }} />
                    <Typography color="text.secondary">
                      Your land records are added but not approved yet.
                      Once approved, they will appear here with total
                      approved area.
                    </Typography>
                  </Stack>
                ) : (
                  <Typography color="text.secondary">
                    Land details are not added yet. Please complete your
                    land profile.
                  </Typography>
                )
              ) : (
                <Box>
                  {/* Summary */}
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1.5 }}
                  >
                    Total approved land area:{" "}
                    <strong>{totalLandArea} acres</strong>
                  </Typography>

                  <Stack spacing={1.5}>
                    {approvedLands.map((land) => (
                      <Card
                        key={land.id}
                        variant="outlined"
                        sx={{ borderRadius: 2 }}
                      >
                        <CardContent sx={{ py: 1.5 }}>
                          <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{ mb: 1 }}
                          >
                            <Typography
                              variant="subtitle1"
                              sx={{ fontWeight: 500 }}
                            >
                              Land #{land.id}
                            </Typography>
                            <Chip
                              size="small"
                              label={getStatusLabel(land.approval_status)}
                              color={getStatusColor(land.approval_status)}
                            />
                          </Stack>

                          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                            <LocationOnIcon
                              fontSize="small"
                              sx={{ mt: "2px" }}
                            />
                            <Box>
                              <Typography variant="body2">
                                <strong>Village:</strong>{" "}
                                {land.village || "-"}
                              </Typography>
                              <Typography variant="body2">
                                <strong>District:</strong>{" "}
                                {land.district || "-"}
                              </Typography>
                              <Typography variant="body2">
                                <strong>State:</strong> {land.state || "-"}
                              </Typography>
                            </Box>
                          </Stack>

                          <Divider sx={{ my: 1 }} />

                          <Stack direction="row" spacing={1}>
                            <LandscapeIcon
                              fontSize="small"
                              sx={{ mt: "2px" }}
                            />
                            <Box>
                              <Typography variant="body2">
                                <strong>Area:</strong>{" "}
                                {land.land_area || 0} acres
                              </Typography>
                              <Typography variant="body2">
                                <strong>Soil Type:</strong>{" "}
                                {land.soil_type || "-"}
                              </Typography>
                              <Typography variant="body2">
                                <strong>Irrigation Type:</strong>{" "}
                                {land.irrigation_type || "-"}
                              </Typography>
                            </Box>
                          </Stack>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ProfilePage;
