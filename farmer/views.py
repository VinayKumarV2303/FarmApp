# farmer/views.py
from decimal import Decimal

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

from .models import (
    Farmer,
    Land,
    News,
    CropPlan,
    CropYieldConfig,
    CropAllocation,
)
from .serializers import (
    FarmerProfileSerializer,
    LandSerializer,
    NewsSerializer,
    CropPlanSerializer,
)

from recommendation.models import FarmerCropPlan, Season


# =========================
# YIELD CONFIG (fallback logic)
# =========================

BASE_YIELD_PER_ACRE = {
    "Ragi": 5.6,
    "Paddy": 8.2,
    "Maize": 9.7,
    "Tur": 3.2,
    "Horse Gram": 2.4,
    "Cowpea": 2.8,
    "Groundnut": 3.2,
    "Pulses": 2.6,
    "Sugarcane": 360.0,
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
# OTP AUTH (DEV MODE) – FARMERS ONLY
# =========================
@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def send_otp_view(request):
    """
    Send OTP for farmer login / signup.
    mode = "login" | "signup"  (default: "login")

    - login: phone must exist, else 404 (account not found)
    - signup: phone must NOT exist, else 400 (account already exists)
    """
    phone = (request.data.get("phone") or "").strip()
    mode = (request.data.get("mode") or "login").lower()

    if not phone or len(phone) != 10 or not phone.isdigit():
        return Response(
            {"detail": "Valid 10-digit phone number is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Check existing account
    farmer_exists = Farmer.objects.filter(phone=phone).exists()
    user_exists = User.objects.filter(username=phone).exists()

    if mode == "login":
        # Must already exist
        if not (farmer_exists or user_exists):
            return Response(
                {
                    "detail": "Account not found for this mobile number. "
                    "Please sign up first."
                },
                status=status.HTTP_404_NOT_FOUND,
            )
    elif mode == "signup":
        # Must NOT exist
        if farmer_exists or user_exists:
            return Response(
                {
                    "detail": "Account already exists for this mobile number. "
                    "Please login instead."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
    else:
        return Response(
            {"detail": "Invalid mode. Use 'login' or 'signup'."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # DEV ONLY OTP
    otp = "1234"
    print(f"[DEV] OTP for {phone} (mode={mode}) = {otp}")

    return Response({"success": True, "otp": otp})


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def verify_otp_view(request):
    """
    Farmer OTP login/signup.

    mode = "login" | "signup"  (default: "login")

    - login: DO NOT create new farmer/user.
             If not found => 404.
    - signup: Create new user + farmer if not exists.
              If already exists => 400.
    """
    phone = (request.data.get("phone") or "").strip()
    otp = (request.data.get("otp") or "").strip()
    name = (request.data.get("name") or "").strip()
    mode = (request.data.get("mode") or "login").lower()

    if not phone or not otp:
        return Response({"detail": "Phone and OTP required"}, status=400)

    if otp != "1234":
        return Response({"detail": "Invalid OTP"}, status=400)

    if mode not in ("login", "signup"):
        return Response(
            {"detail": "Invalid mode. Use 'login' or 'signup'."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # ---------- LOGIN FLOW ----------
    if mode == "login":
        user = User.objects.filter(username=phone).first()
        if user is None:
            # No user => no account
            return Response(
                {
                    "detail": "Account not found for this mobile number. "
                    "Please sign up first."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Ensure a Farmer record exists for this user (healing only).
        farmer, _ = Farmer.objects.get_or_create(
            user=user,
            defaults={
                "phone": phone,
                "name": name or user.first_name or phone,
            },
        )

    # ---------- SIGNUP FLOW ----------
    else:  # mode == "signup"
        # Do not allow duplicate signup
        if User.objects.filter(username=phone).exists() or Farmer.objects.filter(
            phone=phone
        ).exists():
            return Response(
                {
                    "detail": "Account already exists for this mobile number. "
                    "Please login instead."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Create new user
        user = User.objects.create_user(username=phone)
        user.first_name = name or phone
        user.save()

        # Create new farmer mapped to user
        farmer = Farmer.objects.create(
            user=user,
            phone=phone,
            name=name or phone,
        )

    # ---------- LOGIN + TOKEN ----------
    login(request, user)
    token, _ = Token.objects.get_or_create(user=user)

    return Response(
        {
            "success": True,
            "token": token.key,
            "user": {
                "id": farmer.id,
                "name": farmer.name,
                "phone": farmer.phone,
                "role": "farmer",
            },
        }
    )


@api_view(["POST"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def cancel_signup_view(request):
    user = request.user

    try:
        farmer = user.farmer
    except Farmer.DoesNotExist:
        farmer = None

    if farmer is not None:
        farmer.delete()

    Token.objects.filter(user=user).delete()

    if not user.is_staff and not user.is_superuser:
        user.delete()

    return Response({"success": True}, status=status.HTTP_200_OK)


# =========================
# FARMER PROFILE API
# =========================
@api_view(["GET", "PUT"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def farmer_profile(request):
    """
    Return/update farmer profile.

    Does NOT auto-create farmer; if somehow missing,
    returns 404 instead of crashing.
    """
    try:
        farmer = request.user.farmer
    except Farmer.DoesNotExist:
        return Response(
            {"detail": "Farmer profile not found."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if request.method == "GET":
        lands_qs = Land.objects.filter(farmer=farmer).order_by("-created_at")
        lands_data = LandSerializer(lands_qs, many=True).data

        allocations_qs = (
            CropAllocation.objects.filter(crop_plan__farmer=farmer)
            .select_related("crop_plan__land")
            .order_by("id")
        )

        crop_plans_data = []

        if allocations_qs.exists():
            for alloc in allocations_qs:
                cp = alloc.crop_plan
                land = cp.land
                crop_plans_data.append(
                    {
                        "id": alloc.id,
                        "crop_name": alloc.crop_name,
                        "acres": float(alloc.acres),
                        "approval_status": cp.approval_status,
                        "season": cp.season,
                        "soil_type": cp.soil_type,
                        "irrigation_type": cp.irrigation_type,
                        "land_id": land.id if land else None,
                        "land_village": land.village if land else "",
                        "land_district": land.district if land else "",
                        "land_state": land.state if land else "",
                    }
                )
        else:
            plans_qs = (
                CropPlan.objects.filter(farmer=farmer)
                .select_related("land")
                .order_by("-created_at")
            )

            for cp in plans_qs:
                land = cp.land
                crop_plans_data.append(
                    {
                        "id": cp.id,
                        "crop_name": f"Crop plan #{cp.id}",
                        "acres": float(
                            getattr(cp, "total_acres_allocated", land.land_area)
                            or 0
                        ),
                        "approval_status": cp.approval_status,
                        "season": cp.season,
                        "soil_type": cp.soil_type,
                        "irrigation_type": cp.irrigation_type,
                        "land_id": land.id if land else None,
                        "land_village": land.village if land else "",
                        "land_district": land.district if land else "",
                        "land_state": land.state if land else "",
                    }
                )

        return Response(
            {
                "farmer": FarmerProfileSerializer(farmer).data,
                "lands": lands_data,
                "crop_plans": crop_plans_data,
            }
        )

    serializer = FarmerProfileSerializer(farmer, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response({"farmer": serializer.data})

    return Response(serializer.errors, status=400)


# =========================
# LAND VIEWS
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
# LOCATION HELPERS
# =========================
@api_view(["GET"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def pincode_lookup_view(request):
    pincode = (request.query_params.get("pincode") or "").strip()
    if not pincode or len(pincode) != 6:
        return Response({"detail": "Valid 6-digit pincode required"}, status=400)

    LOCAL_PINCODE_MAP = {
        "563101": {"district": "Kolar", "state": "Karnataka"},
    }

    if pincode in LOCAL_PINCODE_MAP:
        data = LOCAL_PINCODE_MAP[pincode]
        return Response(
            {"pincode": pincode, "district": data["district"], "state": data["state"]}
        )

    try:
        resp = requests.get(
            f"https://api.postalpincode.in/pincode/{pincode}",
            timeout=5,
        )
        resp.raise_for_status()
        data = resp.json()

        if not data or data[0].get("Status") != "Success":
            return Response({"detail": "Pincode not found"}, status=404)

        po_list = data[0].get("PostOffice") or []
        if not po_list:
            return Response({"detail": "Pincode not found"}, status=404)

        po = po_list[0]
        district = po.get("District") or ""
        state = po.get("State") or ""

        if not district and not state:
            return Response({"detail": "Pincode not found"}, status=404)

        return Response(
            {"pincode": pincode, "district": district, "state": state}
        )
    except Exception as e:
        print("Pincode lookup error:", e)
        return Response(
            {"detail": "Lookup failed"},
            status=status.HTTP_502_BAD_GATEWAY,
        )


@api_view(["GET"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def reverse_geocode_view(request):
    lat = request.query_params.get("lat")
    lng = request.query_params.get("lng")

    if not lat or not lng:
        return Response({"detail": "lat and lng required"}, status=400)

    try:
        resp = requests.get(
            "https://nominatim.openstreetmap.org/reverse",
            params={
                "lat": lat,
                "lon": lng,
                "format": "jsonv2",
                "addressdetails": 1,
            },
            headers={"User-Agent": "alpha-farm-app/1.0"},
            timeout=5,
        )
        resp.raise_for_status()
        data = resp.json()
        addr = data.get("address") or {}

        village = (
            addr.get("village")
            or addr.get("hamlet")
            or addr.get("suburb")
            or ""
        )
        district = addr.get("district") or addr.get("county") or ""
        state = addr.get("state") or ""
        pincode = addr.get("postcode") or ""

        return Response(
            {
                "village": village,
                "district": district,
                "state": state,
                "pincode": pincode,
                "latitude": float(lat),
                "longitude": float(lng),
            }
        )
    except Exception as e:
        print("Reverse geocode error:", e)
        return Response(
            {"detail": "Location lookup failed"},
            status=status.HTTP_502_BAD_GATEWAY,
        )


# =========================
# CROP PLAN VIEWS
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

        if (land.approval_status or "").lower() != "approved":
            return Response(
                {"detail": "Land not approved yet"},
                status=403,
            )

        crops = request.data.get("crops", []) or []

        crop_sum = 0.0
        for c in crops:
            try:
                crop_sum += float(c.get("acres", 0) or 0)
            except (TypeError, ValueError):
                pass

        existing_total = (
            CropPlan.objects.filter(farmer=self.request.user.farmer, land=land)
            .aggregate(total=Sum("total_acres_allocated"))
            .get("total")
            or 0
        )

        remaining_allowed = float(land.land_area or 0) - float(existing_total)

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

        request.data["total_acres_allocated"] = crop_sum

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        plan = serializer.save(farmer=self.request.user.farmer, land=land)

        plan.approval_status = "pending"
        plan.save()

        allocations = []
        for c in crops:
            name = c.get("crop_name") or c.get("name") or ""
            acres_raw = c.get("acres") or 0

            try:
                acres_val = Decimal(str(acres_raw))
            except Exception:
                acres_val = Decimal("0")

            if not name or acres_val <= 0:
                continue

            allocations.append(
                CropAllocation(
                    crop_plan=plan,
                    crop_name=name,
                    acres=acres_val,
                )
            )

        if allocations:
            CropAllocation.objects.bulk_create(allocations)

        season_value = plan.season
        season_instance = None
        if isinstance(season_value, Season):
            season_instance = season_value
        elif season_value:
            season_instance = Season.objects.filter(name=season_value).first()

        if season_instance is not None:
            FarmerCropPlan.objects.create(
                farmer=self.request.user.farmer,
                land=land,
                season=season_instance,
                soil_type=plan.soil_type,
                irrigation_type=plan.irrigation_type,
                total_acres_allocated=crop_sum,
            )

        return Response(serializer.data, status=201)


class CropPlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = CropPlanSerializer

    def get_queryset(self):
        return CropPlan.objects.filter(farmer=self.request.user.farmer)


# =========================
# ADMIN — Approve or Reject Crop Plans
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
# ADMIN — Manage News
# =========================
@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def admin_news_list_create_view(request):
    if request.method == "GET":
        qs = News.objects.all().order_by("-created_at")
        serializer = NewsSerializer(qs, many=True)
        return Response(serializer.data)

    data = request.data.copy()
    if hasattr(News, "STATUS_PENDING"):
        data["status"] = News.STATUS_PENDING

    serializer = NewsSerializer(data=data)
    if serializer.is_valid():
        news = serializer.save()
        return Response(NewsSerializer(news).data, status=201)

    return Response(serializer.errors, status=400)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_news_approve_view(request, pk):
    try:
        news = News.objects.get(pk=pk)
    except News.DoesNotExist:
        return Response({"detail": "Not found"}, status=404)

    if hasattr(News, "STATUS_APPROVED"):
        news.status = News.STATUS_APPROVED
    news.is_active = True
    news.save()
    return Response({"success": True})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def admin_news_reject_view(request, pk):
    try:
        news = News.objects.get(pk=pk)
    except News.DoesNotExist:
        return Response({"detail": "Not found"}, status=404)

    if hasattr(News, "STATUS_REJECTED"):
        news.status = News.STATUS_REJECTED
    news.is_active = False
    news.save()
    return Response({"success": True})


# =========================
# PUBLIC NEWS LIST (farmer)
# =========================
@api_view(["GET"])
@permission_classes([AllowAny])
def farmer_news_list(request):
    qs = News.objects.filter(is_active=True)

    if hasattr(News, "STATUS_APPROVED"):
        qs = qs.filter(status=News.STATUS_APPROVED)

    qs = qs.order_by("-is_important", "-created_at")

    serializer = NewsSerializer(qs, many=True)
    return Response(serializer.data)


# =========================
# REAL-TIME YIELD ESTIMATE
# =========================
@api_view(["GET"])
@permission_classes([AllowAny])
def yield_estimate_view(request):
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
                external_yield_per_acre = data.get("yield_quintals_per_acre")
                external_source = data.get("source", base_url)
        except Exception as e:
            print("Yield external API error:", e)

    db_yield_per_acre = None
    db_source = None

    if external_yield_per_acre is None:
        qs = CropYieldConfig.objects.filter(
            crop_name=crop,
            is_active=True,
        )

        def pick_config():
            cfg = qs.filter(
                soil_type=soil_type or "",
                season=season or "",
                irrigation_type=irrigation_type or "",
            ).first()
            if cfg:
                return cfg

            cfg = qs.filter(
                soil_type=soil_type or "",
                season=season or "",
                irrigation_type="",
            ).first()
            if cfg:
                return cfg

            cfg = qs.filter(
                soil_type=soil_type or "",
                season="",
                irrigation_type="",
            ).first()
            if cfg:
                return cfg

            return qs.filter(
                soil_type="",
                season="",
                irrigation_type="",
            ).first()

        cfg = pick_config()
        if cfg is not None:
            db_yield_per_acre = float(cfg.yield_quintals_per_acre)
            db_source = "db_crop_yield_config"

    if external_yield_per_acre is not None:
        yield_per_acre = float(external_yield_per_acre)
        source_used = external_source or "external_api"
    elif db_yield_per_acre is not None:
        yield_per_acre = db_yield_per_acre
        source_used = db_source
    else:
        base_per_acre = BASE_YIELD_PER_ACRE.get(crop, 5.0)
        soil_factor = SOIL_YIELD_FACTOR.get(soil_type, 1.0)
        season_factor = SEASON_YIELD_FACTOR.get(season, 1.0)
        irrigation_factor = IRRIGATION_YIELD_FACTOR.get(irrigation_type, 1.0)

        yield_per_acre = (
            base_per_acre * soil_factor * season_factor * irrigation_factor
        )
        source_used = "local_fallback_table"

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
