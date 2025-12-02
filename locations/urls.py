from django.urls import path
from .views import StateListAPIView, DistrictListAPIView, VillageListAPIView

urlpatterns = [
    path("states/", StateListAPIView.as_view(), name="state-list"),
    path("districts/", DistrictListAPIView.as_view(), name="district-list"),
    path("villages/", VillageListAPIView.as_view(), name="village-list"),
]
