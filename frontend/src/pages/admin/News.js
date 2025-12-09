// src/pages/admin/News.js
import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Grid,
  Stack,
  Typography,
  Alert,
} from "@mui/material";
import AdminLayout from "../../components/layout/AdminLayout";
import api from "../../api/axios"; // same axios instance you use elsewhere

const AdminNewsPage = () => {
  const [newsList, setNewsList] = useState([]);
  const [form, setForm] = useState({
    title: "",
    body: "",
    photoUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const fetchNews = async () => {
    try {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("adminToken");
      const res = await api.get("/adminpanel/api/news/", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      setNewsList(res.data || []);
    } catch (err) {
      console.error(err);
      setError("Failed to load news.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!form.photoUrl.trim()) {
      setError("Photo URL is required.");
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem("adminToken");
      await api.post(
        "/adminpanel/api/news/",
        {
          title: form.title,
          body: form.body,
          photo_url: form.photoUrl, // match Django field (photo_url)
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      setSuccess("News added successfully.");
      setForm({ title: "", body: "", photoUrl: "" });
      fetchNews();
    } catch (err) {
      console.error(err);
      setError("Failed to save news.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout title="News">
      <Grid container spacing={3}>
        {/* Add News Form */}
        <Grid item xs={12} md={5}>
          <Card>
            <CardHeader title="Add News" />
            <CardContent>
              <Stack spacing={2} component="form" onSubmit={handleSubmit}>
                {error && <Alert severity="error">{error}</Alert>}
                {success && <Alert severity="success">{success}</Alert>}

                <TextField
                  label="Title"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  fullWidth
                  required
                />
                <TextField
                  label="Body / Description"
                  name="body"
                  value={form.body}
                  onChange={handleChange}
                  fullWidth
                  multiline
                  minRows={3}
                />
                <TextField
                  label="Photo URL"
                  name="photoUrl"
                  value={form.photoUrl}
                  onChange={handleChange}
                  fullWidth
                  required
                  helperText="Paste an image URL to show with this news item."
                />

                <Button
                  type="submit"
                  variant="contained"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Add News"}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* News List */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardHeader
              title="Latest News"
              subheader={
                loading ? "Loading..." : `${newsList.length} item(s) found`
              }
            />
            <CardContent>
              {newsList.length === 0 && !loading && (
                <Typography variant="body2" color="text.secondary">
                  No news added yet.
                </Typography>
              )}
              <Stack spacing={2}>
                {newsList.map((item) => (
                  <Box
                    key={item.id}
                    sx={{
                      borderRadius: 2,
                      border: "1px solid #eee",
                      p: 2,
                      display: "flex",
                      gap: 2,
                    }}
                  >
                    {item.photo_url && (
                      <Box
                        component="img"
                        src={item.photo_url}
                        alt={item.title}
                        sx={{
                          width: 90,
                          height: 70,
                          objectFit: "cover",
                          borderRadius: 1,
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <Box>
                      <Typography variant="subtitle1">{item.title}</Typography>
                      {item.body && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 0.5 }}
                        >
                          {item.body}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </AdminLayout>
  );
};

export default AdminNewsPage;
