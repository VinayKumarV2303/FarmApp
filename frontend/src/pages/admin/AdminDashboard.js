// src/pages/admin/AdminDashboard.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Stack,
  LinearProgress,
  Chip,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Paper,
  Button,
} from "@mui/material";

import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import ChecklistIcon from "@mui/icons-material/Checklist";
import MapIcon from "@mui/icons-material/Map";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import PendingActionsIcon from "@mui/icons-material/PendingActions";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";

import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get("/adminpanel/api/dashboard/");
      setStats(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load admin analytics. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const profileCompletionRate = useMemo(() => {
    if (!stats || !stats.total_farmers) return 0;
    return Math.round((stats.profiles_completed / stats.total_farmers) * 100);
  }, [stats]);

  const pendingCount = stats?.farmer_approval_summary?.Pending ?? 0;
  const approvedCount = stats?.farmer_approval_summary?.Approved ?? 0;
  const rejectedCount = stats?.farmer_approval_summary?.Rejected ?? 0;

  const chartDataBar = useMemo(() => {
    if (!stats) return null;
    return {
      labels: stats.chart_labels || [],
      datasets: [
        {
          label: "Farmers",
          data: stats.chart_values || [],
          borderWidth: 1,
        },
      ],
    };
  }, [stats]);

  const chartDataPie = useMemo(() => {
    if (!stats) return null;
    const total =
      (stats.chart_values || []).reduce((acc, v) => acc + (v || 0), 0) || 1;
    const percentages = (stats.chart_values || []).map((v) =>
      Math.round((v / total) * 100)
    );
    return {
      labels: stats.chart_labels || [],
      datasets: [
        {
          label: "Share (%)",
          data: percentages,
          borderWidth: 1,
        },
      ],
    };
  }, [stats]);

  const chartOptionsBar = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        ticks: {
          maxRotation: 60,
          minRotation: 0,
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
    plugins: {
      legend: { display: false },
    },
  };

  const chartOptionsPie = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
    },
  };

  const pendingFarmers = stats?.pending_farmers || [];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f7fb", p: { xs: 2, md: 3 } }}>
      <Box
        sx={{
          mb: 3,
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", md: "center" },
          gap: 1,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Admin Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Overview of users, farmers, approvals and region-wise distribution.
          </Typography>
        </Box>

        {stats && (
          <Stack direction="row" spacing={1}>
            <Chip
              label={`Users: ${stats.total_users ?? 0}`}
              variant="outlined"
              size="small"
            />
            <Chip
              label={`Farmers: ${stats.total_farmers ?? 0}`}
              variant="outlined"
              size="small"
              color="primary"
            />
          </Stack>
        )}
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {error && (
        <Card sx={{ mb: 3, borderLeft: "4px solid", borderColor: "error.main", bgcolor: "#fff" }}>
          <CardContent>
            <Typography color="error.main" fontWeight={600}>
              {error}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Ensure backend is running at <code>localhost:8000</code>.
            </Typography>
          </CardContent>
        </Card>
      )}

      {!stats || loading ? null : (
        <>
          {/* Metric Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {/* Total Farmers + NEW LINK */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 3, boxShadow: 2, height: "100%" }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between">
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        TOTAL FARMERS
                      </Typography>
                      <Typography variant="h5" fontWeight={700}>
                        {stats.total_farmers ?? 0}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        bgcolor: "primary.main",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <PeopleAltIcon fontSize="small" />
                    </Box>
                  </Stack>

                  <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
                    All registered farmer accounts.
                  </Typography>

                  {/* NEW BUTTON */}
                  <Button
                    size="small"
                    variant="text"
                    sx={{ mt: 0.5, p: 0, textTransform: "none" }}
                    onClick={() =>
                      window.open("http://localhost:8000/admin/farmer/farmer/", "_blank")
                    }
                  >
                    View all details →
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* Completion */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between">
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        PROFILES COMPLETED
                      </Typography>
                      <Typography variant="h5" fontWeight={700}>
                        {stats.profiles_completed}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        bgcolor: "success.main",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ChecklistIcon fontSize="small" />
                    </Box>
                  </Stack>
                  <Typography variant="body2" sx={{ mt: 1 }} color="text.secondary">
                    {profileCompletionRate}% have full profiles.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Approval Summary */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    APPROVALS
                  </Typography>
                  <Stack direction="row" gap={2} sx={{ mt: 1 }}>
                    <Stack><b>Pending</b> {pendingCount}</Stack>
                    <Stack><b>Approved</b> {approvedCount}</Stack>
                    <Stack><b>Rejected</b> {rejectedCount}</Stack>
                  </Stack>
                  <Button
                    size="small"
                    sx={{ mt: 1, textTransform: "none" }}
                    variant="outlined"
                    startIcon={<AssignmentTurnedInIcon />}
                    onClick={() => navigate("/admin/approvals")}
                  >
                    Manage approvals
                  </Button>
                </CardContent>
              </Card>
            </Grid>

            {/* Districts */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 3, boxShadow: 2 }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between">
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        ACTIVE DISTRICTS
                      </Typography>
                      <Typography variant="h5" fontWeight={700}>
                        {stats.farmers_by_district?.length}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        bgcolor: "secondary.main",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <MapIcon fontSize="small" />
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Pending Preview */}
          <Paper sx={{ borderRadius: 3, boxShadow: 2 }}>
            <Box sx={{ p: 2, borderBottom: "1px solid #eee" }}>
              <Typography variant="subtitle1" fontWeight={600}>
                Pending Farmer Approvals
              </Typography>
            </Box>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Farmer</TableCell>
                  <TableCell>Village</TableCell>
                  <TableCell>District</TableCell>
                  <TableCell align="right">Land (acres)</TableCell>
                  <TableCell align="right">Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingFarmers.length ? (
                  pendingFarmers.map((f) => (
                    <TableRow key={f.id} hover>
                      <TableCell>{f.name}</TableCell>
                      <TableCell>{f.village}</TableCell>
                      <TableCell>{f.district}</TableCell>
                      <TableCell align="right">{f.land_area}</TableCell>

                      {/* Already added: Farmer details link */}
                      <TableCell align="right">
                        <Button
                          size="small"
                          sx={{ textTransform: "none" }}
                          onClick={() =>
                            window.open(
                              `http://localhost:8000/admin/farmer/farmer/${f.id}/change/`,
                              "_blank"
                            )
                          }
                        >
                          View details →
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 2 }}>
                      No pending approvals 🎉
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </>
      )}
    </Box>
  );
}
