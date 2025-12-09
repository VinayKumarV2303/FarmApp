# Alpha/urls.py
from django.contrib import admin
from django.urls import path, include

from accounts.views import admin_login

urlpatterns = [
    path("admin/api/login/", admin_login),
    path("adminpanel/", include("adminpanel.urls")),
    path("farmer/", include("farmer.urls")),
    path("admin/", admin.site.urls),
]
