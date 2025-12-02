from django.db import models
from django.contrib.auth.models import User


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

    # Legacy single-land total (you can keep this as summary if you want)
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

    # 🚩 Location fields
    country = models.CharField(
        max_length=100,
        blank=True,
        default="India",   # so you can auto-fill states for India
    )
    village = models.CharField(max_length=200, blank=True)
    district = models.CharField(max_length=200, blank=True)
    state = models.CharField(max_length=200, blank=True)

    # 🚜 Size
    land_area = models.FloatField(null=True, blank=True)

    # 🌎 Map pin (used by EditLand map UI)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    # 🧪 Extra land info (already used in ProfilePage)
    soil_type = models.CharField(max_length=100, blank=True)
    irrigation_type = models.CharField(max_length=100, blank=True)

    # ✅ Approval flow
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
        """
        If an APPROVED land is edited (location/area/soil/irrigation/etc changed)
        and the approval_status is not explicitly changed in the same save,
        automatically reset it back to 'pending' so that admin must approve again.
        """
        if self.pk is not None:
            try:
                old = Land.objects.get(pk=self.pk)
            except Land.DoesNotExist:
                old = None

            if old:
                # Fields that farmer typically edits from EditLand UI
                farmer_editable_fields = [
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

                # Check if any of these fields changed
                changed = any(
                    getattr(old, field) != getattr(self, field)
                    for field in farmer_editable_fields
                )

                # If previously approved and something changed, and we didn't
                # explicitly set a different status, reset to pending.
                if (
                    changed
                    and old.approval_status == "approved"
                    and self.approval_status == old.approval_status
                ):
                    self.approval_status = "pending"
                    # optional: clear old remark if you want a fresh review comment
                    # self.admin_remark = ""

        super().save(*args, **kwargs)


class News(models.Model):
    title = models.CharField(max_length=255)
    summary = models.TextField(blank=True)
    content = models.TextField(blank=True)

    tags = models.CharField(max_length=255, blank=True)

    is_important = models.BooleanField(default=False)
    author = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="farmer_news",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.title

    @property
    def author_name(self):
        if self.author:
            return self.author.get_full_name() or self.author.username
        return ""


class CropPlan(models.Model):
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

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"CropPlan #{self.id} for Land #{self.land_id}"


class CropAllocation(models.Model):
    crop_plan = models.ForeignKey(
        CropPlan,
        on_delete=models.CASCADE,
        related_name="crops",
    )

    crop_name = models.CharField(max_length=100)
    acres = models.DecimalField(max_digits=7, decimal_places=2)

    seed_variety = models.CharField(max_length=100, blank=True)
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
