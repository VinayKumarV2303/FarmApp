from django.urls import path
from . import views

urlpatterns = [
    path("send-otp/", views.send_otp_view, name="send-otp"),
    path("verify-otp/", views.verify_otp_view, name="verify-otp"),

    path("profile/", views.farmer_profile_view, name="farmer-profile"),

    path("land/", views.LandListCreateView.as_view(), name="farmer-land-list"),
    path("land/<int:pk>/", views.LandDetailView.as_view(), name="farmer-land-detail"),

    path("crop-plan/", views.CropPlanListCreateView.as_view(), name="crop-plan-list"),
    path(
        "crop-plan/<int:pk>/",
        views.CropPlanDetailView.as_view(),
        name="crop-plan-detail",
    ),

    path("news/", views.news_list_view, name="farmer-news"),
]
