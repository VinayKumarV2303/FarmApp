# farmer/urls.py
from django.urls import path
from . import views
from .views import (
    approve_crop_plan,
    reject_crop_plan,
    cancel_signup_view,
    yield_estimate_view,
    pincode_lookup_view,
    reverse_geocode_view,
    admin_news_list_create_view,
    admin_news_approve_view,
    admin_news_reject_view,
)

urlpatterns = [
    # OTP / auth (farmer)
    path("send-otp/", views.send_otp_view, name="send-otp"),
    path("verify-otp/", views.verify_otp_view, name="verify-otp"),
    path("cancel-signup/", cancel_signup_view, name="cancel_signup"),

    # Farmer profile
    path("profile/", views.farmer_profile, name="farmer-profile"),

    # Land
    path("land/", views.LandListCreateView.as_view(), name="farmer-land-list"),
    path(
        "land/<int:pk>/",
        views.LandDetailView.as_view(),
        name="farmer-land-detail",
    ),

    # Crop plans
    path(
        "crop-plan/",
        views.CropPlanListCreateView.as_view(),
        name="crop-plan-list",
    ),
    path(
        "crop-plan/<int:pk>/",
        views.CropPlanDetailView.as_view(),
        name="crop-plan-detail",
    ),
    path("crop-plan/<int:pk>/approve/", approve_crop_plan),
    path("crop-plan/<int:pk>/reject/", reject_crop_plan),

    # News (farmer-facing)
    path("news/", views.farmer_news_list, name="farmer-news-list"),

    # News (admin-style actions, still open to all auth users for now)
    path("admin/news/", admin_news_list_create_view, name="admin-news-list-create"),
    path(
        "admin/news/<int:pk>/approve/",
        admin_news_approve_view,
        name="admin-news-approve",
    ),
    path(
        "admin/news/<int:pk>/reject/",
        admin_news_reject_view,
        name="admin-news-reject",
    ),

    # Yield estimate
    path("yield-estimate/", yield_estimate_view, name="yield-estimate"),

    # Location helpers
    path(
        "location/pincode-lookup/",
        pincode_lookup_view,
        name="pincode_lookup",
    ),
    path(
        "location/reverse-geocode/",
        reverse_geocode_view,
        name="reverse_geocode",
    ),
]
