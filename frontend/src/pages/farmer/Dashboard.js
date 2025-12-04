import React, { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Chip,
  Stack,
  Box,
  useMediaQuery,
  useTheme,
  Skeleton,
} from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";

const FarmerDashboard = () => {
  const { user } = useAuth();
  const [news, setNews] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  useEffect(() => {
    if (!user) return;

    const fetchNews = async () => {
      setLoading(true);
      try {
        const res = await api.get("/farmer/news/");
        setNews(res.data || []);
        setError("");
      } catch (err) {
        console.error("News API error:", err);
        const backendMessage =
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Could not load farming news.";
        setError(backendMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [user]);

  if (!user) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Please login again.</Typography>
      </Box>
    );
  }

  const getImageForPost = (item) =>
    item.image_url ||
    item.image ||
    "https://images.pexels.com/photos/2961120/pexels-photo-2961120.jpeg?auto=compress&cs=tinysrgb&w=1200";

  const formatDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString();
  };

  const NewsSkeleton = () => (
    <Stack
      spacing={3}
      sx={{
        maxWidth: 480,
        mx: "auto",
        pb: 4,
      }}
    >
      {[1, 2, 3].map((i) => (
        <Card
          key={i}
          sx={{
            borderRadius: 3,
            boxShadow: 3,
            overflow: "hidden",
          }}
        >
          <Skeleton variant="rectangular" height={260} />
          <CardContent>
            <Skeleton variant="text" width="70%" />
            <Skeleton variant="text" width="95%" />
            <Skeleton variant="text" width="90%" />
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              <Skeleton variant="rounded" width={60} height={24} />
              <Skeleton variant="rounded" width={80} height={24} />
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography
            variant={isMobile ? "h6" : "h5"}
            sx={{ fontWeight: 600 }}
          >
            Farming News
          </Typography>
          <span role="img" aria-label="news">
            📰
          </span>
        </Stack>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: { xs: "none", sm: "block" } }}
        >
          Latest updates for your farm decisions
        </Typography>
      </Stack>

      {loading ? (
        <NewsSkeleton />
      ) : error ? (
        <Typography color="error" sx={{ mb: 1 }}>
          {error}
        </Typography>
      ) : news.length === 0 ? (
        <Typography color="text.secondary">
          No news available yet. Check back later.
        </Typography>
      ) : (
        <Stack
          spacing={3}
          sx={{
            maxWidth: 480,
            mx: "auto",
            pb: 4,
          }}
        >
          {news.map((item) => {
            const createdAt = formatDate(item.created_at);
            const metaParts = [];
            if (createdAt) metaParts.push(createdAt);
            if (item.author_name) metaParts.push(item.author_name);
            if (item.is_important) metaParts.push("IMPORTANT");
            const metaLine = metaParts.join(" • ");

            // ---- SAFE TAG HANDLER ----
            const tags = Array.isArray(item.tags)
              ? item.tags
              : item.tags?.toString().split(",") || [];

            const CardWrapper = ({ children }) =>
              item.url ? (
                <Box
                  component="a"
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ textDecoration: "none" }}
                >
                  {children}
                </Box>
              ) : (
                <>{children}</>
              );

            return (
              <CardWrapper key={item.id}>
                <Card
                  sx={{
                    borderRadius: 3,
                    boxShadow: 3,
                    overflow: "hidden",
                    bgcolor: "white",
                    transition: "transform 0.15s ease, box-shadow 0.15s ease",
                    "&:hover": {
                      transform: "translateY(-3px)",
                      boxShadow: 6,
                    },
                    cursor: item.url ? "pointer" : "default",
                  }}
                >
                  <CardMedia
                    component="img"
                    height="260"
                    image={getImageForPost(item)}
                    alt={item.title}
                    loading="lazy"
                  />

                  <CardContent sx={{ pb: 1.5 }}>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: 600, mb: 0.5 }}
                    >
                      {item.title}
                    </Typography>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1.2 }}
                    >
                      {item.summary ||
                        (item.content
                          ? item.content.slice(0, 180) + "..."
                          : "")}
                    </Typography>

                    {tags.length > 0 && (
                      <Stack
                        direction="row"
                        spacing={1}
                        flexWrap="wrap"
                        sx={{ mb: 1 }}
                      >
                        {tags.map((tag, index) => (
                          <Chip
                            key={index}
                            label={`#${tag}`}
                            size="small"
                            sx={{
                              mb: 0.5,
                              fontSize: "0.7rem",
                              height: 22,
                            }}
                          />
                        ))}
                      </Stack>
                    )}

                    {metaLine && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: "0.75rem" }}
                      >
                        {metaLine}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </CardWrapper>
            );
          })}
        </Stack>
      )}
    </Box>
  );
};

export default FarmerDashboard;
