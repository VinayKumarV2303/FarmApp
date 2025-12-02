from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('accounts/', include('accounts.urls')),
    path('farmer/', include('farmer.urls')),
    path('adminpanel/', include('adminpanel.urls')),
    path('recommendation/', include('recommendation.urls')),
    path("locations/", include("locations.urls")),
]
