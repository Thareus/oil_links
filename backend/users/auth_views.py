from django.db import IntegrityError
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.conf import settings
from datetime import timedelta
from django.contrib.auth import get_user_model
from .serializers import UserDetailsSerializer, CustomTokenObtainPairSerializer

User = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    """Token obtain view that also sets HttpOnly cookies and supports remember-me."""
    serializer_class = CustomTokenObtainPairSerializer
    authentication_classes = []
    permission_classes = [AllowAny]

    def _set_jwt_cookies(self, response, access: str, refresh: str, remember: bool | None):
        # Use session cookie for refresh unless remember is True
        refresh_max_age = None
        access_max_age = None
        # Access cookie lifetime mirrors token lifetime for clarity
        access_lifetime: timedelta = settings.SIMPLE_JWT.get('ACCESS_TOKEN_LIFETIME')  # type: ignore
        if isinstance(access_lifetime, timedelta):
            access_max_age = int(access_lifetime.total_seconds())
        if remember:
            refresh_lifetime: timedelta = settings.SIMPLE_JWT.get('REFRESH_TOKEN_LIFETIME')  # type: ignore
            if isinstance(refresh_lifetime, timedelta):
                refresh_max_age = int(refresh_lifetime.total_seconds())

        # Set access token cookie
        response.set_cookie(
            settings.JWT_AUTH_COOKIE,
            access,
            max_age=access_max_age,
            httponly=settings.JWT_AUTH_HTTPONLY,
            secure=settings.JWT_AUTH_SECURE,
            samesite=settings.JWT_AUTH_SAMESITE,
            path='/',
        )
        # Set refresh token cookie
        response.set_cookie(
            settings.JWT_AUTH_REFRESH_COOKIE,
            refresh,
            max_age=refresh_max_age,  # None -> session cookie
            httponly=settings.JWT_AUTH_HTTPONLY,
            secure=settings.JWT_AUTH_SECURE,
            samesite=settings.JWT_AUTH_SAMESITE,
            path='/',
        )
        # Persist remember flag as a separate cookie to carry across rotations
        response.set_cookie(
            getattr(settings, 'JWT_REMEMBER_ME_COOKIE', 'jwt-remember'),
            '1' if remember else '0',
            max_age=refresh_max_age,
            httponly=False,  # readable by frontend if needed
            secure=settings.JWT_AUTH_SECURE,
            samesite=settings.JWT_AUTH_SAMESITE,
            path='/',
        )

    def post(self, request, *args, **kwargs):
        # Accept `remember` as bool (or 'true'/'false' strings)
        remember_raw = (request.data or {}).get('remember')
        remember = False
        if isinstance(remember_raw, bool):
            remember = remember_raw
        elif isinstance(remember_raw, str):
            remember = remember_raw.strip().lower() in ('1', 'true', 'yes', 'on')

        response = super().post(request, *args, **kwargs)
        # Body includes tokens from serializer
        data = response.data or {}
        access = data.get('access')
        refresh = data.get('refresh')
        if access and refresh:
            self._set_jwt_cookies(response, access, refresh, remember)
        return response


