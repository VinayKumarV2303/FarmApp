// src/pages/farmer/NewCropPlan.js (simplified)
import React, { useState } from "react";
import { Card, CardContent, TextField, Button, Typography } from "@mui/material";
import { createCropPlan } from "../../api/alphaApi";

const NewCropPlan = () => {
  const [user] = useState(() =>
    JSON.parse(localStorage.getItem("alpha_user") || "null")
  );
  const [form, setForm] = useState({
    crop_id: "",
    season_id: "",
    area_planned: "",
    // add region_id or other fields if backend expects them
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return alert("Login first");

    await createCropPlan({
      user_id: user.id,
      ...form,
    });

    alert("Plan created!");
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h5" sx={{ mb: 2 }}>
          New Crop Plan
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            label="Crop ID"
            name="crop_id"
            value={form.crop_id}
            onChange={handleChange}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Season ID"
            name="season_id"
            value={form.season_id}
            onChange={handleChange}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            label="Area Planned"
            name="area_planned"
            value={form.area_planned}
            onChange={handleChange}
            fullWidth
            sx={{ mb: 2 }}
          />
          <Button type="submit" variant="contained">
            Save Plan
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default NewCropPlan;
