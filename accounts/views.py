# accounts/views.py
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from accounts.models import AdminAccount  # Accounts → Admin Accounts in Django admin


@csrf_exempt
@api_view(["POST"])
def admin_login(request):
    """
    Admin login using the AdminAccount model.

    POST /admin/api/login/
    Body: { "phone": "...", "password": "..." }

    Response:
    {
      "success": true/false,
      "message": "...",
      "token": "admin-<id>",
      "user": { "id", "name", "phone", "role": "admin" }
    }
    """
    phone = (request.data.get("phone") or "").strip()
    password = (request.data.get("password") or "")

    if not phone or not password:
        return Response(
            {"success": False, "message": "Phone and password required"},
            status=status.HTTP_200_OK,
        )

    try:
        admin = AdminAccount.objects.get(phone=phone)
    except AdminAccount.DoesNotExist:
        return Response(
            {"success": False, "message": "Admin account not found"},
            status=status.HTTP_200_OK,
        )

    # DEV: plain-text password check (same as you typed in AdminAccount)
    if admin.password != password:
        return Response(
            {"success": False, "message": "Incorrect password"},
            status=status.HTTP_200_OK,
        )

    # Simple token for dev: "admin-<id>"
    token = f"admin-{admin.id}"

    user = {
        "id": admin.id,
        "name": admin.name or "",
        "phone": admin.phone,
        "role": "admin",
    }

    return Response(
        {
            "success": True,
            "message": "Admin login successful",
            "token": token,
            "user": user,
        },
        status=status.HTTP_200_OK,
    )
