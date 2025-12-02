from django.contrib import admin
from .models import Farmer, Land, News


@admin.register(Farmer)
class FarmerAdmin(admin.ModelAdmin):
    list_display = ("user", "name", "village", "district", "state", "approval_status")


@admin.register(Land)
class LandAdmin(admin.ModelAdmin):
    list_display = ("farmer", "village", "district", "state", "land_area", "approval_status")


@admin.register(News)
class NewsAdmin(admin.ModelAdmin):
    list_display = ("title", "is_important", "created_at", "is_active")
