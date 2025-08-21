from typing import Optional

from django.db import IntegrityError

from .models import UserQueries, CustomUser


def record_user_query(user: Optional[CustomUser], referrer: str, query: str) -> None:
    """Persist a user's search query if authenticated.

    - Silently no-ops for anonymous users or empty queries.
    - Truncates values to fit model constraints.
    - Never raises: guards API flows from analytics failures.
    """
    try:
        if not user or not getattr(user, 'is_authenticated', False):
            return
        q = (query or '').strip()
        if not q:
            return
        # Enforce field max lengths
        ref = (referrer or '')[:255]
        q = q[:255]
        UserQueries.objects.create(user=user, referrer=ref, query=q)
    except (IntegrityError, Exception):
        # Intentionally swallow to avoid impacting the request lifecycle
        return

