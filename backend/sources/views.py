from django.db.models import Max, F, Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.pagination import LimitOffsetPagination
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import permissions
from rest_framework.exceptions import ValidationError, NotFound
from django.utils import timezone

from .models import Publisher, Publication
from .serializers import (
    PublisherSerializer, PublicationSerializer,
    PublicationCreateSerializer, PublisherBulkUpdateSerializer
)
from .filters import PublicationFilter, PublisherFilter
from users.utils import record_user_query

class StandardLimitOffsetPagination(LimitOffsetPagination):
    default_limit = 100
    max_limit = 500

class PublisherViewSet(viewsets.ModelViewSet):
    """
    Enhanced API endpoint for managing publishers.

    Provides full CRUD operations with advanced filtering, search, and bulk operations.
    """
    queryset = Publisher.objects.prefetch_related('publications').all()
    serializer_class = PublisherSerializer
    permission_classes = [permissions.AllowAny]
    filterset_class = PublisherFilter
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    search_fields = ['name', 'website']
    ordering_fields = ["created_at", "name", "publication_count"]
    ordering = ["name"]
    pagination_class = StandardLimitOffsetPagination

    def get_queryset(self):
        queryset = super().get_queryset()
        # Add annotation for publication count to enable ordering
        return queryset.annotate(publication_count=Count('publications'))

    def list(self, request, *args, **kwargs):
        """List publishers and record free-text search queries via `q`."""
        q = (request.query_params.get('q') or '').strip()
        if q:
            record_user_query(request.user, request.path, q)
        return super().list(request, *args, **kwargs)

    @action(detail=True, methods=['get'])
    def publications(self, request, pk=None):
        """Get publications for a specific publisher with publication-level filters and ordering."""
        publisher = self.get_object()
        # If a free-text query is provided, record it against this endpoint
        q = (request.query_params.get('q') or '').strip()
        if q:
            record_user_query(request.user, request.path, q)
        queryset = (
            Publication.objects
            .filter(publisher=publisher)
            .select_related('publisher')
        )

        # Apply PublicationFilter (supports q/start/end/source/etc.)
        pub_filter = PublicationFilter(request.GET, queryset=queryset)
        queryset = pub_filter.qs

        # Safe ordering limited to publication fields
        requested_order = request.query_params.get('ordering')
        allowed = {
            'published_at', '-published_at',
            'title', '-title',
            'publisher__name', '-publisher__name',
            'created_at', '-created_at',
        }
        if requested_order in allowed:
            queryset = queryset.order_by(requested_order)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = PublicationSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = PublicationSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        """Get statistics for a specific publisher."""
        publisher = self.get_object()
        total_pubs = publisher.publications.count()
        visible_pubs = publisher.publications.filter(hidden=False).count()
        latest_pub = publisher.publications.order_by('-published_at').first()

        stats = {
            'total_publications': total_pubs,
            'visible_publications': visible_pubs,
            'hidden_publications': total_pubs - visible_pubs,
            'latest_publication': PublicationSerializer(latest_pub).data if latest_pub else None,
            'publisher_name': publisher.name
        }
        return Response(stats)

    @action(detail=False, methods=['post'], url_path='bulk-update')
    def bulk_update(self, request):
        """Bulk update multiple publishers."""
        serializer = PublisherBulkUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        ids = serializer.validated_data['ids']
        update_data = {k: v for k, v in serializer.validated_data.items() if k != 'ids' and v is not None}

        if not update_data:
            return Response({'error': 'No fields to update'}, status=status.HTTP_400_BAD_REQUEST)

        updated_count = Publisher.objects.filter(id__in=ids).update(**update_data)

        return Response({
            'message': f'Successfully updated {updated_count} publishers',
            'updated_ids': ids,
            'updated_fields': list(update_data.keys())
        })

    @action(detail=False, methods=['post'], url_path='bulk-delete')
    def bulk_delete(self, request):
        """Bulk delete multiple publishers."""
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'No IDs provided'}, status=status.HTTP_400_BAD_REQUEST)

        if len(ids) > 100:
            return Response({'error': 'Cannot delete more than 100 publishers at once'},
                          status=status.HTTP_400_BAD_REQUEST)

        deleted_count, _ = Publisher.objects.filter(id__in=ids).delete()

        return Response({
            'message': f'Successfully deleted {deleted_count} publishers',
            'deleted_ids': ids
        })


