import React, { useEffect, useState } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
} from "recharts";
import api from "../../api/axios";

const AdminDashboard = () => {
  const [cropAreaData, setCropAreaData] = useState([]);
  const [cropShareData, setCropShareData] = useState([]);
  const [kpis, setKpis] = useState({
    totalFarmers: 0,
    totalPlans: 0,
    totalArea: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/api/admin/dashboard-stats/");
        setKpis(res.data.kpis);
        setCropAreaData(res.data.crop_area);
        setCropShareData(res.data.crop_share);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, []);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Typography variant="h4">Admin Dashboard</Typography>
        <Typography variant="body2" color="text.secondary">
          Monitor farmers, crop distribution and planning patterns.
        </Typography>
      </Grid>

      {/* KPI Cards */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary">
              Total Farmers
            </Typography>
            <Typography variant="h3">{kpis.totalFarmers}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary">
              Total Crop Plans
            </Typography>
            <Typography variant="h3">{kpis.totalPlans}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary">
              Total Planned Area (Acres)
            </Typography>
            <Typography variant="h3">{kpis.totalArea}</Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Bar Chart */}
      <Grid item xs={12} md={6}>
        <Card sx={{ height: 320 }}>
          <CardContent sx={{ height: "100%" }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Area per Crop
            </Typography>
            <ResponsiveContainer width="100%" height="80%">
              <BarChart data={cropAreaData}>
                <XAxis dataKey="crop_name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="area" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* Pie Chart */}
      <Grid item xs={12} md={6}>
        <Card sx={{ height: 320 }}>
          <CardContent sx={{ height: "100%" }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Crop Share Distribution
            </Typography>
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie
                  data={cropShareData}
                  dataKey="value"
                  nameKey="crop_name"
                  outerRadius={100}
                  label
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default AdminDashboard;
