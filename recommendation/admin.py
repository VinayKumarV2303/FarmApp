from django.contrib import admin
from .models import Crop, Region, Season
from .models import FarmerCropPlan

admin.site.register(Crop)
admin.site.register(Region)
admin.site.register(Season)
admin.site.register(FarmerCropPlan)