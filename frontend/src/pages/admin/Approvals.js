// src/pages/admin/Approvals.js
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  IconButton,
  TextField,
  MenuItem,
  Stack,
  Button,
  LinearProgress,
  Snackbar,
  Alert,
  InputAdornment,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";

import api from "../../api/axios";

const STATUS_OPTIONS = ["All", "Pending", "Approved", "Rejected"];

// backend value ('pending') -> UI label ('Pending')
const mapStatusToLabel = (raw) => {
  if (!raw) return "Pending";
  const v = String(raw).toLowerCase();
  if (v === "approved") return "Approved";
  if (v === "rejected") return "Rejected";
  return "Pending";
};

// UI label -> backend value
const labelToBackendStatus = (label) => {
  if (!label) return "pending";
  const v = String(label).toLowerCase();
  if (v === "approved") return "approved";
  if (v === "rejected") return "rejected";
  return "pending";
};

export default function Approvals() {
  const [tab, setTab] = useState(0);
  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]); // land approvals
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const closeSnack = () =>
    setSnack((s) => ({
      ...s,
      open: false,
    }));

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);

      const params =
        statusFilter === "All" ? {} : { status: statusFilter };

      const res = await api.get("/adminpanel/api/approvals/lands/", {
        params,
      });

      const raw = Array.isArray(res.data)
        ? res.data
        : res.data?.results || [];

      const normalized = raw.map((r) => ({
        id: r.id,
        name: r.farmer_name || "",
        username: r.farmer_username || "",
        phone: r.farmer_phone || "",
        village: r.village || "",
        district: r.district || "",
        state: r.state || "",
        land_area: r.land_area,
        approval_status: mapStatusToLabel(r.approval_status),
        admin_remark: r.admin_remark || "",
      }));

      setRows(normalized);
      console.log("Land approvals:", normalized);
    } catch (err) {
      console.error("Failed to fetch land approvals:", err);
      setSnack({
        open: true,
        message: "Failed to load land approvals",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  const handleChangeRemark = (id, value) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, admin_remark: value } : row
      )
    );
  };

  const updateStatus = async (landId, newStatusLabel) => {
    try {
      const row = rows.find((r) => r.id === landId);
      if (!row) return;

      if (row.approval_status === newStatusLabel) return;

      setSavingId(landId);

      const backendStatus = labelToBackendStatus(newStatusLabel);

      await api.patch(`/adminpanel/api/approvals/lands/${landId}/`, {
        approval_status: backendStatus,
        admin_remark: row.admin_remark || "",
      });

      setSnack({
        open: true,
        message: `Land marked as ${newStatusLabel}`,
        severity: "success",
      });

      await fetchRows();
    } catch (err) {
      console.error("Failed to update land approval:", err);
      setSnack({
        open: true,
        message: "Failed to update approval",
        severity: "error",
      });
    } finally {
      setSavingId(null);
    }
  };

  const statusChipColor = (statusLabel) => {
    switch (statusLabel) {
      case "Approved":
        return "success";
      case "Rejected":
        return "error";
      case "Pending":
      default:
        return "warning";
    }
  };

  // Frontend search
  const filteredRows = useMemo(() => {
    let data = rows;

    if (statusFilter !== "All") {
      data = data.filter(
        (r) => (r.approval_status || "Pending") === statusFilter
      );
    }

    const q = search.trim().toLowerCase();
    if (!q) return data;

    return data.filter((r) => {
      const fields = [
        r.name,
        r.username,
        r.village,
        r.district,
        r.state,
        r.phone,
      ]
        .filter(Boolean)
        .map((x) => String(x).toLowerCase());
      return fields.some((val) => val.includes(q));
    });
  }, [rows, statusFilter, search]);

  const hasRows = filteredRows.length > 0;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f7fb", p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 1,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Land Approvals
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Approve or reject farmer land details.
          </Typography>
        </Box>
        <IconButton onClick={fetchRows} title="Refresh" disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </Box>

      <Card sx={{ borderRadius: 2, boxShadow: 1 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="Lands" />
          <Tab label="Crop Plans (later)" />
        </Tabs>

        <CardContent>
          {tab === 0 && (
            <>
              {/* Filters */}
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                alignItems={{ xs: "stretch", md: "center" }}
                justifyContent="space-between"
                sx={{ mb: 2 }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  alignItems={{ xs: "stretch", sm: "center" }}
                >
                  <TextField
                    size="small"
                    select
                    label="Status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    sx={{ width: { xs: "100%", sm: 160 } }}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <MenuItem key={s} value={s}>
                        {s}
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    size="small"
                    label="Search (name / village / phone)"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    sx={{ width: { xs: "100%", sm: 260 } }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Stack>

                <Typography variant="body2" color="text.secondary">
                  {hasRows
                    ? `${filteredRows.length} record(s)`
                    : loading
                    ? "Loading…"
                    : "No records"}
                </Typography>
              </Stack>

              {loading && <LinearProgress sx={{ mb: 2 }} />}

              {/* Table */}
              <Box sx={{ overflowX: "auto" }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Farmer</TableCell>
                      <TableCell>Contact</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell align="right">Land Area</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell sx={{ minWidth: 200 }}>Remark</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {hasRows ? (
                      filteredRows.map((r) => {
                        const status = r.approval_status || "Pending";
                        const isPending =
                          status !== "Approved" && status !== "Rejected";
                        const isSaving = savingId === r.id;

                        return (
                          <TableRow
                            key={r.id}
                            hover
                            sx={{
                              backgroundColor: isPending
                                ? "rgba(255, 213, 79, 0.12)"
                                : "inherit",
                            }}
                          >
                            <TableCell>
                              <Typography variant="body2" fontWeight={600}>
                                {r.name || r.username}
                              </Typography>
                              {r.username && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  @{r.username}
                                </Typography>
                              )}
                            </TableCell>

                            <TableCell>
                              <Typography variant="body2">
                                {r.phone || "-"}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Typography variant="body2">
                                {r.village || "-"}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {r.district || ""} {r.state || ""}
                              </Typography>
                            </TableCell>

                            <TableCell align="right">
                              {r.land_area ?? "-"}
                            </TableCell>

                            <TableCell>
                              <Chip
                                size="small"
                                label={status}
                                color={statusChipColor(status)}
                                variant={
                                  status === "Approved" ? "filled" : "outlined"
                                }
                              />
                            </TableCell>

                            <TableCell>
                              <TextField
                                size="small"
                                fullWidth
                                value={r.admin_remark || ""}
                                onChange={(e) =>
                                  handleChangeRemark(r.id, e.target.value)
                                }
                                placeholder="Add remark…"
                              />
                            </TableCell>

                            <TableCell align="right">
                              <Stack
                                direction="row"
                                spacing={1}
                                justifyContent="flex-end"
                              >
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="success"
                                  startIcon={<CheckIcon />}
                                  disabled={isSaving || status === "Approved"}
                                  onClick={() =>
                                    updateStatus(r.id, "Approved")
                                  }
                                >
                                  Approve
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="error"
                                  startIcon={<CloseIcon />}
                                  disabled={isSaving || status === "Rejected"}
                                  onClick={() =>
                                    updateStatus(r.id, "Rejected")
                                  }
                                >
                                  Reject
                                </Button>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      !loading && (
                        <TableRow>
                          <TableCell colSpan={7}>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              align="center"
                              sx={{ py: 2 }}
                            >
                              No lands found with this filter.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </Box>
            </>
          )}

          {tab === 1 && (
            <Typography variant="body2" color="text.secondary">
              Crop plan approval will be added later. Use Django admin for
              crop plans for now.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Snackbar */}
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={closeSnack}>
        <Alert
          onClose={closeSnack}
          severity={snack.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
