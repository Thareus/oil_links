from rest_framework import serializers
from django.utils import timezone
from .models import Publisher, Publication

class PublisherSerializer(serializers.ModelSerializer):
    publication_count = serializers.SerializerMethodField(read_only=True)
    visible_publications_count = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Publisher
        fields = ("id", "name", "website", "created_at", "hidden", "publication_count", "visible_publications_count")
        read_only_fields = ("id", "created_at", "publication_count", "visible_publications_count")

    def get_publication_count(self, obj):
        return obj.publications.count()

    def get_visible_publications_count(self, obj):
        return obj.publications.filter(hidden=False).count()

    def validate_name(self, value):
        if Publisher.objects.filter(name__iexact=value).exists():
            if self.instance and self.instance.name.lower() == value.lower():
                return value  # Allow same name for updates
            raise serializers.ValidationError("A publisher with this name already exists.")
        return value

    def validate_website(self, value):
        if Publisher.objects.filter(website__iexact=value).exists():
            if self.instance and self.instance.website.lower() == value.lower():
                return value  # Allow same website for updates
            raise serializers.ValidationError("A publisher with this website already exists.")
        return value

class PublicationSerializer(serializers.ModelSerializer):
    publisher_name = serializers.CharField(source="publisher.name", read_only=True)
    publisher_details = PublisherSerializer(source="publisher", read_only=True)

    class Meta:
        model = Publication
        fields = (
            "id", "title", "link", "publisher", "publisher_name", "publisher_details",
            "published_at", "created_at", "hidden", "days_since_publication"
        )
        read_only_fields = ("id", "created_at", "days_since_publication")

    days_since_publication = serializers.SerializerMethodField(read_only=True)

    def get_days_since_publication(self, obj):
        if obj.published_at:
            return (timezone.now().date() - obj.published_at.date()).days
        return None

    def validate_title(self, value):
        if len(value.strip()) < 5:
            raise serializers.ValidationError("Title must be at least 5 characters long.")
        return value.strip()

    def validate_link(self, value):
        if Publication.objects.filter(link__iexact=value).exists():
            if self.instance and self.instance.link.lower() == value.lower():
                return value  # Allow same link for updates
            raise serializers.ValidationError("A publication with this link already exists.")
        return value

    def validate(self, data):
        # Custom validation to ensure published_at is not in the future
        published_at = data.get('published_at')
        if published_at and published_at > timezone.now():
            raise serializers.ValidationError({
                "published_at": "Publication date cannot be in the future."
            })
        return data

class PublicationCreateSerializer(serializers.ModelSerializer):
    """Specialized serializer for bulk creation with better validation."""

    class Meta:
        model = Publication
        fields = ("title", "link", "publisher", "published_at", "hidden")

    def validate(self, data):
        # Additional validation for creation
        if not data.get('title') or not data.get('title').strip():
            raise serializers.ValidationError("Title is required.")
        if not data.get('link'):
            raise serializers.ValidationError("Link is required.")
        return data

class PublisherBulkUpdateSerializer(serializers.Serializer):
    """Serializer for bulk updating multiple publishers."""
    ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False,
        help_text="List of publisher IDs to update"
    )
    hidden = serializers.BooleanField(required=False)
    website = serializers.URLField(required=False)

    def validate_ids(self, value):
        if len(value) > 100:
            raise serializers.ValidationError("Cannot update more than 100 publishers at once.")
        return value
