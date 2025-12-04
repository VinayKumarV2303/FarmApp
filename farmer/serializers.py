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
        # Keep all fields so approvals & admin side keep working
        fields = "__all__"
        # Only these should not be set from API payload
        read_only_fields = ("id", "farmer")


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
        extra_kwargs = {
            "seed_variety": {
                "required": False,
                "allow_null": True,
                "allow_blank": True,
            }
        }


class CropPlanSerializer(serializers.ModelSerializer):
    crops = CropAllocationSerializer(many=True, read_only=True)

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
            "approval_status",
            "admin_remark",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "land",
            "approval_status",
            "admin_remark",
            "created_at",
            "updated_at",
        ]


    def create(self, validated_data):
        crops_data = validated_data.pop("crops", [])

        # Retrieve farmer & land passed from view via serializer.save()
        farmer = validated_data.pop("farmer", None)
        land = validated_data.pop("land", None)

        # Create main crop plan
        crop_plan = CropPlan.objects.create(
            farmer=farmer,
            land=land,
            **validated_data
        )

        # Create nested crop allocation rows
        for crop in crops_data:
            CropAllocation.objects.create(crop_plan=crop_plan, **crop)

        return crop_plan
