// src/components/layout/Sidebar.js
import React from "react";
import { Box, List, ListItemButton, ListItemText, Divider } from "@mui/material";
import { useNavigate } from "react-router-dom";

const Sidebar = () => {
  const navigate = useNavigate();

  const items = [
    { label: "Dashboard", path: "/farmer" },
    // you can add more later e.g. crop-plans, profile, etc.
  ];

  return (
    <Box
      sx={{
        width: 220,
        borderRight: "1px solid #eee",
        height: "100%",
        bgcolor: "#fafafa",
      }}
    >
      <List>
        {items.map((item) => (
          <ListItemButton key={item.path} onClick={() => navigate(item.path)}>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
      </List>
      <Divider />
    </Box>
  );
};

export default Sidebar;
