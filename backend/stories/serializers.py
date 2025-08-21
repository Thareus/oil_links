from rest_framework import serializers
from .models import Story
from sources.models import Publication

class StoryPublicationSerializer(serializers.ModelSerializer):
    publisher_name = serializers.CharField(source='publisher.name', read_only=True)
    
    class Meta:
        model = Publication
        fields = ['id', 'title', 'link', 'publisher_name', 'published_at']
        read_only_fields = fields

class StorySerializer(serializers.ModelSerializer):
    is_current = serializers.BooleanField(required=False, default=False)
    sources = StoryPublicationSerializer(many=True, read_only=True)
    
    class Meta:
        model = Story
        fields = [
            'id', 'title', 'sources', 'created_at', 
            'updated_at', 'user', 'notes', 'is_current'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'user']
        extra_kwargs = {
            'sources': {'required': False}
        }
    
    def validate(self, data):
        # Set the current user as the story owner if not set
        request = self.context.get('request')
        if request and 'user' not in data:
            data['user'] = request.user
            
        # If this is an update and is_current is being set to True
        if self.instance and data.get('is_current', False):
            self.instance.set_as_current()
            
        return data
        
    def create(self, validated_data):
        # Handle setting the current story when creating a new one
        is_current = validated_data.pop('is_current', False)
        story = super().create(validated_data)
        if is_current:
            story.set_as_current()
        return story
        
    def update(self, instance, validated_data):
        # Handle setting the current story when updating
        is_current = validated_data.pop('is_current', None)
        if is_current is not None:
            if is_current:
                instance.set_as_current()
            else:
                # If unsetting current, we need to set another story as current
                # For now, we'll just prevent unsetting the current story
                if instance.is_current:
                    raise serializers.ValidationError(
                        'Cannot unset current story. Set another story as current instead.'
                    )
        return super().update(instance, validated_data)
