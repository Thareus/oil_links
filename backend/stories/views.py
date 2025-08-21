from django.db import transaction
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Story
from .serializers import StorySerializer

class StoryViewSet(viewsets.ModelViewSet):
    """
    API endpoint that allows stories to be viewed or edited.
    """
    queryset = Story.objects.all()
    serializer_class = StorySerializer
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

    def get_queryset(self):
        """
        This view should return a list of all stories
        for the currently authenticated user.
        """
        return self.queryset.filter(user=self.request.user).prefetch_related('sources')

    def retrieve(self, request, *args, **kwargs):
        """
        Retrieve a single story with its related publications.
        """
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def perform_create(self, serializer):
        """
        Automatically set the user to the current user when creating a story.
        """
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        """Create a new story for the authenticated user."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['post'])
    def add_source(self, request, pk=None):
        """
        Add a source to a story.
        """
        story = self.get_object()
        source_id = request.data.get('source_id')
        if not source_id:
            return Response(
                {'error': 'source_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        story.sources.add(source_id)
        return Response({'status': 'source added'})

    @action(detail=True, methods=['post'])
    def remove_source(self, request, pk=None):
        """
        Remove a source from a story.
        """
        story = self.get_object()
        source_id = request.data.get('source_id')
        if not source_id:
            return Response(
                {'error': 'source_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        story.sources.remove(source_id)
        return Response({'status': 'source removed'})
        
    @action(detail=True, methods=['post'])
    def set_current(self, request, pk=None):
        """
        Set this story as the current story for the user.
        """
        story = self.get_object()
        
        # Check if the story belongs to the current user
        if story.user != request.user:
            return Response(
                {'error': 'You do not have permission to modify this story'},
                status=status.HTTP_403_FORBIDDEN
            )
            
        try:
            with transaction.atomic():
                # Set this story as current
                story.set_as_current()
                return Response(
                    {'status': 'story set as current'},
                    status=status.HTTP_200_OK
                )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
