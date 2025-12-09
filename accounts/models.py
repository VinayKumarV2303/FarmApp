# accounts/models.py
from django.db import models


class Account(models.Model):
    ROLE_CHOICES = (
        ("farmer", "Farmer"),
        ("admin", "Admin"),
    )

    phone = models.CharField(max_length=15, unique=True)
    name = models.CharField(max_length=100, blank=True, null=True)

    # For any OTP use (if needed later)
    otp = models.CharField(max_length=6, blank=True, null=True)

    # Admin password login (plain text for dev; hash in production)
    password = models.CharField(max_length=128, blank=True, null=True)

    role = models.CharField(
        max_length=10,
        choices=ROLE_CHOICES,
        default="farmer",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.phone} ({self.role})"

    class Meta:
        verbose_name = "Account"
        verbose_name_plural = "Accounts"


class AdminAccount(Account):
    class Meta:
        proxy = True
        verbose_name = "Admin Account"
        verbose_name_plural = "Admin Accounts"


class FarmerAccount(Account):
    class Meta:
        proxy = True
        verbose_name = "Farmer Account"
        verbose_name_plural = "Farmer Accounts"
