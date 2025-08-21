from django.urls import path
from rest_framework_simplejwt.views import TokenVerifyView
from .auth_views import (
    UserDetailsView,
    LogoutView,
    RegisterView,
    CustomTokenObtainPairView,
    CookieTokenRefreshView,
)
from .views.queries import UserQueriesReportAPIView

urlpatterns = [
    # JWT Authentication (match frontend paths)
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', CookieTokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('logout/', LogoutView.as_view(), name='auth_logout'),

    # Registration
    path('register/', RegisterView.as_view(), name='auth_register'),

    # User details
    path('user/', UserDetailsView.as_view(), name='user_details'),

    # Query reporting (admin-only)
    path('queries/report/', UserQueriesReportAPIView.as_view(), name='user_queries_report'),
]
