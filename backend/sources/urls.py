from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PublisherViewSet, PublicationViewSet, SourcesMetaAPIView

router = DefaultRouter()
router.register(r"publishers", PublisherViewSet, basename="publisher")
router.register(r"publications", PublicationViewSet, basename="publications")

urlpatterns = [
    path("", include(router.urls)),
    path("meta/", SourcesMetaAPIView.as_view(), name="meta"),
]