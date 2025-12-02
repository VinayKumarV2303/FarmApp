from django.contrib.auth.models import User
from django.contrib.auth import login
from django.views.decorators.csrf import csrf_exempt

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

from .models import Farmer, Land, News, CropPlan
from .serializers import (
    FarmerProfileSerializer,
    LandSerializer,
    NewsSerializer,
    CropPlanSerializer,
)

# 🔁 mirror record into recommendation app for admin view
from recommendation.models import FarmerCropPlan


# =========================
# 🔐 OTP AUTH (DEV MODE)
# =========================

@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def send_otp_view(request):
    """
    Dev-only OTP sender.
    Always returns otp = '1234'.
    """
    phone = request.data.get("phone")
    if not phone:
        return Response(
            {"detail": "Phone number is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    otp = "1234"
    print(f"\n📌 DEV OTP for {phone} = {otp}\n")

    return Response({"success": True, "otp": otp}, status=status.HTTP_200_OK)


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def verify_otp_view(request):
    """
    Dev-only OTP verify.
    Accepts ANY phone, OTP must be '1234'.
    Creates User + Farmer if not exists.
    Returns token + farmer info.
    """
    phone = request.data.get("phone")
    otp = request.data.get("otp")

    if not phone or not otp:
        return Response(
            {"detail": "Phone and OTP required"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if otp != "1234":
        return Response(
            {"detail": "Invalid OTP."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Create or fetch user
    user, created = User.objects.get_or_create(username=phone)
    if created:
        Farmer.objects.create(user=user, phone=phone)

    # Optional session login
    login(request, user)
    farmer = user.farmer

    # Token
    token, _ = Token.objects.get_or_create(user=user)

    return Response(
        {
            "id": farmer.id,
            "name": farmer.name,
            "phone": farmer.phone,
            "token": token.key,
        },
        status=status.HTTP_200_OK,
    )


# =========================
# 👤 FARMER PROFILE
# =========================

@api_view(["GET", "PUT"])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def farmer_profile_view(request):
    farmer = request.user.farmer

    if request.method == "GET":
        farmer_data = FarmerProfileSerializer(farmer).data
        lands = Land.objects.filter(farmer=farmer).order_by("-created_at")
        lands_data = LandSerializer(lands, many=True).data
        return Response({"farmer": farmer_data, "lands": lands_data})

    serializer = FarmerProfileSerializer(farmer, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response({"farmer": serializer.data}, status=status.HTTP_200_OK)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# =========================
# 🌾 MULTI-LAND VIEWS
# =========================

class LandListCreateView(generics.ListCreateAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = LandSerializer

    def get_queryset(self):
        return Land.objects.filter(
            farmer=self.request.user.farmer
        ).order_by("-created_at")

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
        """
        land_id comes from frontend.
        We attach the Land instance, validate acres,
        create CropPlan + nested crops,
        and mirror a record in recommendation.FarmerCropPlan
        (for Django admin at /admin/recommendation/farmercropplan/).
        """
        land_id = request.data.get("land_id")
        if not land_id:
            return Response(
                {"detail": "land_id required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            land = Land.objects.get(id=land_id, farmer=request.user.farmer)
        except Land.DoesNotExist:
            return Response(
                {"detail": "Invalid land"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # No strict approval check for now:
        # if land.approval_status != "approved": ...

        total_acres_allocated = float(
            request.data.get("total_acres_allocated", 0) or 0
        )
        if land.land_area and total_acres_allocated > land.land_area:
            return Response(
                {"detail": "Allocated acres exceed land area"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # land + farmer get bound here
        crop_plan = self.perform_create(serializer, land)

        # 🔁 ALSO create a record in recommendation.FarmerCropPlan
        # ⚠️ adjust field names if your FarmerCropPlan is different
        try:
            FarmerCropPlan.objects.create(
                farmer=request.user.farmer,
                land=land,
                season=serializer.validated_data.get("season", ""),
                soil_type=serializer.validated_data.get("soil_type", ""),
                irrigation_type=serializer.validated_data.get(
                    "irrigation_type", ""
                ),
                total_acres_allocated=serializer.validated_data.get(
                    "total_acres_allocated", 0
                ),
                # crop_plan=crop_plan,   # uncomment if FK exists
            )
        except Exception as e:
            # Don't block farmer if mirror fails; just log
            print("Failed to create FarmerCropPlan in recommendation app:", e)

        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )

    def perform_create(self, serializer, land):
        # Return created object so we can optionally link it
        return serializer.save(farmer=self.request.user.farmer, land=land)


class CropPlanDetailView(generics.RetrieveUpdateDestroyAPIView):
    authentication_classes = [TokenAuthentication]
    permission_classes = [IsAuthenticated]
    serializer_class = CropPlanSerializer

    def get_queryset(self):
        return CropPlan.objects.filter(farmer=self.request.user.farmer)


# =========================
# 📰 NEWS (PUBLIC)
# =========================

@api_view(["GET"])
@permission_classes([AllowAny])
def news_list_view(request):
    qs = News.objects.filter(is_active=True).order_by(
        "-is_important", "-created_at"
    )
    serializer = NewsSerializer(qs, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)
