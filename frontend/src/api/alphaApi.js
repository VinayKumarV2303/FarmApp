// src/api/alphaApi.js
import axios from "axios";

// 🔁 CHANGE this to your backend URL (Render / localhost)
const api = axios.create({
  baseURL: "http://localhost:8000",
});

//
// --------------- ACCOUNTS (OTP FLOW) ---------------
//

// POST /accounts/register/  -> create user (or reuse) and return info + maybe OTP info
export const registerAccount = (phone, name) =>
  api.post("/accounts/register/", { phone, name });

// POST /accounts/send-otp/  -> send OTP SMS (backend generates and stores otp)
export const sendOtp = (phone) =>
  api.post("/accounts/send-otp/", { phone });

// POST /accounts/verify-otp/ -> verify OTP and return user object
// Expected response: { success: true/false, message, user: { id, phone, name, ... } }
export const verifyOtp = (phone, otp) =>
  api.post("/accounts/verify-otp/", { phone, otp });


//
// --------------- FARMER PROFILE ---------------
//

// POST /farmer/create/
// Body: { user_id, village, district, state, land_size, soil_type?, irrigation_type? }
export const createFarmerProfile = (userId, data) =>
  api.post("/farmer/create/", {
    user_id: userId,
    ...data,
  });

// GET /farmer/<user_id>/
export const getFarmerProfile = (userId) =>
  api.get(`/farmer/${userId}/`);


//
// --------------- ADMIN DASHBOARD ---------------
//

// GET /adminpanel/dashboard/
// Response: { total_users, total_farmers, profiles_completed, farmers_by_district: [{district, count}] }
export const getAdminDashboard = () =>
  api.get("/adminpanel/dashboard/");


//
// --------------- PLANS & RECOMMENDATIONS ---------------
//

// POST /recommendation/plan/
// Backend expects at least: { user_id, crop_id, season_id, area_planned, ... }
// Keep payload flexible and pass everything from the form.
export const createCropPlan = (payload) =>
  api.post("/recommendation/plan/", payload);

// GET /recommendation/plan/<farmer_id>/
// (farmer_id is Farmer model id, not Account id)
export const getFarmerPlans = (farmerId) =>
  api.get(`/recommendation/plan/${farmerId}/`);

// GET /recommendation/recommend/<user_id>/
// Response: { good_crops: [...], risky_crops: [...], maybe extra }
export const getRecommendations = (userId) =>
  api.get(`/recommendation/recommend/${userId}/`);

// GET /recommendation/dashboard/<user_id>/
// Response (from your code):
// {
//   "farmer": { name, village, district, state, land_size },
//   "my_plans": [...],
//   "good_crops": [...],
//   "risky_crops": [...]
// }
export const getFarmerDashboardData = (userId) =>
  api.get(`/recommendation/dashboard/${userId}/`);

// Update farmer account (name, email, password)
export const updateAccountInfo = (id, data) =>
  api.put(`/farmer/account/${id}/`, data);


export default api;
