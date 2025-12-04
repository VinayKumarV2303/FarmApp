from django.contrib.auth.models import User
from django.contrib.auth import login
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

import requests

from rest_framework.decorators import (
    api_view,
    permission_classes,
    authentication_classes,
)
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, generics
from rest_framework.authtoken.models import Token
from rest_framework.authentication import TokenAuthentication

from django.db.models import Sum

from .models import Farmer, Land, News, CropPlan
from .serializers import (
    FarmerProfileSerializer,
    LandSerializer,
    NewsSerializer,
    CropPlanSerializer,
)

from recommendation.models import FarmerCropPlan, Season


# =========================
# 🌾 YIELD CONFIG (fallback logic)
# =========================
# These are ONLY used when no external API is configured
# or when the external call fails. They are Kolar/Karnataka-style
# average yields in QUINTALS PER ACRE.

BASE_YIELD_PER_ACRE = {
    # Field crops (q/acre)
    "Ragi": 5.6,
    "Paddy": 8.2,
    "Maize": 9.7,
    "Tur": 3.2,
    "Horse Gram": 2.4,
    "Cowpea": 2.8,
    "Groundnut": 3.2,
    "Pulses": 2.6,
    "Sugarcane": 360.0,
    # Vegetables (q/acre)
    "Tomato": 100.0,
    "Potato": 100.0,
    "Onion": 80.0,
    "Beans": 32.0,
    "Cabbage": 92.0,
    "Cauliflower": 76.0,
    "Brinjal": 72.0,
    "Chilli": 12.0,
    "Carrot": 100.0,
    "Radish": 80.0,
    "Capsicum": 120.0,
    "Leafy Vegetables": 60.0,
}

SOIL_YIELD_FACTOR = {
    "Alluvial": 1.05,
    "Black": 1.05,
    "Red": 1.0,
    "Laterite": 0.9,
    "Desert": 0.7,
    "Mountain": 0.85,
    "Sandy Loam": 0.95,
    "Clay Loam": 1.0,
}

SEASON_YIELD_FACTOR = {
    "Kharif (Monsoon)": 1.0,
    "Rabi (Winter)": 1.05,
    "Zaid (Summer)": 0.9,
    "Perennial (All Year)": 1.0,
}

IRRIGATION_YIELD_FACTOR = {
    "Rainfed": 0.85,
    "Canal": 1.05,
    "Tube well": 1.0,
    "Drip": 1.1,
    "Sprinkler": 1.05,
}


# =========================
# 🔐 OTP AUTH (DEV MODE)
# =========================
@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def send_otp_view(request):
    phone = request.data.get("phone")
    if not phone:
        return Response({"detail": "Phone number is required"}, status=400)

    otp = "1234"
    print(f"📌 DEV OTP for {phone} = {otp}")
    return Response({"success": True, "otp": otp})


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def verify_otp_view(request):
    phone = request.data.get("phone")
    otp = request.data.get("otp")

    if not phone or not otp:
        return Response({"detail": "Phone and OTP required"}, status=400)

    if otp != "1234":
        return Response({"detail": "Invalid OTP"}, status=400)

    user, created = User.objects.get_or_create(username=phone)
    if created:
        Farmer.objects.create(user=user, phone=phone)

    login(request, user)
    farmer = user.farmer
    token, _ = Token.objects.get_or_create(user=user)

    return Response({
        "id": farmer.id,
        "name": farmer.name,
        "phone": farmer.phone,
        "token": token.key,
    })


