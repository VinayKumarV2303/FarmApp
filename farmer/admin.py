from django.contrib import admin
from .models import Farmer, Land, News, CropPlan, CropAllocation, CropYieldConfig
from django.utils.html import format_html
from .models import News

@admin.register(Farmer)
class FarmerAdmin(admin.ModelAdmin):
    list_display = ("user", "name", "village", "district", "state", "approval_status")


@admin.register(Land)
class LandAdmin(admin.ModelAdmin):
    list_display = ("farmer", "village", "district", "state", "land_area", "approval_status")


@admin.register(News)
class NewsAdmin(admin.ModelAdmin):
    list_display = ('title', 'published_at', 'is_active', 'status')
    search_fields = ('title', 'summary', 'content')
    list_filter = ('is_active', 'status', 'published_at')
    readonly_fields = ('preview',)
    fields = ('title', 'summary', 'content', 'image', 'image_url', 'preview', 'is_active', 'status', 'published_at')

    def preview(self, obj):
        if obj and obj.image:
            return format_html('<img src="{}" style="max-height:200px; max-width:400px;" />', obj.image.url)
        return "-"
    preview.short_description = 'Image Preview'

@admin.register(CropPlan)
class CropPlanAdmin(admin.ModelAdmin):
    list_display = ("id", "farmer", "land", "season", "total_acres_allocated", "created_at")
    list_filter = ("season", "created_at")
    search_fields = ("farmer__name", "land__village")


@admin.register(CropAllocation)
class CropAllocationAdmin(admin.ModelAdmin):
    list_display = ("crop_plan", "crop_name", "acres", "seed_variety", "sowing_date")
    search_fields = ("crop_name", "seed_variety")


@admin.register(CropYieldConfig)
class CropYieldConfigAdmin(admin.ModelAdmin):
    list_display = (
        "crop_name",
        "soil_type",
        "season",
        "irrigation_type",
        "yield_quintals_per_acre",
        "is_active",
        "updated_at",
    )
    list_filter = ("soil_type", "season", "irrigation_type", "is_active")
    search_fields = ("crop_name",)
