import django_filters
from django.db.models import Q, Count
from django.utils import timezone
from .models import Publication, Publisher

class CharInFilter(django_filters.BaseInFilter, django_filters.CharFilter):
    pass

class PublicationFilter(django_filters.FilterSet):
    """
    Enhanced filter set for publications with comprehensive filtering options.
    """
    q = django_filters.CharFilter(method="filter_q", help_text="Search in title and link")
    start = django_filters.DateFilter(field_name="published_at", lookup_expr="date__gte", help_text="Filter publications published after this date (YYYY-MM-DD)")
    end = django_filters.DateFilter(field_name="published_at", lookup_expr="date__lte", help_text="Filter publications published before this date (YYYY-MM-DD)")
    source = CharInFilter(field_name="publisher__name", lookup_expr="in", help_text="Filter by publisher names (comma-separated or repeated parameter)")
    publisher_id = django_filters.NumberFilter(field_name="publisher__id", help_text="Filter by publisher ID")
    hidden = django_filters.BooleanFilter(field_name="hidden", help_text="Filter by hidden status")

    # Date range filters
    published_after = django_filters.DateTimeFilter(field_name="published_at", lookup_expr="gte", help_text="Publications published after this datetime")
    published_before = django_filters.DateTimeFilter(field_name="published_at", lookup_expr="lte", help_text="Publications published before this datetime")

    # Content filters
    title_contains = django_filters.CharFilter(field_name="title", lookup_expr="icontains", help_text="Title contains this text")
    link_domain = django_filters.CharFilter(method="filter_link_domain", help_text="Filter by link domain (e.g., 'example.com')")

    # Publisher filters
    publisher_hidden = django_filters.BooleanFilter(field_name="publisher__hidden", help_text="Filter by publisher hidden status")

    # Recent filters
    days_old = django_filters.NumberFilter(method="filter_days_old", help_text="Publications from last N days")

    def filter_q(self, queryset, name, value):
        """Enhanced search with AND semantics across whitespace tokens."""
        tokens = [t for t in value.split() if t]
        if not tokens:
            return queryset

        base_q = Q()
        for tok in tokens:
            base_q &= (Q(title__icontains=tok) | Q(link__icontains=tok) | Q(publisher__name__icontains=tok))

        return queryset.filter(base_q)

    def filter_link_domain(self, queryset, name, value):
        """Filter by domain in the link URL."""
        return queryset.filter(link__icontains=f"//{value}")

    def filter_days_old(self, queryset, name, value):
        """Filter publications from the last N days."""
        try:
            days = int(value)
            if days <= 0:
                return queryset
            since_date = timezone.now() - timezone.timedelta(days=days)
            return queryset.filter(published_at__gte=since_date)
        except (ValueError, TypeError):
            return queryset

    class Meta:
        model = Publication
        fields = [
            "q", "start", "end", "source", "publisher_id", "hidden",
            "published_after", "published_before", "title_contains",
            "link_domain", "publisher_hidden", "days_old"
        ]


class PublisherFilter(django_filters.FilterSet):
    """
    Enhanced filter set for publishers with comprehensive filtering options.
    """
    q = django_filters.CharFilter(method="filter_q", help_text="Search in publisher name and website")
    hidden = django_filters.BooleanFilter(field_name="hidden", help_text="Filter by hidden status")

    # Content filters
    name_contains = django_filters.CharFilter(field_name="name", lookup_expr="icontains", help_text="Name contains this text")
    website_domain = django_filters.CharFilter(method="filter_website_domain", help_text="Filter by website domain (e.g., 'example.com')")

    # Publication count filters
    min_publications = django_filters.NumberFilter(method="filter_min_publications", help_text="Publishers with at least N publications")
    max_publications = django_filters.NumberFilter(method="filter_max_publications", help_text="Publishers with at most N publications")
    has_publications = django_filters.BooleanFilter(method="filter_has_publications", help_text="Only publishers with/without publications")

    # Date filters
    created_after = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="gte", help_text="Created after this datetime")
    created_before = django_filters.DateTimeFilter(field_name="created_at", lookup_expr="lte", help_text="Created before this datetime")

    def filter_q(self, queryset, name, value):
        """Enhanced search with AND semantics."""
        tokens = [t for t in value.split() if t]
        if not tokens:
            return queryset

        base_q = Q()
        for tok in tokens:
            base_q &= (Q(name__icontains=tok) | Q(website__icontains=tok))

        return queryset.filter(base_q)

    def filter_website_domain(self, queryset, name, value):
        """Filter by domain in the website URL."""
        return queryset.filter(website__icontains=f"//{value}")

    def filter_min_publications(self, queryset, name, value):
        """Filter publishers with at least N publications."""
        try:
            min_count = int(value)
            return queryset.annotate(pub_count=Count('publications')).filter(pub_count__gte=min_count)
        except (ValueError, TypeError):
            return queryset

    def filter_max_publications(self, queryset, name, value):
        """Filter publishers with at most N publications."""
        try:
            max_count = int(value)
            return queryset.annotate(pub_count=Count('publications')).filter(pub_count__lte=max_count)
        except (ValueError, TypeError):
            return queryset

    def filter_has_publications(self, queryset, name, value):
        """Filter publishers based on whether they have publications."""
        annotated_queryset = queryset.annotate(pub_count=Count('publications'))
        if value:
            return annotated_queryset.filter(pub_count__gt=0)
        else:
            return annotated_queryset.filter(pub_count=0)

    class Meta:
        model = Publisher
        fields = [
            "q", "hidden", "name_contains", "website_domain",
            "min_publications", "max_publications", "has_publications",
            "created_after", "created_before"
        ]
