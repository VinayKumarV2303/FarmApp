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
  TableSortLabel,
  TablePagination,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";

import api from "../../api/axios";
import AdminLayout from "../../components/layout/AdminLayout";
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

const getAdminHeaders = () => {
  const token = localStorage.getItem("adminToken");
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`,
  };
};

// generic comparator for sorting
const compare = (a, b, key) => {
  const va = a[key];
  const vb = b[key];

  if (va === vb) return 0;
  if (va === undefined || va === null) return 1;
  if (vb === undefined || vb === null) return -1;

  if (typeof va === "number" && typeof vb === "number") {
    return va - vb;
  }
  return String(va).localeCompare(String(vb));
};

export default function Approvals() {
  const [tab, setTab] = useState(0);

  const [statusFilter, setStatusFilter] = useState("All");
  const [search, setSearch] = useState("");

  // Lands
  const [rows, setRows] = useState([]);
  // Crops
  const [cropRows, setCropRows] = useState([]);

  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // pagination + sorting
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState("id");
  const [order, setOrder] = useState("asc");

  const closeSnack = () =>
    setSnack((s) => ({
      ...s,
      open: false,
    }));

  const handleRequestSort = (key) => {
    setOrder((prevOrder) =>
      orderBy === key && prevOrder === "asc" ? "desc" : "asc"
    );
    setOrderBy(key);
  };

  const handleChangePage = (_, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // --------- LAND FETCH ----------
  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);

      let params = {};
      if (statusFilter !== "All") {
        params.status = labelToBackendStatus(statusFilter);
      }

      const res = await api.get("/adminpanel/api/approvals/lands/", {
        params,
        headers: getAdminHeaders(),
      });

      const raw = Array.isArray(res.data) ? res.data : res.data?.results || [];

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
      setPage(0);
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

  // --------- CROP FETCH ----------
  const fetchCropRows = useCallback(async () => {
    try {
      setLoading(true);

      let params = {};
      if (statusFilter !== "All") {
        params.status = labelToBackendStatus(statusFilter);
      }

      const res = await api.get("/adminpanel/api/approvals/crop-plans/", {
        params,
        headers: getAdminHeaders(),
      });

      const raw = Array.isArray(res.data) ? res.data : res.data?.results || [];

      const normalized = raw.map((r) => ({
        id: r.id,
        name: r.farmer_name || "",
        username: r.farmer_username || "",
        phone: r.farmer_phone || "",
        village: r.village || "",
        district: r.district || "",
        state: r.state || "",
        crop_name: r.crop_name || r.crop || "",
        season: r.season || "",
        area: r.planned_area ?? r.area ?? null,
        approval_status: mapStatusToLabel(r.approval_status),
        admin_remark: r.admin_remark || "",
      }));

      setCropRows(normalized);
      setPage(0);
      console.log("Crop plan approvals:", normalized);
    } catch (err) {
      console.error("Failed to fetch crop approvals:", err);
      setSnack({
        open: true,
        message: "Failed to load crop approvals",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  // Load lands initially + when status filter changes (while on lands tab)
  useEffect(() => {
    if (tab === 0) {
      fetchRows();
    }
  }, [tab, fetchRows]);

  // Load crops when tab is switched to 1 (and when status filter changes on that tab)
  useEffect(() => {
    if (tab === 1) {
      fetchCropRows();
    }
  }, [tab, fetchCropRows]);

  const handleChangeRemark = (id, value, isCrop = false) => {
    if (isCrop) {
      setCropRows((prev) =>
        prev.map((row) =>
          row.id === id ? { ...row, admin_remark: value } : row
        )
      );
    } else {
      setRows((prev) =>
        prev.map((row) =>
          row.id === id ? { ...row, admin_remark: value } : row
        )
      );
    }
  };

  // --------- UPDATE LAND STATUS ----------
  const updateStatus = async (landId, newStatusLabel) => {
    try {
      const row = rows.find((r) => r.id === landId);
      if (!row) return;

      if (row.approval_status === newStatusLabel) return;

      setSavingId(landId);

      const backendStatus = labelToBackendStatus(newStatusLabel);

      await api.patch(
        `/adminpanel/api/approvals/lands/${landId}/`,
        {
          approval_status: backendStatus,
          admin_remark: row.admin_remark || "",
        },
        {
          headers: getAdminHeaders(),
        }
      );

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

  // --------- UPDATE CROP STATUS ----------
  const updateCropStatus = async (planId, newStatusLabel) => {
    try {
      const row = cropRows.find((r) => r.id === planId);
      if (!row) return;

      if (row.approval_status === newStatusLabel) return;

      setSavingId(planId);

      const backendStatus = labelToBackendStatus(newStatusLabel);

      await api.patch(
        `/adminpanel/api/approvals/crop-plans/${planId}/`,
        {
          approval_status: backendStatus,
          admin_remark: row.admin_remark || "",
        },
        {
          headers: getAdminHeaders(),
        }
      );

      setSnack({
        open: true,
        message: `Crop plan marked as ${newStatusLabel}`,
        severity: "success",
      });

      await fetchCropRows();
    } catch (err) {
      console.error("Failed to update crop approval:", err);
      setSnack({
        open: true,
        message: "Failed to update crop approval",
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

  // --------- FILTERED + SORTED + PAGINATED LISTS ----------
  const landFilteredRows = useMemo(() => {
    let data = rows;

    if (statusFilter !== "All") {
      data = data.filter(
        (r) => (r.approval_status || "Pending") === statusFilter
      );
    }

    const q = search.trim().toLowerCase();
    if (q) {
      data = data.filter((r) => {
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
    }

    const sorted = [...data].sort((a, b) => {
      const result = compare(a, b, orderBy);
      return order === "asc" ? result : -result;
    });

    return sorted;
  }, [rows, statusFilter, search, orderBy, order]);

  const cropFilteredRows = useMemo(() => {
    let data = cropRows;

    if (statusFilter !== "All") {
      data = data.filter(
        (r) => (r.approval_status || "Pending") === statusFilter
      );
    }

    const q = search.trim().toLowerCase();
    if (q) {
      data = data.filter((r) => {
        const fields = [
          r.name,
          r.username,
          r.village,
          r.district,
          r.state,
          r.phone,
          r.crop_name,
          r.season,
        ]
          .filter(Boolean)
          .map((x) => String(x).toLowerCase());
        return fields.some((val) => val.includes(q));
      });
    }

    const sorted = [...data].sort((a, b) => {
      const result = compare(a, b, orderBy);
      return order === "asc" ? result : -result;
    });

    return sorted;
  }, [cropRows, statusFilter, search, orderBy, order]);

  const landHasRows = landFilteredRows.length > 0;
  const cropHasRows = cropFilteredRows.length > 0;

  const handleRefresh = () => {
    if (tab === 0) {
      fetchRows();
    } else {
      fetchCropRows();
    }
  };

  const currentRows = tab === 0 ? landFilteredRows : cropFilteredRows;

  const paginatedRows = useMemo(() => {
    const start = page * rowsPerPage;
    return currentRows.slice(start, start + rowsPerPage);
  }, [currentRows, page, rowsPerPage]);

  const totalCount = currentRows.length;

  return (
    <AdminLayout title="Approvals">
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
              Approvals
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Approve or reject farmer land and crop plan details.
            </Typography>
          </Box>
          <IconButton onClick={handleRefresh} title="Refresh" disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>

        <Card sx={{ borderRadius: 2, boxShadow: 1 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => {
              setTab(v);
              setPage(0); // reset page when switching tabs
            }}
            sx={{ borderBottom: 1, borderColor: "divider" }}
          >
            <Tab label="Lands" />
            <Tab label="Crop Plans" />
          </Tabs>

          <CardContent>
            {/* ---------- Filters ---------- */}
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
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(0);
                  }}
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
                  label={
                    tab === 0
                      ? "Search (name / village / phone)"
                      : "Search (name / village / crop)"
                  }
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(0);
                  }}
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
                {loading
                  ? "Loading…"
                  : totalCount
                  ? `${totalCount} record(s)`
                  : "No records"}
              </Typography>
            </Stack>

            {loading && <LinearProgress sx={{ mb: 2 }} />}

            {/* ---------- TABLES ---------- */}
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead>
                  {tab === 0 ? (
                    <TableRow>
                      <TableCell sortDirection={orderBy === "name" ? order : false}>
                        <TableSortLabel
                          active={orderBy === "name"}
                          direction={orderBy === "name" ? order : "asc"}
                          onClick={() => handleRequestSort("name")}
                        >
                          Farmer
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>Contact</TableCell>
                      <TableCell
                        sortDirection={orderBy === "village" ? order : false}
                      >
                        <TableSortLabel
                          active={orderBy === "village"}
                          direction={orderBy === "village" ? order : "asc"}
                          onClick={() => handleRequestSort("village")}
                        >
                          Location
                        </TableSortLabel>
                      </TableCell>
                      <TableCell
                        align="right"
                        sortDirection={orderBy === "land_area" ? order : false}
                      >
                        <TableSortLabel
                          active={orderBy === "land_area"}
                          direction={orderBy === "land_area" ? order : "asc"}
                          onClick={() => handleRequestSort("land_area")}
                        >
                          Land Area
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell sx={{ minWidth: 200 }}>Remark</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  ) : (
                    <TableRow>
                      <TableCell sortDirection={orderBy === "name" ? order : false}>
                        <TableSortLabel
                          active={orderBy === "name"}
                          direction={orderBy === "name" ? order : "asc"}
                          onClick={() => handleRequestSort("name")}
                        >
                          Farmer
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>Contact</TableCell>
                      <TableCell
                        sortDirection={orderBy === "village" ? order : false}
                      >
                        <TableSortLabel
                          active={orderBy === "village"}
                          direction={orderBy === "village" ? order : "asc"}
                          onClick={() => handleRequestSort("village")}
                        >
                          Location
                        </TableSortLabel>
                      </TableCell>
                      <TableCell
                        sortDirection={orderBy === "crop_name" ? order : false}
                      >
                        <TableSortLabel
                          active={orderBy === "crop_name"}
                          direction={orderBy === "crop_name" ? order : "asc"}
                          onClick={() => handleRequestSort("crop_name")}
                        >
                          Crop
                        </TableSortLabel>
                      </TableCell>
                      <TableCell
                        align="right"
                        sortDirection={orderBy === "area" ? order : false}
                      >
                        <TableSortLabel
                          active={orderBy === "area"}
                          direction={orderBy === "area" ? order : "asc"}
                          onClick={() => handleRequestSort("area")}
                        >
                          Area
                        </TableSortLabel>
                      </TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell sx={{ minWidth: 200 }}>Remark</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  )}
                </TableHead>

                <TableBody>
                  {paginatedRows.length ? (
                    paginatedRows.map((r) => {
                      const status = r.approval_status || "Pending";
                      const isPending =
                        status !== "Approved" && status !== "Rejected";
                      const isSaving = savingId === r.id;

                      if (tab === 0) {
                        // LANDS
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
                                  handleChangeRemark(
                                    r.id,
                                    e.target.value,
                                    false
                                  )
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
                      }

                      // CROPS
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

                          <TableCell>
                            <Typography variant="body2">
                              {r.crop_name || "-"}
                            </Typography>
                            {r.season && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {r.season}
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell align="right">
                            {r.area ?? "-"}
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
                                handleChangeRemark(
                                  r.id,
                                  e.target.value,
                                  true
                                )
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
                                  updateCropStatus(r.id, "Approved")
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
                                  updateCropStatus(r.id, "Rejected")
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
                        <TableCell colSpan={tab === 0 ? 7 : 8}>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            align="center"
                            sx={{ py: 2 }}
                          >
                            {tab === 0
                              ? "No lands found with this filter."
                              : "No crop plans found with this filter."}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </TableBody>
              </Table>
            </Box>

            <TablePagination
              component="div"
              count={totalCount}
              page={page}
              onPageChange={handleChangePage}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              rowsPerPageOptions={[5, 10, 25, 50]}
            />
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
    </AdminLayout>
  );
}
