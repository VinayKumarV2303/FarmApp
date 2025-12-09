# adminpanel/urls.py
from django.urls import path
from .views import (
    admin_dashboard,
    land_approvals_list,
    land_approval_update,
    crop_plan_approvals_list,
    crop_plan_approval_update,
    news_list_create,  # ✅ new
)

urlpatterns = [
    # Admin dashboard stats
    path("api/dashboard/", admin_dashboard, name="admin-dashboard"),

    # Land approvals
    path(
        "api/approvals/lands/",
        land_approvals_list,
        name="admin-land-approvals-list",
    ),
    path(
        "api/approvals/lands/<int:land_id>/",
        land_approval_update,
        name="admin-land-approval-update",
    ),

    # Crop plan approvals
    path(
        "api/approvals/crop-plans/",
        crop_plan_approvals_list,
        name="admin-crop-approvals-list",
    ),
    path(
        "api/approvals/crop-plans/<int:plan_id>/",
        crop_plan_approval_update,
        name="admin-crop-approval-update",
    ),

    # News (admin)
    path(
        "api/news/",
        news_list_create,
        name="admin-news-list-create",
    ),
]
