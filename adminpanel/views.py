# adminpanel/views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from accounts.models import Account
from farmer.models import Farmer, Land
from django.db.models import Count


def sync_farmer_approval_from_lands(farmer: Farmer):
    """
    Business rule:
    - A user is considered a farmer only if they have at least one Land.
    - Farmer.approval_status is derived from all their lands:
        - If ANY land is 'pending'  -> farmer = 'pending'
        - Else if ALL lands are 'approved' -> farmer = 'approved'
        - Else (no pending, some rejected) -> farmer = 'rejected'
    """
    lands_qs = farmer.lands.all()
    if not lands_qs.exists():
        # No lands: keep whatever is set, or treat as pending
        farmer.approval_status = farmer.approval_status or "pending"
        farmer.save(update_fields=["approval_status"])
        return

    statuses = list(lands_qs.values_list("approval_status", flat=True))
    if "pending" in statuses:
        farmer.approval_status = "pending"
    elif all(s == "approved" for s in statuses):
        farmer.approval_status = "approved"
    else:
        # No pending, at least one rejected
        farmer.approval_status = "rejected"

    farmer.save(update_fields=["approval_status"])


@api_view(["GET"])
def admin_dashboard(request):
    """
    Main admin dashboard stats:
    - total users
    - total farmers (ONLY users with at least one Land)
    - profiles completed
    - farmers by district (for charts)
    - approvals summary (by Land)
    - first 10 pending farmers (for quick view) – based on Land approvals
    """
    # Basic counts
    total_users = Account.objects.count()

    # A user is considered a farmer ONLY if they have at least one Land
    farmer_qs = Farmer.objects.filter(lands__isnull=False).distinct()

    total_farmers = farmer_qs.count()
    profiles_completed = farmer_qs.exclude(village=None).exclude(village="").count()

    # Farmers per district (among farmers who have lands)
    farmers_by_district_qs = (
        farmer_qs.values("district")
        .annotate(count=Count("id"))
        .order_by("-count")
    )

    chart_labels = []
    chart_values = []
    for row in farmers_by_district_qs:
        district = row["district"] or "Unknown"
        chart_labels.append(district)
        chart_values.append(row["count"])

    # ---------- Approval summary (by Land) ----------
    land_summary = {
        "Pending": 0,
        "Approved": 0,
        "Rejected": 0,
    }

    for row in Land.objects.values("approval_status").annotate(count=Count("id")):
        raw_status = row["approval_status"]  # 'pending' / 'approved' / 'rejected'
        if raw_status == "approved":
            land_summary["Approved"] += row["count"]
        elif raw_status == "rejected":
            land_summary["Rejected"] += row["count"]
        else:
            land_summary["Pending"] += row["count"]

    # ---------- Pending farmers list (based on Land) ----------
    # Farmer is "pending" if they have ANY pending Land
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
        # You can also show total land area (sum of lands)
        total_land_area = (
            f.lands.aggregate(total=Count("id"))  # or Sum('land_area') if you prefer
        )
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


# ----------------- (Optional) OLD farmer approvals – kept for backward compatibility -----------------


@api_view(["GET"])
def farmer_approvals_list(request):
    """
    Default: All farmers
    Filter: ?status=All / Pending / Approved / Rejected
    WARNING: This is farmer-level, new UI uses land_approvals_list instead.
    """
    status_param = request.GET.get("status", "All")

    qs = Farmer.objects.select_related("user").order_by("id")

    if status_param == "Pending":
        qs = qs.exclude(approval_status="approved").exclude(approval_status="rejected")
    elif status_param == "Approved":
        qs = qs.filter(approval_status="approved")
    elif status_param == "Rejected":
        qs = qs.filter(approval_status="rejected")
    # All -> no filter

    data = []
    for f in qs:
        data.append(
            {
                "id": f.id,
                "username": getattr(f.user, "username", ""),
                "name": getattr(f, "name", ""),
                "phone": getattr(f, "phone", ""),
                "village": getattr(f, "village", ""),
                "district": getattr(f, "district", ""),
                "state": getattr(f, "state", ""),
                "land_area": getattr(f, "land_area", ""),
                "approval_status": getattr(f, "approval_status", "") or "pending",
                "admin_remark": getattr(f, "admin_remark", "") or "",
            }
        )

    return Response(data)


@api_view(["PATCH"])
def farmer_approval_update(request, farmer_id):
    """
    Update approval_status and admin_remark for a farmer.
    (Not used by the new Land approvals UI)
    """
    try:
        farmer = Farmer.objects.get(id=farmer_id)
    except Farmer.DoesNotExist:
        return Response(
            {"detail": "Farmer not found"}, status=status.HTTP_404_NOT_FOUND
        )

    approval_status = request.data.get("approval_status")
    admin_remark = request.data.get("admin_remark")

    if approval_status:
        farmer.approval_status = approval_status
    if admin_remark is not None:
        farmer.admin_remark = admin_remark

    farmer.save()

    return Response(
        {
            "message": "Approval updated",
            "approval_status": farmer.approval_status,
            "admin_remark": farmer.admin_remark or "",
        }
    )


# ----------------- NEW: LAND-BASED approvals (used by React Approvals page) -----------------


@api_view(["GET"])
def land_approvals_list(request):
    """
    Returns one row per Land, with farmer info and land approval_status.
    Filter: ?status=All / Pending / Approved / Rejected
    """
    status_param = request.GET.get("status", "All")

    qs = Land.objects.select_related("farmer__user").order_by("id")

    if status_param == "Pending":
        qs = qs.exclude(approval_status="approved").exclude(approval_status="rejected")
    elif status_param == "Approved":
        qs = qs.filter(approval_status="approved")
    elif status_param == "Rejected":
        qs = qs.filter(approval_status="rejected")
    # All -> no filter

    data = []
    for land in qs:
        farmer = land.farmer
        user = getattr(farmer, "user", None)

        full_name = ""
        if user:
            full_name = (
                user.get_full_name()
                or getattr(farmer, "name", "")
                or user.username
            )

        data.append(
            {
                "id": land.id,
                "farmer_name": full_name,
                "farmer_username": getattr(user, "username", ""),
                "farmer_phone": getattr(farmer, "phone", ""),
                "village": land.village,
                "district": land.district,
                "state": land.state,
                "land_area": land.land_area,
                "approval_status": land.approval_status,  # 'pending' / 'approved' / 'rejected'
                "admin_remark": land.admin_remark or "",
            }
        )

    return Response(data)


@api_view(["PATCH"])
def land_approval_update(request, land_id):
    """
    Update approval_status and admin_remark for a Land.
    Also sync the parent Farmer's approval_status based on all lands.
    """
    try:
        land = Land.objects.select_related("farmer__user").get(id=land_id)
    except Land.DoesNotExist:
        return Response(
            {"detail": "Land not found"}, status=status.HTTP_404_NOT_FOUND
        )

    approval_status = request.data.get("approval_status")
    admin_remark = request.data.get("admin_remark")

    if approval_status:
        land.approval_status = approval_status  # 'pending'/'approved'/'rejected'
    if admin_remark is not None:
        land.admin_remark = admin_remark

    land.save()

    # 🔁 Sync farmer status from all its lands (business rule)
    sync_farmer_approval_from_lands(land.farmer)

    return Response(
        {
            "message": "Land approval updated",
            "approval_status": land.approval_status,
            "admin_remark": land.admin_remark or "",
        }
    )
