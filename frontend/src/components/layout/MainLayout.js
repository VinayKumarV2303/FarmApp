// src/components/layout/MainLayout.js
import React, { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Stack,
  Typography,
  Divider,
  IconButton,
  useMediaQuery,
  useTheme,
  Tooltip,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PersonIcon from "@mui/icons-material/Person";
import AgricultureIcon from "@mui/icons-material/Agriculture";
import ExitToAppIcon from "@mui/icons-material/ExitToApp";
import GrainIcon from "@mui/icons-material/Grain";
import { useAuth } from "../../context/AuthContext";

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();

  const sidebarWidth = sidebarOpen ? "4.0cm" : "56px";

  const navItems = [
    {
      label: "Dashboard",
      icon: <DashboardIcon fontSize="small" />,
      segment: "dashboard",
      to: "/farmer/dashboard",
    },
    {
      label: "Profile",
      icon: <PersonIcon fontSize="small" />,
      segment: "profile",
      to: "/farmer/profile",
    },
    {
      label: "Land",
      icon: <AgricultureIcon fontSize="small" />,
      segment: "land",
      to: "/farmer/land",
    },
    {
      label: "Crop",
      icon: <GrainIcon fontSize="small" />,
      segment: "crop-plan", // for future, if you add /farmer/crop-plan list etc.
      to: "/farmer/crop-plan/create", // ✅ goes to your Create Crop Plan page
    },
  ];

  // Use item.to when available, otherwise fallback to /farmer/<segment>
  const isActive = (item) => {
    if (item.to) {
      return location.pathname.startsWith(item.to);
    }
    return location.pathname.startsWith(`/farmer/${item.segment}`);
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        bgcolor: "white",
        overflow: "hidden",
      }}
    >
      {/* FIXED SIDEBAR */}
      <Box
        sx={{
          width: sidebarWidth,
          transition: "width 0.25s ease",
          bgcolor: sidebarOpen ? "#0d6efd" : "transparent",
          color: sidebarOpen ? "white" : "#0d6efd",
          display: "flex",
          flexDirection: "column",
          p: sidebarOpen ? 1.5 : 1,
          position: "fixed",
          left: 0,
          top: 0,
          height: "100vh",
          overflow: "hidden",
          zIndex: 1200,
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent={sidebarOpen ? "space-between" : "center"}
          sx={{ mb: sidebarOpen ? 2 : 1 }}
        >
          {sidebarOpen && (
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, lineHeight: 1.1, cursor: "pointer" }}
              onClick={() => navigate("/farmer/dashboard")}
            >
              Alpha
              <br />
              Farmer
            </Typography>
          )}

          <IconButton
            size="small"
            onClick={() => setSidebarOpen((prev) => !prev)}
            sx={{
              color: sidebarOpen ? "white" : "#0d6efd",
              bgcolor: sidebarOpen
                ? "rgba(255,255,255,0.20)"
                : "rgba(13,110,253,0.10)",
              borderRadius: "8px",
              "&:hover": {
                bgcolor: sidebarOpen
                  ? "rgba(255,255,255,0.30)"
                  : "rgba(13,110,253,0.20)",
              },
            }}
          >
            <MenuIcon />
          </IconButton>
        </Stack>

        {/* Navigation */}
        <Stack spacing={1}>
          {navItems.map((item) => {
            const active = isActive(item);

            const handleClick = () => {
              if (item.to) {
                navigate(item.to);
              } else {
                navigate(`/farmer/${item.segment}`);
              }
            };

            const content = (
              <Box
                key={item.label}
                onClick={handleClick}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  p: 1,
                  borderRadius: 2,
                  gap: 1.5,
                  cursor: "pointer",
                  bgcolor: active ? "rgba(255,255,255,0.30)" : "transparent",
                  fontWeight: active ? 600 : 400,
                  "&:hover": {
                    bgcolor: "rgba(255,255,255,0.20)",
                  },
                }}
              >
                {item.icon}
                {sidebarOpen && (
                  <Typography variant="body2">{item.label}</Typography>
                )}
              </Box>
            );

            return sidebarOpen ? (
              content
            ) : (
              <Tooltip title={item.label} placement="right" key={item.label}>
                {content}
              </Tooltip>
            );
          })}
        </Stack>

        <Box sx={{ flexGrow: 1 }} />

        {/* Logout */}
        <Divider sx={{ borderColor: "rgba(255,255,255,0.3)", my: 1 }} />

        <Box
          onClick={handleLogout}
          sx={{
            display: "flex",
            alignItems: "center",
            p: 1,
            gap: 1.5,
            cursor: "pointer",
            borderRadius: 2,
            "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
          }}
        >
          <ExitToAppIcon fontSize="small" />
          {sidebarOpen && <Typography variant="body2">Logout</Typography>}
        </Box>
      </Box>

      {/* MAIN CONTENT AREA */}
      <Box
        sx={{
          flexGrow: 1,
          px: isMobile ? 1.5 : 3,
          py: isMobile ? 2 : 3,
          ml: sidebarWidth,
          transition: "margin-left 0.25s ease",
          height: "100vh",
          overflowY: "auto",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};

export default MainLayout;
