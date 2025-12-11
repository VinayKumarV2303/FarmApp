// src/pages/farmer/Dashboard.js

import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Chip,
  Stack,
  Skeleton,
  Button,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/axios";

const REFRESH_INTERVAL_MS = 60000; // 60s auto-refresh

const FarmerDashboard = () => {
  const { user, loading: authLoading } = useAuth();

  const [news, setNews] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [visibleCount, setVisibleCount] = useState(5);
  const [lastUpdated, setLastUpdated] = useState(null);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // ----- Helpers -----
  const normalizeNews = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.results)) return payload.results;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.news)) return payload.news;
    return [];
  };

  const sortNews = (items) =>
    [...items].sort((a, b) => {
      const aImp = a.is_important ? 1 : 0;
      const bImp = b.is_important ? 1 : 0;
      if (bImp !== aImp) return bImp - aImp;

      const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bDate - aDate;
    });

  const getImageForPost = (item) => {
  if (item.image) return `${api.defaults.baseURL}${item.image}`;
  if (item.image_url) return item.image_url;
  if (item.photo_url) return item.photo_url; // in case your admin uses this field
  return null;
};

  const formatDateTime = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString();
  };

  const formatTime = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString();
  };

  const NewsSkeleton = () => (
    <Stack spacing={3}>
      {[1, 2, 3].map((i) => (
        <Card
          key={i}
          sx={{ borderRadius: 3, boxShadow: 3, overflow: "hidden" }}
        >
          <Skeleton variant="rectangular" height={200} />
          <CardContent>
            <Skeleton width="70%" />
            <Skeleton width="95%" />
            <Skeleton width="90%" />
            <Skeleton width="40%" sx={{ mt: 1 }} />
          </CardContent>
        </Card>
      ))}
    </Stack>
  );

  // ----- Fetch news (initial, manual refresh, auto refresh) -----
  const fetchNews = useCallback(
    async ({ background = false } = {}) => {
      if (!user) return;

      if (!background) setLoading(true);
      else setRefreshing(true);

      try {
        // Farmer-facing endpoint -> Django farmer_news_list
        const res = await api.get("/farmer/news/");
        const items = sortNews(normalizeNews(res.data));
        setNews(items);
        setError("");
        setLastUpdated(new Date().toISOString());
      } catch (err) {
        console.error("News API error:", err);
        const backendMessage =
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          "Could not load farming news.";
        setError(backendMessage);
      } finally {
        if (!background) setLoading(false);
        setRefreshing(false);
      }
    },
    [user]
  );

  // Initial load after auth is resolved
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    fetchNews({ background: false });
  }, [authLoading, user, fetchNews]);

  // Auto refresh every 60s (live updates)
  useEffect(() => {
    if (authLoading || !user) return;
    const id = setInterval(
      () => fetchNews({ background: true }),
      REFRESH_INTERVAL_MS
    );
    return () => clearInterval(id);
  }, [authLoading, user, fetchNews]);

  const newsList = Array.isArray(news) ? news : [];
  const visibleNews = newsList.slice(0, visibleCount);
  const hasMore = visibleCount < newsList.length;

  // ----- Render -----
  if (authLoading) {
    return (
      <Box sx={{ maxWidth: 800, mx: "auto", mt: 4 }}>
        <Typography variant="h6">Checking session...</Typography>
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ maxWidth: 800, mx: "auto", mt: 4 }}>
        <Typography>Please login again to see your dashboard.</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", pb: 4 }}>
      {/* Header row */}
      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        justifyContent="space-between"
        sx={{ mt: 1, mb: 2 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant={isMobile ? "h6" : "h5"} sx={{ fontWeight: 600 }}>
            Farming News
          </Typography>
          <span role="img" aria-label="news">
            📰
          </span>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              Updated at {formatTime(lastUpdated)}
            </Typography>
          )}
          <Button
            size="small"
            variant="outlined"
            onClick={() => fetchNews({ background: false })}
            disabled={loading || refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </Stack>
      </Stack>

      {/* Status / list */}
      {loading ? (
        <NewsSkeleton />
      ) : error ? (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      ) : newsList.length === 0 ? (
        <Typography color="text.secondary">
          No news available yet. Check back later.
        </Typography>
      ) : (
        <>
          <Stack spacing={3}>
            {visibleNews.map((item) => {
              const metaParts = [];
              const createdAt = formatDateTime(item.created_at);
              if (item.is_important) metaParts.push("⚠️ Important");
              if (createdAt) metaParts.push(createdAt);
              if (item.author_name) metaParts.push(item.author_name);
              const metaLine = metaParts.join(" • ");

              const tags = Array.isArray(item.tags)
                ? item.tags
                : item.tags
                ? item.tags.toString().split(",")
                : [];

              const Wrapper = ({ children }) =>
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
                <Wrapper key={item.id}>
                  <Card
                    sx={{
                      overflow: "hidden",
                      borderRadius: 3,
                      boxShadow: 4,
                      bgcolor: "white",
                      cursor: item.url ? "pointer" : "default",
                      transition: "0.2s",
                      "&:hover": {
                        transform: item.url ? "translateY(-3px)" : "none",
                        boxShadow: item.url ? 6 : 4,
                      },
                    }}
                  >
                    {getImageForPost(item) && (
  <CardMedia
    component="img"
    height="200"
    image={getImageForPost(item)}
    alt={item.title}
    loading="lazy"
    style={{ objectFit: "cover" }}
  />
)}


                    <CardContent>
                      <Typography
                        variant="subtitle1"
                        fontWeight={600}
                        gutterBottom
                      >
                        {item.title}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 1.2 }}
                      >
                        {item.summary ||
                          (item.content && item.content.length > 180
                            ? item.content.slice(0, 180) + "..."
                            : item.content)}
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
                                bgcolor: "#e8f5e9",
                                fontSize: "0.7rem",
                                height: 24,
                              }}
                            />
                          ))}
                        </Stack>
                      )}

                      {metaLine && (
                        <Typography variant="caption" color="text.secondary">
                          {metaLine}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Wrapper>
              );
            })}
          </Stack>

          {/* Load more pagination */}
          {hasMore && (
            <Box sx={{ textAlign: "center", mt: 3 }}>
              <Button
                variant="contained"
                onClick={() => setVisibleCount((prev) => prev + 5)}
                disabled={loading || refreshing}
              >
                Load more
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default FarmerDashboard;
