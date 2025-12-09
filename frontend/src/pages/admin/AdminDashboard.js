// src/pages/admin/AdminDashboard.js
import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Stack,
  Divider,
} from "@mui/material";
import api from "../../api/axios";
import AdminLayout from "../../components/layout/AdminLayout";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ---------- HELPERS ----------

const getAdminHeaders = () => {
  const token = localStorage.getItem("adminToken");
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
};

const APPROVAL_COLORS = {
  Pending: "#FFA726",
  Approved: "#66BB6A",
  Rejected: "#EF5350",
};

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      setError("");
      setLoading(true);
      try {
        const res = await api.get("/adminpanel/api/dashboard/", {
          headers: getAdminHeaders(),
        });
        setStats(res.data);
      } catch (err) {
        console.error("Admin dashboard fetch error:", err.response?.data || err);
        setError(
          err.response?.data?.detail ||
            err.response?.data?.message ||
            "Failed to load dashboard data."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const farmersByDistrictData =
    stats?.farmers_by_district?.map((row) => ({
      district: row.district || "Unknown",
      farmers: row.count || 0,
    })) || [];

  const landApprovalSummaryData = stats
    ? [
        {
          name: "Pending",
          value: stats.land_approval_summary?.Pending || 0,
        },
        {
          name: "Approved",
          value: stats.land_approval_summary?.Approved || 0,
        },
        {
          name: "Rejected",
          value: stats.land_approval_summary?.Rejected || 0,
        },
      ]
    : [];

  const pendingFarmers = stats?.pending_farmers || [];

  const totalUsers = stats?.total_users ?? 0;
  const totalFarmers = stats?.total_farmers ?? 0;
  const profilesCompleted = stats?.profiles_completed ?? 0;
  const profileCompletionRate =
    totalFarmers > 0 ? Math.round((profilesCompleted / totalFarmers) * 100) : 0;

  return (
    <AdminLayout title="Admin Dashboard">
      <Box>
        <Typography variant="h5" sx={{ mb: 1 }}>
          Overview
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          User onboarding, land approvals and farmer distribution at a glance.
        </Typography>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && stats && (
          <>
            {/* ---------- TOP STATS ---------- */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={4}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      Total Users
                    </Typography>
                    <Typography variant="h4">{totalUsers}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      All accounts registered
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      Total Farmers
                    </Typography>
                    <Typography variant="h4">{totalFarmers}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Farmers with at least one land
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={4}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle2" color="text.secondary">
                      Profile Completion
                    </Typography>
                    <Typography variant="h4">
                      {profileCompletionRate}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {profilesCompleted} of {totalFarmers} farmers have
                      location details
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* ---------- CHARTS ROW ---------- */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={7}>
                <Card sx={{ height: 360 }}>
                  <CardContent sx={{ height: "100%" }}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                      Farmers by District
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mb: 2, display: "block" }}
                    >
                      Distribution of farmers across districts
                    </Typography>
                    {farmersByDistrictData.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No farmer distribution data available.
                      </Typography>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={farmersByDistrictData}
                          margin={{ top: 10, right: 10, left: -10, bottom: 40 }}
                        >
                          <XAxis
                            dataKey="district"
                            angle={-35}
                            textAnchor="end"
                            interval={0}
                            height={70}
                          />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="farmers" name="Farmers" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={5}>
                <Card sx={{ height: 360 }}>
                  <CardContent sx={{ height: "100%" }}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>
                      Land Approval Status
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mb: 2, display: "block" }}
                    >
                      Pending vs approved vs rejected lands
                    </Typography>
                    {landApprovalSummaryData.every((d) => d.value === 0) ? (
                      <Typography variant="body2" color="text.secondary">
                        No land approval data available.
                      </Typography>
                    ) : (
                      <ResponsiveContainer width="100%" height="80%">
                        <PieChart>
                          <Pie
                            data={landApprovalSummaryData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            label
                          >
                            {landApprovalSummaryData.map((entry, index) => {
                              const color =
                                APPROVAL_COLORS[entry.name] ||
                                ["#42A5F5", "#66BB6A", "#FFCA28"][
                                  index % 3
                                ];
                              return <Cell key={entry.name} fill={color} />;
                            })}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* ---------- PENDING FARMERS TABLE ---------- */}
            <Card>
              <CardContent>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  sx={{ mb: 1 }}
                >
                  <Typography variant="subtitle1">
                    Pending Farmer Approvals
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Showing up to 10 farmers with pending lands
                  </Typography>
                </Stack>
                <Divider sx={{ mb: 2 }} />

                {pendingFarmers.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No pending farmer approvals. 🎉
                  </Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Farmer</TableCell>
                        <TableCell>Phone</TableCell>
                        <TableCell>Village</TableCell>
                        <TableCell>District</TableCell>
                        <TableCell>State</TableCell>
                        <TableCell align="right">Land Area</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pendingFarmers.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell>{f.name || f.username || "-"}</TableCell>
                          <TableCell>{f.phone || "-"}</TableCell>
                          <TableCell>{f.village || "-"}</TableCell>
                          <TableCell>{f.district || "-"}</TableCell>
                          <TableCell>{f.state || "-"}</TableCell>
                          <TableCell align="right">
                            {f.land_area || "-"}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={f.approval_status || "pending"}
                              size="small"
                              sx={{
                                textTransform: "capitalize",
                                bgcolor:
                                  f.approval_status === "approved"
                                    ? "success.light"
                                    : f.approval_status === "rejected"
                                    ? "error.light"
                                    : "warning.light",
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </Box>
    </AdminLayout>
  );
}