class PublicationViewSet(viewsets.ModelViewSet):
    """
    Enhanced API endpoint for managing publications.

    Provides full CRUD operations with advanced filtering, search, bulk operations, and nested endpoints.
    """
    serializer_class = PublicationSerializer
    filterset_class = PublicationFilter
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    search_fields = ['title', 'link']
    ordering_fields = ["published_at", "title", "publisher__name", "created_at"]
    ordering = ["-published_at"]
    pagination_class = StandardLimitOffsetPagination
    permission_classes = [permissions.AllowAny]
    queryset = (
        Publication.objects
        .select_related("publisher")
        .only("id", "title", "link", "publisher", "published_at", "created_at", "hidden")
    )

    def get_serializer_class(self):
        """Use different serializers for different actions."""
        if self.action == 'create':
            return PublicationCreateSerializer
        return super().get_serializer_class()

    def perform_create(self, serializer):
        """Custom create method with better error handling."""
        try:
            serializer.save()
        except Exception as e:
            raise ValidationError(f"Failed to create publication: {str(e)}")

    def perform_update(self, serializer):
        """Custom update method with better error handling."""
        try:
            serializer.save()
        except Exception as e:
            raise ValidationError(f"Failed to update publication: {str(e)}")

    def list(self, request, *args, **kwargs):
        """List publications with optional query logging when `q` is used."""
        q = (request.query_params.get('q') or '').strip()
        if q:
            record_user_query(request.user, request.path, q)
        return super().list(request, *args, **kwargs)

    @action(detail=False, methods=["get"], url_path="visible")
    def visible(self, request):
        """Return only publications that are not hidden and whose publisher is not hidden.

        Supports the same filters, ordering, and pagination as the main list.
        """
        q = (request.query_params.get('q') or '').strip()
        if q:
            record_user_query(request.user, request.path, q)
        base = self.get_queryset().filter(hidden=False, publisher__hidden=False)
        queryset = self.filter_queryset(base)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='recent')
    def recent(self, request):
        """Get publications from the last N days."""
        days = int(request.query_params.get('days', 7))
        if days > 365:
            return Response({'error': 'Days cannot exceed 365'}, status=status.HTTP_400_BAD_REQUEST)

        since_date = timezone.now() - timezone.timedelta(days=days)
        queryset = self.get_queryset().filter(published_at__gte=since_date)
        queryset = self.filter_queryset(queryset)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], url_path='bulk-create')
    def bulk_create(self, request):
        """Bulk create multiple publications."""
        publications_data = request.data
        if not isinstance(publications_data, list):
            return Response({'error': 'Expected a list of publications'},
                          status=status.HTTP_400_BAD_REQUEST)

        if len(publications_data) > 50:
            return Response({'error': 'Cannot create more than 50 publications at once'},
                          status=status.HTTP_400_BAD_REQUEST)

        created_publications = []
        errors = []

        for i, pub_data in enumerate(publications_data):
            serializer = PublicationCreateSerializer(data=pub_data)
            if serializer.is_valid():
                try:
                    publication = serializer.save()
                    created_publications.append(PublicationSerializer(publication).data)
                except Exception as e:
                    errors.append(f"Publication {i+1}: {str(e)}")
            else:
                errors.append(f"Publication {i+1}: {serializer.errors}")

        response_data = {
            'created_count': len(created_publications),
            'errors_count': len(errors),
            'created': created_publications
        }

        if errors:
            response_data['errors'] = errors

        return Response(response_data, status=status.HTTP_207_MULTI_STATUS)

    @action(detail=False, methods=['post'], url_path='bulk-update')
    def bulk_update_publications(self, request):
        """Bulk update multiple publications."""
        ids = request.data.get('ids', [])
        update_data = {k: v for k, v in request.data.items() if k != 'ids'}

        if not ids:
            return Response({'error': 'No IDs provided'}, status=status.HTTP_400_BAD_REQUEST)

        if len(ids) > 100:
            return Response({'error': 'Cannot update more than 100 publications at once'},
                          status=status.HTTP_400_BAD_REQUEST)

        if not update_data:
            return Response({'error': 'No fields to update'}, status=status.HTTP_400_BAD_REQUEST)

        updated_count = Publication.objects.filter(id__in=ids).update(**update_data)

        return Response({
            'message': f'Successfully updated {updated_count} publications',
            'updated_ids': ids,
            'updated_fields': list(update_data.keys())
        })

    @action(detail=False, methods=['post'], url_path='bulk-delete')
    def bulk_delete_publications(self, request):
        """Bulk delete multiple publications."""
        ids = request.data.get('ids', [])
        if not ids:
            return Response({'error': 'No IDs provided'}, status=status.HTTP_400_BAD_REQUEST)

        if len(ids) > 100:
            return Response({'error': 'Cannot delete more than 100 publications at once'},
                          status=status.HTTP_400_BAD_REQUEST)

        deleted_count, _ = Publication.objects.filter(id__in=ids).delete()

        return Response({
            'message': f'Successfully deleted {deleted_count} publications',
            'deleted_ids': ids
        })

    @action(detail=False, methods=['get'], url_path='search')
    def search_publications(self, request):
        """Advanced search with full-text capabilities."""
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({'error': 'Search query is required'}, status=status.HTTP_400_BAD_REQUEST)

        # Record the user's query for analytics if authenticated
        record_user_query(request.user, request.path, query)

        # Full-text search across title and publisher name
        queryset = self.get_queryset().filter(
            Q(title__icontains=query) |
            Q(publisher__name__icontains=query) |
            Q(link__icontains=query)
        )

        queryset = self.filter_queryset(queryset)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    

