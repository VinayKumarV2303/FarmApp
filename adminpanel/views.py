# adminpanel/views.py
from functools import wraps

from django.conf import settings
from django.views.decorators.csrf import csrf_exempt

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status, serializers

from accounts.models import Account, AdminAccount
from farmer.models import Farmer, Land, CropPlan, CropAllocation, News
from django.db.models import Count, Sum


# --------- ADMIN TOKEN GUARD ----------

def require_admin_token(view_func):
    """
    Admin auth for dev.

    Accepts ANY of these headers:

      Authorization: Bearer admin-<id>
      Authorization: Token admin-<id>
      Authorization: admin-<id>
      Authorization: Bearer admintoken-<id>-<sig>   (old format)

    And when DEBUG=True and token is missing/invalid, it will
    fall back to the FIRST AdminAccount so you are not blocked
    during local development.
    """

    @wraps(view_func)
    def wrapped(request, *args, **kwargs):
        auth_header = (
            request.headers.get("Authorization")
            or request.META.get("HTTP_AUTHORIZATION")
            or ""
        )

        raw = auth_header.strip()
        token = raw

        low = raw.lower()
        if low.startswith("bearer "):
            token = raw[7:].strip()
        elif low.startswith("token "):
            token = raw[6:].strip()

        admin_obj = None

        if token.startswith("admin-"):
            try:
                admin_id = int(token.split("-", 1)[1])
                admin_obj = AdminAccount.objects.filter(id=admin_id).first()
            except Exception:
                admin_obj = None

        elif token.startswith("admintoken-"):
            parts = token.split("-")
            if len(parts) >= 2:
                try:
                    admin_id = int(parts[1])
                    admin_obj = AdminAccount.objects.filter(id=admin_id).first()
                except Exception:
                    admin_obj = None

        if admin_obj is None and settings.DEBUG:
            admin_obj = AdminAccount.objects.first()

        if admin_obj is None:
            return Response(
                {"detail": "Admin token missing or invalid"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        request.admin_account = admin_obj
        return view_func(request, *args, **kwargs)

    return wrapped


# --------- SERIALIZERS ----------

class NewsSerializer(serializers.ModelSerializer):
    class Meta:
        model = News
        fields = [
            "id",
            "title",
            "summary",
            "content",
            "image_url",
            "url",
            "tags",
            "is_important",
            "is_active",
            "status",
            "created_at",
            "updated_at",
        ]


# --------- HELPERS ----------

def sync_farmer_approval_from_lands(farmer: Farmer):
    lands_qs = farmer.lands.all()
    if not lands_qs.exists():
        farmer.approval_status = farmer.approval_status or "pending"
        farmer.save(update_fields=["approval_status"])
        return

    statuses = list(lands_qs.values_list("approval_status", flat=True))
    if "pending" in statuses:
        farmer.approval_status = "pending"
    elif all(s == "approved" for s in statuses):
        farmer.approval_status = "approved"
    else:
        farmer.approval_status = "rejected"

    farmer.save(update_fields=["approval_status"])


# --------- DASHBOARD ----------

@api_view(["GET"])
@require_admin_token
def admin_dashboard(request):
    total_users = Account.objects.count()
    farmer_qs = Farmer.objects.filter(lands__isnull=False).distinct()
    total_farmers = farmer_qs.count()
    profiles_completed = farmer_qs.exclude(village=None).exclude(village="").count()

    farmers_by_district_qs = (
        farmer_qs.values("district").annotate(count=Count("id")).order_by("-count")
    )

    chart_labels = []
    chart_values = []
    for row in farmers_by_district_qs:
        district = row["district"] or "Unknown"
        chart_labels.append(district)
        chart_values.append(row["count"])

    land_summary = {"Pending": 0, "Approved": 0, "Rejected": 0}
    for row in Land.objects.values("approval_status").annotate(count=Count("id")):
        raw_status = row["approval_status"]
        if raw_status == "approved":
            land_summary["Approved"] += row["count"]
        elif raw_status == "rejected":
            land_summary["Rejected"] += row["count"]
        else:
            land_summary["Pending"] += row["count"]

    pending_farmer_ids = (
        Land.objects.filter(approval_status="pending")
        .values_list("farmer_id", flat=True)
        .distinct()
    )

    pending_qs = (
        Farmer.objects.select_related("user")
        .filter(id__in=pending_farmer_ids)
        .order_by("id")[:10]
    )

    pending_farmers = []
    for f in pending_qs:
        pending_farmers.append(
            {
                "id": f.id,
                "username": getattr(f.user, "username", ""),
                "name": getattr(f, "name", "") or f.user.get_full_name(),
                "phone": getattr(f, "phone", ""),
                "village": getattr(f, "village", ""),
                "district": getattr(f, "district", ""),
                "state": getattr(f, "state", ""),
                "land_area": getattr(f, "land_area", ""),
                "approval_status": getattr(f, "approval_status", "") or "pending",
                "admin_remark": getattr(f, "admin_remark", "") or "",
            }
        )

    return Response(
        {
            "total_users": total_users,
            "total_farmers": total_farmers,
            "profiles_completed": profiles_completed,
            "farmers_by_district": list(farmers_by_district_qs),
            "chart_labels": chart_labels,
            "chart_values": chart_values,
            "land_approval_summary": land_summary,
            "pending_farmers": pending_farmers,
        }
    )


# --------- LAND APPROVALS ----------

@api_view(["GET"])
@require_admin_token
def land_approvals_list(request):
    status_param = request.GET.get("status", "All")

    qs = Land.objects.select_related("farmer__user").order_by("id")

    if status_param == "pending":
        qs = qs.exclude(approval_status="approved").exclude(approval_status="rejected")
    elif status_param == "approved":
        qs = qs.filter(approval_status="approved")
    elif status_param == "rejected":
        qs = qs.filter(approval_status="rejected")

    data = []
    for land in qs:
        farmer = land.farmer
        user = getattr(farmer, "user", None)

        if user:
            farmer_name = (
                user.get_full_name()
                or getattr(farmer, "name", "")
                or user.username
            )
        else:
            farmer_name = getattr(farmer, "name", "") if farmer else ""

        data.append(
            {
                "id": land.id,
                "farmer_name": farmer_name,
                "farmer_username": getattr(user, "username", "") if user else "",
                "farmer_phone": getattr(farmer, "phone", "") if farmer else "",
                "village": land.village or "",
                "district": land.district or "",
                "state": land.state or "",
                "land_area": float(land.land_area or 0),
                "approval_status": land.approval_status or "pending",
                "admin_remark": land.admin_remark or "",
            }
        )

    return Response(data)


@csrf_exempt
@api_view(["PATCH"])
@require_admin_token
def land_approval_update(request, land_id):
    try:
        land = Land.objects.select_related("farmer__user").get(id=land_id)
    except Land.DoesNotExist:
        return Response(
            {"detail": "Land not found"}, status=status.HTTP_404_NOT_FOUND
        )

    approval_status = request.data.get("approval_status")
    admin_remark = request.data.get("admin_remark")

    if approval_status:
        land.approval_status = approval_status
    if admin_remark is not None:
        land.admin_remark = admin_remark

    land.save()
    sync_farmer_approval_from_lands(land.farmer)

    return Response(
        {
            "message": "Land approval updated",
            "approval_status": land.approval_status,
            "admin_remark": land.admin_remark or "",
        }
    )


# --------- CROP PLAN APPROVALS ----------

def serialize_crop_plan_for_approval(plan: CropPlan):
    farmer = getattr(plan, "farmer", None)
    user = getattr(farmer, "user", None)
    land = getattr(plan, "land", None)

    if user:
        farmer_name = user.get_full_name() or getattr(farmer, "name", "") or user.username
    else:
        farmer_name = getattr(farmer, "name", "") if farmer else ""

    farmer_username = getattr(user, "username", "") if user else ""
    farmer_phone = getattr(farmer, "phone", "") if farmer else ""

    allocations = CropAllocation.objects.filter(crop_plan=plan)
    if allocations.exists():
        crop_names = sorted({a.crop_name for a in allocations if a.crop_name})
        if not crop_names:
            crop_label = f"Crop plan #{plan.id}"
        elif len(crop_names) == 1:
            crop_label = crop_names[0]
        else:
            crop_label = " + ".join(crop_names[:3])
            if len(crop_names) > 3:
                crop_label += f" (+{len(crop_names) - 3} more)"
    else:
        crop_label = f"Crop plan #{plan.id}"

    planned_area = getattr(plan, "total_acres_allocated", None)
    if planned_area is None:
        if allocations.exists():
            planned_area = (
                allocations.aggregate(total=Sum("acres")).get("total") or 0
            )
        elif land is not None:
            planned_area = land.land_area
        else:
            planned_area = 0

    return {
        "id": plan.id,
        "farmer_name": farmer_name,
        "farmer_username": farmer_username,
        "farmer_phone": farmer_phone,
        "village": getattr(land, "village", "") if land else "",
        "district": getattr(land, "district", "") if land else "",
        "state": getattr(land, "state", "") if land else "",
        "crop_name": crop_label,
        "season": getattr(plan, "season", "") or "",
        "planned_area": float(planned_area or 0),
        "approval_status": getattr(plan, "approval_status", "") or "pending",
        "admin_remark": getattr(plan, "admin_remark", "") or "",
    }


@api_view(["GET"])
@require_admin_token
def crop_plan_approvals_list(request):
    status_param = request.GET.get("status", "All")

    qs = CropPlan.objects.select_related("farmer__user", "land").order_by("id")

    if status_param == "pending":
        qs = qs.exclude(approval_status="approved").exclude(
            approval_status="rejected"
        )
    elif status_param == "approved":
        qs = qs.filter(approval_status="approved")
    elif status_param == "rejected":
        qs = qs.filter(approval_status="rejected")

    data = [serialize_crop_plan_for_approval(plan) for plan in qs]
    return Response(data)


@csrf_exempt
@api_view(["PATCH"])
@require_admin_token
def crop_plan_approval_update(request, plan_id):
    try:
        plan = CropPlan.objects.get(id=plan_id)
    except CropPlan.DoesNotExist:
        return Response(
            {"detail": "Crop plan not found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    approval_status = request.data.get("approval_status")
    admin_remark = request.data.get("admin_remark")

    if approval_status:
        plan.approval_status = approval_status
    if admin_remark is not None:
        plan.admin_remark = admin_remark

    plan.save()

    return Response(
        {
            "message": "Crop plan approval updated",
            "approval_status": plan.approval_status,
            "admin_remark": plan.admin_remark or "",
        }
    )


# --------- NEWS LIST + CREATE ----------

@api_view(["GET", "POST"])
@csrf_exempt
@require_admin_token
def news_list_create(request):
    """
    GET  -> list news items
    POST -> create a news item
    """
    if request.method == "GET":
        qs = News.objects.all().order_by("-created_at")
        serializer = NewsSerializer(qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    # POST
    serializer = NewsSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
