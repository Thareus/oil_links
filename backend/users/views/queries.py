from django.db.models import Count
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions

from ..models import UserQueries


class UserQueriesReportAPIView(APIView):
    """Summarize saved user queries over a recent time window.

    Query params:
    - days: integer window size (default 30, max 365)
    - limit: top-N size for aggregates (default 20, max 100)
    - recent: number of recent rows (default 50, max 500)
    - referrer: optional substring match to filter by endpoint path
    - user_id: optional integer to filter by user
    """

    # Restrict to admins by default since this is an analytics endpoint
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        try:
            days = int(request.query_params.get('days', 30))
        except (TypeError, ValueError):
            days = 30
        days = max(1, min(365, days))

        try:
            limit = int(request.query_params.get('limit', 20))
        except (TypeError, ValueError):
            limit = 20
        limit = max(1, min(100, limit))

        try:
            recent_n = int(request.query_params.get('recent', 50))
        except (TypeError, ValueError):
            recent_n = 50
        recent_n = max(1, min(500, recent_n))

        referrer = (request.query_params.get('referrer') or '').strip()
        user_id = request.query_params.get('user_id')

        since = timezone.now() - timezone.timedelta(days=days)
        qs = UserQueries.objects.filter(created_at__gte=since)
        if referrer:
            qs = qs.filter(referrer__icontains=referrer)
        if user_id:
            try:
                qs = qs.filter(user_id=int(user_id))
            except (TypeError, ValueError):
                pass

        total = qs.count()

        top_queries = list(
            qs.values('query')
            .annotate(count=Count('id'))
            .order_by('-count', 'query')[:limit]
        )

        top_referrers = list(
            qs.values('referrer')
            .annotate(count=Count('id'))
            .order_by('-count', 'referrer')[:limit]
        )

        per_user = list(
            qs.values('user_id', 'user__email')
            .annotate(count=Count('id'))
            .order_by('-count', 'user__email')[:limit]
        )

        recent = list(
            qs.select_related('user')
            .order_by('-created_at')
            .values('id', 'query', 'referrer', 'created_at', 'user_id', 'user__email')[:recent_n]
        )

        return Response({
            'window_days': days,
            'filters': {
                'referrer': referrer or None,
                'user_id': int(user_id) if user_id and str(user_id).isdigit() else None,
            },
            'total_count': total,
            'top_queries': top_queries,
            'top_referrers': top_referrers,
            'per_user': per_user,
            'recent': recent,
        })

