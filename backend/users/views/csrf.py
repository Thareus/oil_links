from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import ensure_csrf_cookie

@require_http_methods(["GET"])
@ensure_csrf_cookie
def get_csrf_token(request):
    """
    Set a CSRF cookie for subsequent unsafe requests (POST/PUT/PATCH/DELETE).
    The token is delivered via cookie; it is not included in the response body.
    """
    return JsonResponse({"detail": "CSRF cookie set"})
