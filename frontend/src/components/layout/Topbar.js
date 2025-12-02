// src/components/layout/Topbar.js
import React from "react";
import { AppBar, Toolbar, Typography } from "@mui/material";

const Topbar = () => {
  return (
    <AppBar position="static" elevation={0}>
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Alpha Farmer App
        </Typography>
      </Toolbar>
    </AppBar>
  );
};

export default Topbar;