class SourcesMetaAPIView(APIView):
    """
    Enhanced metadata API providing comprehensive statistics about the sources.
    """
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        # Basic counts
        total_publications = Publication.objects.count()
        total_publishers = Publisher.objects.count()
        visible_publications = Publication.objects.filter(hidden=False, publisher__hidden=False).count()
        hidden_publications = total_publications - visible_publications

        # Latest publication
        latest = Publication.objects.aggregate(latest=Max("published_at"))['latest']

        # Date-based statistics
        today = timezone.now().date()
        week_ago = today - timezone.timedelta(days=7)
        month_ago = today - timezone.timedelta(days=30)

        publications_today = Publication.objects.filter(published_at__date=today).count()
        publications_this_week = Publication.objects.filter(published_at__gte=week_ago).count()
        publications_this_month = Publication.objects.filter(published_at__gte=month_ago).count()

        # Publisher statistics
        active_publishers = Publisher.objects.filter(publications__isnull=False).distinct().count()
        hidden_publishers = Publisher.objects.filter(hidden=True).count()

        # Most prolific publishers
        top_publishers = list(
            Publisher.objects
            .annotate(pub_count=Count('publications'))
            .filter(pub_count__gt=0)
            .order_by('-pub_count')[:5]
            .values('name', 'pub_count')
        )

        return Response({
            "total_publications": total_publications,
            "total_publishers": total_publishers,
            "visible_publications": visible_publications,
            "hidden_publications": hidden_publications,
            "active_publishers": active_publishers,
            "hidden_publishers": hidden_publishers,
            "latest_published": latest,
            "publications_today": publications_today,
            "publications_this_week": publications_this_week,
            "publications_this_month": publications_this_month,
            "top_publishers": top_publishers,
            "database_stats": {
                "publications_per_publisher_avg": round(total_publications / max(total_publishers, 1), 2),
                "visibility_ratio": round(visible_publications / max(total_publications, 1) * 100, 2)
            }
        })
