import random
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Account
from .serializers import AccountSerializer

@api_view(['POST'])
def register(request):
    phone = request.data.get("phone")
    name = request.data.get("name")

    if not phone:
        return Response({"error": "Phone number required"}, status=400)

    user, created = Account.objects.get_or_create(phone=phone, defaults={"name": name})

    if not created:
        # update name if user exists
        if name:
            user.name = name
            user.save()

    return Response({
        "success": True,
        "message": "User registered",
        "user": AccountSerializer(user).data
    })

@api_view(['POST'])
def send_otp(request):
    phone = request.data.get("phone")

    if not phone:
        return Response({"error": "Phone number required"}, status=400)

    # 🔹 For development: always use same OTP so it's easy to test
    otp = "123456"
    print("DEBUG OTP for", phone, ":", otp)  # shows OTP in terminal too

    user, created = Account.objects.get_or_create(phone=phone)
    user.otp = otp
    user.save()

    return Response({
        "success": True,
        "message": "OTP sent successfully (dummy)",
        "otp": otp     # frontend also receives this
    })


@api_view(['POST'])
def verify_otp(request):
    phone = request.data.get("phone")
    otp = request.data.get("otp")

    try:
        user = Account.objects.get(phone=phone)
    except Account.DoesNotExist:
        return Response({"error": "User not found"}, status=404)

    if user.otp == otp:
        return Response({"success": True, "message": "OTP Verified", "user": AccountSerializer(user).data})
    else:
        return Response({"success": False, "message": "Invalid OTP"})
