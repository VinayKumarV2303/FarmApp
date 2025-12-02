from rest_framework.generics import ListAPIView
from .models import State, District, Village
from .serializers import StateSerializer, DistrictSerializer, VillageSerializer


class StateListAPIView(ListAPIView):
    """
    GET /locations/states/
    """
    queryset = State.objects.all()
    serializer_class = StateSerializer


class DistrictListAPIView(ListAPIView):
    """
    GET /locations/districts/?state=<state_id>
    """
    serializer_class = DistrictSerializer

    def get_queryset(self):
        qs = District.objects.all()
        state_id = self.request.query_params.get("state")
        if state_id:
            qs = qs.filter(state_id=state_id)
        return qs


class VillageListAPIView(ListAPIView):
    """
    GET /locations/villages/?district=<district_id>
    """
    serializer_class = VillageSerializer

    def get_queryset(self):
        qs = Village.objects.all()
        district_id = self.request.query_params.get("district")
        if district_id:
            qs = qs.filter(district_id=district_id)
        return qs
