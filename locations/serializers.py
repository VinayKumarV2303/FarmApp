from rest_framework import serializers
from .models import State, District, Village


class StateSerializer(serializers.ModelSerializer):
    class Meta:
        model = State
        fields = ("id", "name")


class DistrictSerializer(serializers.ModelSerializer):
    class Meta:
        model = District
        fields = ("id", "name", "state")


class VillageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Village
        fields = ("id", "name", "district")
