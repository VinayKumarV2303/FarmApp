
from django.db import models
from farmer.models import Farmer

class Season(models.Model):
    name = models.CharField(max_length=50)  # Kharif, Rabi, Zaid
    start_month = models.CharField(max_length=20, blank=True, null=True)
    end_month = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return self.name


class Region(models.Model):
    name = models.CharField(max_length=100)
    state = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.name}, {self.state}"


class Crop(models.Model):
    name = models.CharField(max_length=100)
    season = models.ForeignKey(Season, on_delete=models.SET_NULL, null=True)
    region = models.ForeignKey(Region, on_delete=models.SET_NULL, null=True)
    ideal_soil = models.CharField(max_length=100, blank=True, null=True)
    water_requirement = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return self.name
    
    

class FarmerCropPlan(models.Model):
    farmer = models.ForeignKey(Farmer, on_delete=models.CASCADE)
    crop = models.ForeignKey(Crop, on_delete=models.CASCADE)
    season = models.ForeignKey(Season, on_delete=models.CASCADE)
    area_planned = models.FloatField()  # Area in acres/hectares farmer plans to grow
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.farmer.user.name} - {self.crop.name} ({self.season.name})"

