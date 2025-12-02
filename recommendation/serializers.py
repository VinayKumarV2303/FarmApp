from rest_framework import serializers
from .models import FarmerCropPlan

class FarmerCropPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = FarmerCropPlan
        fields = '__all__'
