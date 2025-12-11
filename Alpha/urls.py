# Alpha/urls.py
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from accounts.views import admin_login

urlpatterns = [
    path("admin/api/login/", admin_login),
    path("adminpanel/", include("adminpanel.urls")),
    path("farmer/", include("farmer.urls")),
    path("admin/", admin.site.urls),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
