// frontend/src/pages/admin/News.js
import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Switch,
  FormControlLabel,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Alert,
} from "@mui/material";
import api from "../../api/axios"; // your axios instance

const defaultState = {
  title: "",
  summary: "",
  content: "",
  image: null,        // file
  image_url: "",
  published_at: "",   // optional: "2025-12-10T12:00"
  is_active: true,
  status: "pending",  // if your backend uses status
};

export default function News() {
  const [form, setForm] = useState(defaultState);
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setForm((s) => ({ ...s, [name]: checked }));
    } else {
      setForm((s) => ({ ...s, [name]: value }));
    }
  }

  function handleFileChange(e) {
    const file = e.target.files && e.target.files[0];
    setForm((s) => ({ ...s, image: file }));
    setErrors(null);
    setSuccessMsg("");
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setErrors(null);
    setSuccessMsg("");

    try {
      // Validate minimal required fields on client
      if (!form.title) {
        setErrors({ title: ["Title is required"] });
        setSubmitting(false);
        return;
      }

      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("summary", form.summary || "");
      fd.append("content", form.content || "");
      // Only append image if user selected a file
      if (form.image) fd.append("image", form.image);
      // If user provided image_url, append it too
      if (form.image_url) fd.append("image_url", form.image_url);
      if (form.published_at) fd.append("published_at", form.published_at);
      fd.append("is_active", form.is_active ? "true" : "false");
      if (form.status) fd.append("status", form.status);

      // NOTE: DO NOT set 'Content-Type' header manually here.
      // Let axios set the multipart boundary automatically.
      // If your axios instance already has Authorization header, good.
      // Otherwise uncomment and provide a token:
      // const headers = { Authorization: `Bearer ${token}` };

      // Optional debug: print form keys (files won't show contents here)
      // for (let pair of fd.entries()) console.log(pair[0], pair[1]);

      const url = "/adminpanel/api/news/"; // ensure this matches your backend route
      const response = await api.post(url, fd /*, { headers } */);

      // Success: reset form or show created item
      setSuccessMsg("News saved successfully.");
      setForm(defaultState);
      setPreview(null);
    } catch (err) {
      // Axios error handling: read server validation errors if present
      if (err.response && err.response.data) {
        setErrors(err.response.data);
        console.error("Server validation errors:", err.response.data);
      } else {
        setErrors({ non_field_errors: ["Unexpected error. See console."] });
        console.error("Upload error:", err);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 920, mx: "auto", p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Add news
      </Typography>

      {successMsg && <Alert severity="success">{successMsg}</Alert>}
      {errors && (
        <Box sx={{ mb: 2 }}>
          {Object.entries(errors).map(([k, v]) => (
            <Alert key={k} severity="error" sx={{ mb: 1 }}>
              <strong>{k}:</strong> {Array.isArray(v) ? v.join(", ") : v}
            </Alert>
          ))}
        </Box>
      )}

      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <TextField
          label="Title"
          name="title"
          value={form.title}
          onChange={handleChange}
          fullWidth
          required
          margin="normal"
        />

        <TextField
          label="Summary"
          name="summary"
          value={form.summary}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />

        <TextField
          label="Content"
          name="content"
          value={form.content}
          onChange={handleChange}
          fullWidth
          multiline
          rows={6}
          margin="normal"
        />

        <Box sx={{ display: "flex", gap: 2, alignItems: "center", mt: 1 }}>
          <Button variant="contained" component="label">
            Choose image
            <input
              type="file"
              accept="image/*"
              hidden
              onChange={handleFileChange}
            />
          </Button>
          <TextField
            label="Or image url"
            name="image_url"
            value={form.image_url}
            onChange={handleChange}
            fullWidth
          />
        </Box>

        {preview && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Preview</Typography>
            <img
              src={preview}
              alt="preview"
              style={{ maxWidth: 320, maxHeight: 240, display: "block" }}
            />
          </Box>
        )}

        <Box sx={{ mt: 2, display: "flex", gap: 2, alignItems: "center" }}>
          <FormControlLabel
            control={
              <Switch
                checked={form.is_active}
                onChange={(e) =>
                  setForm((s) => ({ ...s, is_active: e.target.checked }))
                }
                name="is_active"
              />
            }
            label="Is active"
          />

          <FormControl sx={{ minWidth: 160 }}>
            <InputLabel id="status-label">Status</InputLabel>
            <Select
              labelId="status-label"
              label="Status"
              name="status"
              value={form.status}
              onChange={handleChange}
            >
              <MenuItem value="pending">Pending</MenuItem>
              <MenuItem value="published">Published</MenuItem>
              <MenuItem value="draft">Draft</MenuItem>
            </Select>
          </FormControl>

          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            sx={{ ml: "auto" }}
          >
            {submitting ? "Saving..." : "Save"}
          </Button>
        </Box>
      </form>
    </Box>
  );
}
