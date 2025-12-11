# adminpanel/urls.py
from django.urls import path
from . import views

app_name = "adminpanel"

urlpatterns = [
    # keep admin dashboard UI route
    path("dashboard/", views.admin_dashboard, name="admin_dashboard"),

    # API routes (use explicit /api/ prefix)
    path("api/approvals/lands/", views.approvals_lands, name="approvals_lands"),
    path("api/approvals/crop-plans/", views.approvals_crop_plans, name="approvals_crop_plans"),
    path("api/news/", views.news_list_create, name="news_list_create"),           # GET / POST
    path("api/news/<int:pk>/", views.news_delete, name="news_delete"),           # DELETE
]
