from django.contrib import admin
from .models import Farmer, Land, News, CropPlan, CropAllocation


@admin.register(Farmer)
class FarmerAdmin(admin.ModelAdmin):
    list_display = ("user", "name", "village", "district", "state", "approval_status")


@admin.register(Land)
class LandAdmin(admin.ModelAdmin):
    list_display = ("farmer", "village", "district", "state", "land_area", "approval_status")


@admin.register(News)
class NewsAdmin(admin.ModelAdmin):
    list_display = ("title", "is_important", "created_at", "is_active")


@admin.register(CropPlan)
class CropPlanAdmin(admin.ModelAdmin):
    list_display = ("id", "farmer", "land", "season", "total_acres_allocated", "created_at")
    list_filter = ("season", "created_at")
    search_fields = ("farmer__name", "land__village")


@admin.register(CropAllocation)
class CropAllocationAdmin(admin.ModelAdmin):
    list_display = ("crop_plan", "crop_name", "acres", "seed_variety", "sowing_date")
    search_fields = ("crop_name", "seed_variety")
