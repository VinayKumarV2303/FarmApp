from rest_framework.decorators import api_view
from rest_framework.response import Response
from django.db.models import Sum
from django.db import IntegrityError

from accounts.models import Account
from farmer.models import Farmer
from recommendation.models import FarmerCropPlan, Crop, Season
from recommendation.serializers import FarmerCropPlanSerializer


# ---------------- CREATE CROP PLAN ---------------- #
@api_view(['POST'])
def create_crop_plan(request):
    user_id = request.data.get("user_id")
    crop_id = request.data.get("crop_id")
    season_id = request.data.get("season_id")
    area = request.data.get("area_planned")

    # Required field validation
    if not all([user_id, crop_id, season_id, area]):
        return Response({"error": "All fields are required"}, status=400)

    try:
        user = Account.objects.get(id=user_id)
        farmer = Farmer.objects.get(user=user)
        crop = Crop.objects.get(id=crop_id)
        season = Season.objects.get(id=season_id)
    except Account.DoesNotExist:
        return Response({"error": "User not found"}, status=404)
    except Farmer.DoesNotExist:
        return Response({"error": "Farmer profile does not exist"}, status=404)
    except Crop.DoesNotExist:
        return Response({"error": "Crop not found"}, status=404)
    except Season.DoesNotExist:
        return Response({"error": "Season not found"}, status=404)

    # Validation for area
    if float(area) <= 0:
        return Response({"error": "Area must be greater than zero"}, status=400)

    # Create or prevent duplicates
    try:
        plan = FarmerCropPlan.objects.create(
            farmer=farmer,
            crop=crop,
            season=season,
            area_planned=area,
        )
    except IntegrityError:
        return Response({"error": "Plan already exists for this crop and season"}, status=409)

    return Response({
        "success": True,
        "message": "Crop plan saved successfully",
        "data": FarmerCropPlanSerializer(plan).data
    }, status=201)


# ---------------- GET ALL PLANS FOR A FARMER ---------------- #
@api_view(['GET'])
def get_farmer_plans(request, farmer_id):
    plans = FarmerCropPlan.objects.filter(farmer_id=farmer_id)
    serializer = FarmerCropPlanSerializer(plans, many=True)
    return Response(serializer.data)


# ---------------- RECOMMEND CROPS BASED ON SHORTAGE INDEX ---------------- #
@api_view(['GET'])
def recommend_crops(request, user_id):
    try:
        farmer = Farmer.objects.get(user_id=user_id)
    except Farmer.DoesNotExist:
        return Response({"error": "Farmer not found"}, status=404)

    crop_plans = FarmerCropPlan.objects.values('crop').annotate(total_area=Sum('area_planned'))
    benchmark_area = 100  # Example threshold

    good = []
    risky = []

    for cp in crop_plans:
        crop = Crop.objects.get(id=cp['crop'])
        if cp['total_area'] < benchmark_area:
            good.append(crop.name)
        else:
            risky.append(crop.name)

    return Response({
        "good_crops": good,
        "risky_crops": risky
    })


# ---------------- COMBINED FARMER DASHBOARD ---------------- #
@api_view(['GET'])
def dashboard(request, user_id):
    """
    Dashboard for a farmer.
    user_id = Account.id (phone-based user)
    If Farmer profile doesn't exist yet, return empty/default data instead of 404.
    """
    # Try to find farmer profile for this account
    farmer = Farmer.objects.filter(user_id=user_id).first()

    if farmer:
        plans = FarmerCropPlan.objects.filter(farmer_id=farmer.id)
        plans_data = FarmerCropPlanSerializer(plans, many=True).data

        # Recommendation engine reuse
        crop_plans = FarmerCropPlan.objects.values('crop').annotate(total_area=Sum('area_planned'))
        benchmark_area = 100

        good = []
        risky = []

        for cp in crop_plans:
            crop = Crop.objects.get(id=cp['crop'])
            if cp['total_area'] < benchmark_area:
                good.append(crop.name)
            else:
                risky.append(crop.name)

        farmer_data = {
            "name": farmer.user.name or farmer.user.phone,
            "village": farmer.village,
            "district": farmer.district,
            "state": farmer.state,
            "land_size": farmer.land_size,
        }

    else:
        # No Farmer profile yet → show minimal info, no plans, no recommendations
        try:
            account = Account.objects.get(id=user_id)
            name = account.name or account.phone
        except Account.DoesNotExist:
            return Response({"error": "Account not found"}, status=404)

        farmer_data = {
            "name": name,
            "village": "",
            "district": "",
            "state": "",
            "land_size": 0,
        }
        plans_data = []
        good = []
        risky = []

    return Response({
        "farmer": farmer_data,
        "my_plans": plans_data,
        "good_crops": good,
        "risky_crops": risky,
    })
