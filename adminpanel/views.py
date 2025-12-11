# adminpanel/views.py
from functools import wraps
import logging

from django.conf import settings
from django.views.decorators.csrf import csrf_exempt

from rest_framework.decorators import api_view, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework import status

from accounts.models import AdminAccount
from farmer.models import News, Farmer, Land, CropPlan, CropAllocation

from .serializers import NewsSerializer

logger = logging.getLogger(__name__)

# ----------------------
# Admin auth decorator
# ----------------------
def require_admin_token(view_func):
    @wraps(view_func)
    def wrapped(request, *args, **kwargs):
        auth_header = (request.headers.get("Authorization") or request.META.get("HTTP_AUTHORIZATION") or "")
        token_raw = auth_header.strip()
        token = token_raw
        low = token_raw.lower()
        if low.startswith("bearer "):
            token = token_raw[7:].strip()
        elif low.startswith("token "):
            token = token_raw[6:].strip()

        admin_obj = None
        if token.startswith("admin-"):
            try:
                admin_id = int(token.split("-", 1)[1])
                admin_obj = AdminAccount.objects.filter(id=admin_id).first()
            except Exception:
                admin_obj = None

        if admin_obj is None and settings.DEBUG:
            admin_obj = AdminAccount.objects.first()

        if admin_obj is None:
            return Response({"detail": "Admin token missing or invalid"}, status=status.HTTP_401_UNAUTHORIZED)

        request.admin_account = admin_obj
        return view_func(request, *args, **kwargs)
    return wrapped


# ----------------------
# Helpers
# ----------------------
def _choose_order_field_for_news():
    model_field_names = {f.name for f in News._meta.get_fields() if hasattr(f, "name")}
    if "created_at" in model_field_names:
        return "created_at"
    if "published_at" in model_field_names:
        return "published_at"
    return "id"


# ----------------------
# Admin dashboard
# ----------------------
@api_view(["GET"])
@require_admin_token
def admin_dashboard(request):
    farmers_count = Farmer.objects.count() if "farmer" in settings.INSTALLED_APPS else 0
    lands_count = Land.objects.count() if "farmer" in settings.INSTALLED_APPS else 0
    cropplans_count = CropPlan.objects.count() if "farmer" in settings.INSTALLED_APPS else 0
    news_count = News.objects.count() if "farmer" in settings.INSTALLED_APPS else 0

    data = {
        "farmers_count": farmers_count,
        "lands_count": lands_count,
        "cropplans_count": cropplans_count,
        "news_count": news_count,
    }
    return Response(data, status=status.HTTP_200_OK)


# ----------------------
# Approvals endpoints (minimal)
# ----------------------
@api_view(["GET"])
@require_admin_token
def approvals_lands(request):
    qs = Land.objects.all().order_by("-id")[:50]
    payload = []
    for l in qs:
        payload.append({
            "id": l.id,
            "farmer_id": getattr(l, "farmer_id", None),
            "area": getattr(l, "area", None),
            "approval_status": getattr(l, "approval_status", None),
        })
    return Response(payload, status=status.HTTP_200_OK)


@api_view(["GET"])
@require_admin_token
def approvals_crop_plans(request):
    qs = CropPlan.objects.all().order_by("-id")[:50]
    payload = []
    for cp in qs:
        payload.append({
            "id": cp.id,
            "farmer_id": getattr(cp, "farmer_id", None),
            "crop": getattr(cp, "crop_id", None),
            "status": getattr(cp, "status", None),
        })
    return Response(payload, status=status.HTTP_200_OK)


# ----------------------
# News endpoints (list/create)
# ----------------------
@api_view(["GET", "POST"])
@parser_classes([MultiPartParser, FormParser])
@csrf_exempt
@require_admin_token
def news_list_create(request):
    order_field = _choose_order_field_for_news()

    if request.method == "GET":
        qs = News.objects.all().order_by("-is_important", f"-{order_field}")
        serializer = NewsSerializer(qs, many=True, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    serializer = NewsSerializer(data=request.data)
    if serializer.is_valid():
        obj = serializer.save()
        return Response(NewsSerializer(obj, context={"request": request}).data, status=status.HTTP_201_CREATED)

    if settings.DEBUG:
        logger.debug("News create validation errors: %s", serializer.errors)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ----------------------
# Delete single news (optional)
# ----------------------
@api_view(["DELETE"])
@require_admin_token
def news_delete(request, pk):
    try:
        obj = News.objects.get(pk=pk)
    except News.DoesNotExist:
        return Response({"detail": "Not found"}, status=status.HTTP_404_NOT_FOUND)
    obj.delete()
    return Response({"detail": "deleted"}, status=status.HTTP_204_NO_CONTENT)
