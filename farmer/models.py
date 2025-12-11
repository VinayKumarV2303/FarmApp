from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class Farmer(models.Model):
    APPROVAL_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="farmer",
    )

    name = models.CharField(max_length=200, blank=True)
    phone = models.CharField(max_length=20, blank=True)

    village = models.CharField(max_length=200, blank=True)
    district = models.CharField(max_length=200, blank=True)
    state = models.CharField(max_length=200, blank=True)

    land_area = models.FloatField(null=True, blank=True)

    approval_status = models.CharField(
        max_length=10,
        choices=APPROVAL_CHOICES,
        default="pending",
    )
    admin_remark = models.TextField(blank=True)

    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} farmer"


class Land(models.Model):
    APPROVAL_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    farmer = models.ForeignKey(
        Farmer,
        on_delete=models.CASCADE,
        related_name="lands",
    )

    country = models.CharField(max_length=100, blank=True, default="India")
    village = models.CharField(max_length=200, blank=True)
    district = models.CharField(max_length=200, blank=True)
    state = models.CharField(max_length=200, blank=True)

    land_area = models.FloatField(null=True, blank=True)

    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    soil_type = models.CharField(max_length=100, blank=True)
    irrigation_type = models.CharField(max_length=100, blank=True)

    approval_status = models.CharField(
        max_length=10,
        choices=APPROVAL_CHOICES,
        default="pending",
    )
    admin_remark = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Land #{self.id} - {self.farmer.user.username}"

    def save(self, *args, **kwargs):
        if self.pk:
            old = Land.objects.filter(pk=self.pk).first()
            if old:
                editable_fields = [
                    "country",
                    "village",
                    "district",
                    "state",
                    "land_area",
                    "latitude",
                    "longitude",
                    "soil_type",
                    "irrigation_type",
                ]

                changed = any(
                    getattr(old, f) != getattr(self, f)
                    for f in editable_fields
                )

                if (
                    changed
                    and old.approval_status == "approved"
                    and self.approval_status == old.approval_status
                ):
                    self.approval_status = "pending"

        super().save(*args, **kwargs)


# 🔹 CLEAN NEWS MODEL (single definition)
# farmer/models.py

# farmer/models.py
class News(models.Model):
    title = models.CharField(max_length=255)
    summary = models.TextField(blank=True, null=True)
    content = models.TextField(blank=True, null=True)
    image = models.ImageField(upload_to='news_photos/', blank=True, null=True)
    image_url = models.URLField(blank=True, null=True)
    url = models.URLField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    is_important = models.BooleanField(default=False)
    status = models.CharField(max_length=20, default='pending')
    published_at = models.DateTimeField(default=timezone.now)

    # NEW field — created_at
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class CropPlan(models.Model):
    APPROVAL_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("rejected", "Rejected"),
    ]

    farmer = models.ForeignKey(
        Farmer,
        on_delete=models.CASCADE,
        related_name="crop_plans",
    )

    land = models.ForeignKey(
        Land,
        on_delete=models.CASCADE,
        related_name="crop_plans",
    )

    soil_type = models.CharField(max_length=100, blank=True)
    season = models.CharField(max_length=50, blank=True)
    irrigation_type = models.CharField(max_length=50, blank=True)
    notes = models.TextField(blank=True)

    total_acres_allocated = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        default=0,
    )

    approval_status = models.CharField(
        max_length=10,
        choices=APPROVAL_CHOICES,
        default="pending",
    )
    admin_remark = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"CropPlan #{self.id} for Land #{self.land_id}"

    def save(self, *args, **kwargs):
        if self.pk:
            old = CropPlan.objects.filter(pk=self.pk).first()
            if old:
                editable_fields = [
                    "soil_type",
                    "season",
                    "irrigation_type",
                    "notes",
                    "total_acres_allocated",
                ]

                changed = any(
                    getattr(old, f) != getattr(self, f)
                    for f in editable_fields
                )

                if (
                    changed
                    and old.approval_status == "approved"
                    and self.approval_status == old.approval_status
                ):
                    self.approval_status = "pending"
                    self.admin_remark = ""

        super().save(*args, **kwargs)


class CropAllocation(models.Model):
    crop_plan = models.ForeignKey(
        CropPlan,
        on_delete=models.CASCADE,
        related_name="crops",
    )

    crop_name = models.CharField(max_length=100)
    acres = models.DecimalField(max_digits=7, decimal_places=2)

    seed_variety = models.CharField(max_length=100, null=True, blank=True)
    sowing_date = models.DateField(null=True, blank=True)
    expected_harvest_date = models.DateField(null=True, blank=True)
    expected_yield_per_acre = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.crop_name} - {self.acres} acres"


# 🔹 Admin-editable yield config per crop + factors
class CropYieldConfig(models.Model):
    SOIL_TYPES = [
        ("Alluvial", "Alluvial"),
        ("Black", "Black"),
        ("Red", "Red"),
        ("Laterite", "Laterite"),
        ("Desert", "Desert"),
        ("Mountain", "Mountain"),
        ("Sandy Loam", "Sandy Loam"),
        ("Clay Loam", "Clay Loam"),
    ]

    SEASONS = [
        ("Kharif (Monsoon)", "Kharif (Monsoon)"),
        ("Rabi (Winter)", "Rabi (Winter)"),
        ("Zaid (Summer)", "Zaid (Summer)"),
        ("Perennial (All Year)", "Perennial (All Year)"),
    ]

    IRRIGATION_TYPES = [
        ("Rainfed", "Rainfed"),
        ("Canal", "Canal"),
        ("Tube well", "Tube well"),
        ("Drip", "Drip"),
        ("Sprinkler", "Sprinkler"),
    ]

    crop_name = models.CharField(max_length=100)

    soil_type = models.CharField(
        max_length=50,
        choices=SOIL_TYPES,
        blank=True,
        default="",
    )
    season = models.CharField(
        max_length=50,
        choices=SEASONS,
        blank=True,
        default="",
    )
    irrigation_type = models.CharField(
        max_length=50,
        choices=IRRIGATION_TYPES,
        blank=True,
        default="",
    )

    # Yield per acre in QUINTALS (admin sets approx value)
    yield_quintals_per_acre = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )

    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Crop Yield Config"
        verbose_name_plural = "Crop Yield Configs"
        unique_together = (
            "crop_name",
            "soil_type",
            "season",
            "irrigation_type",
        )

    def __str__(self):
        parts = [self.crop_name]
        if self.soil_type:
            parts.append(self.soil_type)
        if self.season:
            parts.append(self.season)
        if self.irrigation_type:
            parts.append(self.irrigation_type)
        return " / ".join(parts)
