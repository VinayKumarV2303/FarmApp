# adminpanel/serializers.py
from rest_framework import serializers
from farmer.models import News

class NewsSerializer(serializers.ModelSerializer):
    class Meta:
        model = News
        fields = ["id", "title", "body", "photo_url", "is_active", "created_at"]
