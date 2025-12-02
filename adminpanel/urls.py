from django.urls import path
from .views import (
    admin_dashboard,
    farmer_approvals_list,
    farmer_approval_update,
    land_approvals_list,
    land_approval_update,
)

urlpatterns = [
    path("api/dashboard/", admin_dashboard, name="admin_dashboard_api"),

    # Old farmer-level approvals
    path(
        "api/approvals/farmers/",
        farmer_approvals_list,
        name="farmer_approvals_list",
    ),
    path(
        "api/approvals/farmers/<int:farmer_id>/",
        farmer_approval_update,
        name="farmer_approval_update",
    ),

    # NEW: LAND-level approvals (used by React Approvals page)
    path(
        "api/approvals/lands/",
        land_approvals_list,
        name="land_approvals_list",
    ),
    path(
        "api/approvals/lands/<int:land_id>/",
        land_approval_update,
        name="land_approval_update",
    ),
]
