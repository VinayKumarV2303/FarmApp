import React, { useEffect, useState } from "react";
import {
  Card, CardContent, CardHeader,
  Button, Typography, Stack, Box, Chip
} from "@mui/material";
import api from "../../api/axios";

export default function CropPlanApproval() {
  const [plans, setPlans] = useState([]);

  const loadPlans = async () => {
    try {
      const res = await api.get("/farmer/crop-plan/");
      setPlans(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleAction = async (planId, action) => {
    const remark = prompt("Admin remark (optional):") || "";

    await api.post(`/farmer/crop-plan/${planId}/${action}/`, {
      remark,
    });

    loadPlans();
    alert(`Status updated → ${action.toUpperCase()}`);
  };

  const getStatusColor = (s) => {
    if (s === "approved") return "success";
    if (s === "rejected") return "error";
    return "warning";
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Crop Plan Approval Panel</Typography>

      <Stack spacing={2}>
        {plans.map((p) => (
          <Card key={p.id}>
            <CardHeader
              title={`Crop Plan #${p.id}`}
              subheader={`Land #${p.land}`}
            />
            <CardContent>
              <Typography><strong>Area:</strong> {p.total_acres_allocated} acres</Typography>
              <Typography><strong>Season:</strong> {p.season}</Typography>
              <Typography><strong>Soil:</strong> {p.soil_type}</Typography>

              <Chip
                label={p.approval_status}
                color={getStatusColor(p.approval_status)}
                sx={{ mt: 1 }}
              />

              {p.admin_remark && (
                <Typography variant="caption" color="text.secondary">
                  Remark: {p.admin_remark}
                </Typography>
              )}

              {p.approval_status === "pending" && (
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => handleAction(p.id, "approve")}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => handleAction(p.id, "reject")}
                  >
                    Reject
                  </Button>
                </Stack>
              )}
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Box>
  );
}
