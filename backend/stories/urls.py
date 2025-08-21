from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'stories', views.StoryViewSet, basename='story')

app_name = 'stories'

urlpatterns = [
    path('', include(router.urls)),
]