from rest_framework import serializers
from .models import Farmer, Land, News, CropPlan, CropAllocation


class FarmerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Farmer
        fields = [
            "id",
            "name",
            "phone",
            "village",
            "district",
            "state",
            "land_area",
            "approval_status",
            "admin_remark",
        ]


class LandSerializer(serializers.ModelSerializer):
    class Meta:
        model = Land
        fields = "__all__"


class NewsSerializer(serializers.ModelSerializer):
    author_name = serializers.ReadOnlyField()

    class Meta:
        model = News
        fields = [
            "id",
            "title",
            "summary",
            "content",
            "tags",
            "is_important",
            "author_name",
            "created_at",
            "is_active",
        ]


class CropAllocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CropAllocation
        fields = [
            "id",
            "crop_name",
            "acres",
            "seed_variety",
            "sowing_date",
            "expected_harvest_date",
            "expected_yield_per_acre",
        ]


class CropPlanSerializer(serializers.ModelSerializer):
    # nested crop allocations
    crops = CropAllocationSerializer(many=True)

    class Meta:
        model = CropPlan
        fields = [
            "id",
            "land",
            "soil_type",
            "season",
            "irrigation_type",
            "notes",
            "total_acres_allocated",
            "crops",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "land",
        ]

    def create(self, validated_data):
        """
        Creates CropPlan + nested CropAllocation records.
        Farmer comes from request.user.farmer, land is passed from view via
        serializer.save(land=land).
        """
        request = self.context.get("request")
        farmer = None
        if request and hasattr(request, "user") and hasattr(request.user, "farmer"):
            farmer = request.user.farmer

        crops_data = validated_data.pop("crops", [])
        crop_plan = CropPlan.objects.create(farmer=farmer, **validated_data)

        for crop in crops_data:
            CropAllocation.objects.create(crop_plan=crop_plan, **crop)

        return crop_plan
