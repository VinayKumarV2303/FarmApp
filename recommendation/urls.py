from django.urls import path
from .views import create_crop_plan, get_farmer_plans, recommend_crops, dashboard

urlpatterns = [
    path('plan/', create_crop_plan),                          # POST plan crop
    path('plan/<int:farmer_id>/', get_farmer_plans),          # GET all plans for farmer
    path('recommend/<int:user_id>/', recommend_crops),        # GET recommendations
    path('dashboard/<int:user_id>/', dashboard),              # GET dashboard combined response
]
