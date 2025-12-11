# adminpanel/serializers.py
from rest_framework import serializers
from farmer.models import News

class NewsSerializer(serializers.ModelSerializer):
    """
    ModelSerializer that uses the News model fields directly.
    Using '__all__' avoids mismatches between serializer and model
    if model fields change during development.
    """
    class Meta:
        model = News
        # Use model derived fields to avoid ImproperlyConfigured errors
        fields = '__all__'
        read_only_fields = ['id']
