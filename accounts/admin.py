from django.contrib import admin
from .models import Account, AdminAccount, FarmerAccount


@admin.register(AdminAccount)
class AdminAccountAdmin(admin.ModelAdmin):
    list_display = ("phone", "name", "role", "created_at")
    list_filter = ("role", "created_at")
    search_fields = ("phone", "name")

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.filter(role="admin")


@admin.register(FarmerAccount)
class FarmerAccountAdmin(admin.ModelAdmin):
    list_display = ("phone", "name", "role", "created_at")
    list_filter = ("role", "created_at")
    search_fields = ("phone", "name")

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.filter(role="farmer")