# =========================
# 👤 FARMER PROFILE API
# =========================
@api_view(["GET", "PUT"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def farmer_profile_view(request):
    farmer = request.user.farmer

    if request.method == "GET":
        return Response({
            "farmer": FarmerProfileSerializer(farmer).data,
            "lands": LandSerializer(
                Land.objects.filter(farmer=farmer).order_by("-created_at"),
                many=True
            ).data,
            "crop_plans": CropPlanSerializer(
                CropPlan.objects.filter(farmer=farmer).order_by("-created_at"),
                many=True
            ).data,
        })

    serializer = FarmerProfileSerializer(farmer, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response({"farmer": serializer.data})

    return Response(serializer.errors, status=400)


# =========================
# 🌾 LAND VIEWS
# =========================
class LandListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = LandSerializer

    def get_queryset(self):
        farmer = self.request.user.farmer
        qs = Land.objects.filter(farmer=farmer).order_by("-created_at")

        if self.request.query_params.get("only_approved") in ("1", "true", "True"):
            qs = qs.filter(approval_status__iexact="approved")

        return qs

    def perform_create(self, serializer):
        serializer.save(farmer=self.request.user.farmer)


class LandDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = LandSerializer

    def get_queryset(self):
        return Land.objects.filter(farmer=self.request.user.farmer)


# =========================
# 🌱 CROP PLAN VIEWS
# =========================
class CropPlanListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = CropPlanSerializer

    def get_queryset(self):
        return CropPlan.objects.filter(
            farmer=self.request.user.farmer
        ).order_by("-created_at")

    def create(self, request, *args, **kwargs):
        land_id = request.data.get("land_id")
        if not land_id:
            return Response({"detail": "land_id required"}, status=400)

        try:
            land = Land.objects.get(id=land_id, farmer=request.user.farmer)
        except Land.DoesNotExist:
            return Response({"detail": "Invalid land"}, status=400)

        if land.approval_status.lower() != "approved":
            return Response(
                {"detail": "Land not approved yet"},
                status=403,
            )

        crops = request.data.get("crops", [])
        crop_sum = sum(float(c.get("acres", 0)) for c in crops)

        existing_total = (
            CropPlan.objects.filter(farmer=request.user.farmer, land=land)
            .aggregate(total=Sum("total_acres_allocated"))
            .get("total") or 0
        )

        remaining_allowed = float(land.land_area) - float(existing_total)

        if crop_sum > remaining_allowed:
            return Response(
                {
                    "detail": "Total crop allocation exceeds limit",
                    "allowed_remaining": remaining_allowed,
                    "requested": crop_sum,
                    "already_planned": float(existing_total),
                },
                status=400,
            )

        # keep total in request for serializer
        request.data["total_acres_allocated"] = crop_sum

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        plan = serializer.save(farmer=request.user.farmer, land=land)

        # mark plan as pending for admin
        plan.approval_status = "pending"
        plan.save()

        # 🔁 Try to map CropPlan.season (string or fk) to Season instance for FarmerCropPlan
        season_value = plan.season  # might be a string like "Zaid (Summer)"

        season_instance = None
        if isinstance(season_value, Season):
            season_instance = season_value
        elif season_value:
            # adjust "name" to correct field on Season model if needed
            season_instance = Season.objects.filter(name=season_value).first()

        # ✅ Create FarmerCropPlan only if a valid Season is found
        if season_instance is not None:
            FarmerCropPlan.objects.create(
                farmer=request.user.farmer,
                land=land,
                season=season_instance,
                soil_type=plan.soil_type,
                irrigation_type=plan.irrigation_type,
                total_acres_allocated=crop_sum,
            )
        # else: skip creating FarmerCropPlan (avoids 500 for now)

        return Response(serializer.data, status=201)


class CropPlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = CropPlanSerializer

    def get_queryset(self):
        return CropPlan.objects.filter(farmer=self.request.user.farmer)


# =========================
# 🏛 ADMIN — Approve or Reject Crop Plans
# =========================
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def approve_crop_plan(request, pk):
    if not request.user.is_staff:
        return Response({"detail": "Not admin"}, status=403)

    try:
        plan = CropPlan.objects.get(pk=pk)
        plan.approval_status = "approved"
        plan.admin_remark = request.data.get("remark", "")
        plan.save()
        return Response({"success": True})
    except CropPlan.DoesNotExist:
        return Response({"detail": "Not found"}, status=404)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def reject_crop_plan(request, pk):
    if not request.user.is_staff:
        return Response({"detail": "Not admin"}, status=403)

    try:
        plan = CropPlan.objects.get(pk=pk)
        plan.approval_status = "rejected"
        plan.admin_remark = request.data.get("remark", "")
        plan.save()
        return Response({"success": True})
    except CropPlan.DoesNotExist:
        return Response({"detail": "Not found"}, status=404)


# =========================
# 📰 PUBLIC NEWS LIST
# =========================
@api_view(["GET"])
@permission_classes([AllowAny])
def news_list_view(request):
    serializer = NewsSerializer(
        News.objects.filter(is_active=True).order_by("-is_important", "-created_at"),
        many=True
    )
    return Response(serializer.data)


# =========================
# 📈 REAL-TIME YIELD ESTIMATE API
# =========================
@api_view(["GET"])
@permission_classes([AllowAny])
def yield_estimate_view(request):
    """
    Estimate yield based on live/online data for a given crop & conditions.

    Query params:
      - crop (str)
      - acres (float)
      - soil_type (str)
      - season (str)
      - irrigation_type (str)
      - district (str, optional, default "Kolar")
      - state (str, optional, default "Karnataka")

    Behaviour:
      1) If settings.YIELD_API_URL is configured, it will try to call that
         external service to get a fresh yield_per_acre.
      2) If that fails or is not set, it falls back to local
         BASE_YIELD_PER_ACRE + adjustment factors.
    """
    crop = request.query_params.get("crop")
    acres_raw = request.query_params.get("acres")
    soil_type = request.query_params.get("soil_type")
    season = request.query_params.get("season")
    irrigation_type = request.query_params.get("irrigation_type")
    district = request.query_params.get("district", "Kolar")
    state = request.query_params.get("state", "Karnataka")

    try:
        acres = float(acres_raw or 0)
    except (TypeError, ValueError):
        acres = 0

    if not crop or acres <= 0:
        return Response(
            {"detail": "crop and valid acres (>0) are required"},
            status=400,
        )

    # -----------------------------
    # 1️⃣ Try EXTERNAL API (internet)
    # -----------------------------
    external_yield_per_acre = None
    external_source = None
    base_url = getattr(settings, "YIELD_API_URL", None)

    if base_url:
        try:
            resp = requests.get(
                base_url,
                params={
                    "crop": crop,
                    "district": district,
                    "state": state,
                    "soil_type": soil_type,
                    "season": season,
                    "irrigation_type": irrigation_type,
                },
                timeout=5,
            )
            if resp.status_code == 200:
                data = resp.json()
                # Expect your external service to return this field:
                # { "yield_quintals_per_acre": 12.3, ... }
                external_yield_per_acre = data.get("yield_quintals_per_acre")
                external_source = data.get("source", base_url)
        except Exception as e:
            # Fail silently to fallback – don't break the app
            print("Yield external API error:", e)

    # -----------------------------
    # 2️⃣ Fallback to local factors
    # -----------------------------
    if external_yield_per_acre is None:
        base_per_acre = BASE_YIELD_PER_ACRE.get(crop, 5.0)
        soil_factor = SOIL_YIELD_FACTOR.get(soil_type, 1.0)
        season_factor = SEASON_YIELD_FACTOR.get(season, 1.0)
        irrigation_factor = IRRIGATION_YIELD_FACTOR.get(irrigation_type, 1.0)

        yield_per_acre = base_per_acre * soil_factor * season_factor * irrigation_factor
        source_used = "local_fallback_table"
    else:
        yield_per_acre = float(external_yield_per_acre)
        source_used = external_source or "external_api"

    expected_yield = round(yield_per_acre * acres, 1)

    return Response(
        {
            "crop": crop,
            "district": district,
            "state": state,
            "acres": acres,
            "yield_per_acre": round(yield_per_acre, 2),
            "expected_yield": expected_yield,
            "unit": "quintals",
            "source": source_used,
        }
    )