class CookieTokenRefreshView(TokenRefreshView):
    """Refresh view that reads refresh token from cookie and resets cookies with rotation."""
    authentication_classes = []
    permission_classes = [AllowAny]

    def _set_jwt_cookies(self, response, access: str, refresh: str, remember_flag: str | None):
        remember = (remember_flag or '0') == '1'
        refresh_max_age = None
        access_max_age = None
        access_lifetime: timedelta = settings.SIMPLE_JWT.get('ACCESS_TOKEN_LIFETIME')  # type: ignore
        if isinstance(access_lifetime, timedelta):
            access_max_age = int(access_lifetime.total_seconds())
        if remember:
            refresh_lifetime: timedelta = settings.SIMPLE_JWT.get('REFRESH_TOKEN_LIFETIME')  # type: ignore
            if isinstance(refresh_lifetime, timedelta):
                refresh_max_age = int(refresh_lifetime.total_seconds())

        response.set_cookie(
            settings.JWT_AUTH_COOKIE,
            access,
            max_age=access_max_age,
            httponly=settings.JWT_AUTH_HTTPONLY,
            secure=settings.JWT_AUTH_SECURE,
            samesite=settings.JWT_AUTH_SAMESITE,
            path='/',
        )
        response.set_cookie(
            settings.JWT_AUTH_REFRESH_COOKIE,
            refresh,
            max_age=refresh_max_age,
            httponly=settings.JWT_AUTH_HTTPONLY,
            secure=settings.JWT_AUTH_SECURE,
            samesite=settings.JWT_AUTH_SAMESITE,
            path='/',
        )
        response.set_cookie(
            getattr(settings, 'JWT_REMEMBER_ME_COOKIE', 'jwt-remember'),
            '1' if remember else '0',
            max_age=refresh_max_age,
            httponly=False,
            secure=settings.JWT_AUTH_SECURE,
            samesite=settings.JWT_AUTH_SAMESITE,
            path='/',
        )

    def post(self, request, *args, **kwargs):
        # If no refresh token in body, try cookie
        data = request.data.copy() if request.data else {}
        if 'refresh' not in data or not data['refresh']:
            cookie_name = settings.JWT_AUTH_REFRESH_COOKIE
            if cookie_name in request.COOKIES:
                data['refresh'] = request.COOKIES[cookie_name]

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        body = serializer.validated_data
        response = Response(body, status=status.HTTP_200_OK)

        access = body.get('access')
        refresh = body.get('refresh')
        if access and refresh:
            remember_flag = request.COOKIES.get(getattr(settings, 'JWT_REMEMBER_ME_COOKIE', 'jwt-remember'), '0')
            self._set_jwt_cookies(response, access, refresh, remember_flag)
        return response


class UserDetailsView(APIView):
    """
    View to get or update user details.
    Requires authentication.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get current user details"""
        serializer = UserDetailsSerializer(request.user)
        return Response(serializer.data)
    
    def patch(self, request):
        """Update current user details"""
        serializer = UserDetailsSerializer(
            request.user, 
            data=request.data, 
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    """
    View to handle user logout and token blacklisting.
    Requires authentication.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Blacklist the refresh token and clear cookies."""
        try:
            refresh_token = (request.data or {}).get('refresh')
            if not refresh_token:
                refresh_token = request.COOKIES.get(settings.JWT_AUTH_REFRESH_COOKIE)
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
        except Exception:
            # Ignore blacklist errors; still proceed to clear cookies
            pass

        response = Response(status=status.HTTP_205_RESET_CONTENT)
        # Clear cookies
        for cookie_name in (
            settings.JWT_AUTH_COOKIE,
            settings.JWT_AUTH_REFRESH_COOKIE,
            getattr(settings, 'JWT_REMEMBER_ME_COOKIE', 'jwt-remember'),
        ):
            response.delete_cookie(
                cookie_name,
                path='/',
                samesite=settings.JWT_AUTH_SAMESITE,
            )
        return response


class RegisterView(APIView):
    """
    Register a new user with email and password.
    Accepts: email, password1, password2, firstName, lastName
    """
    permission_classes = [AllowAny]
    # Do not attempt to authenticate; ignore bad Authorization headers
    authentication_classes = []

    def post(self, request):
        data = request.data or {}
        email = (data.get('email') or '').strip().lower()
        password1 = data.get('password1') or ''
        password2 = data.get('password2') or ''
        first_name = data.get('firstName') or ''
        last_name = data.get('lastName') or ''

        if not email or not password1 or not password2:
            return Response({"detail": "Email and passwords are required."}, status=status.HTTP_400_BAD_REQUEST)

        if password1 != password2:
            return Response({"detail": "Passwords do not match."}, status=status.HTTP_400_BAD_REQUEST)

        if len(password1) < 8:
            return Response({"detail": "Password must be at least 8 characters long."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.create_user(
                email=email,
                password=password1,
                first_name=first_name,
                last_name=last_name,
            )
        except IntegrityError:
            return Response({"detail": "A user with that email already exists."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = UserDetailsSerializer(user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
