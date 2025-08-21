from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom token obtain serializer that includes user details in the response"""
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
        token['email'] = user.email
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        token['is_staff'] = user.is_staff
        return token
    
    def validate(self, attrs):
        username_field = self.username_field
        # Normalize email/username field for authentication
        if username_field in attrs and isinstance(attrs[username_field], str):
            attrs[username_field] = attrs[username_field].strip().lower()

        data = super().validate(attrs)
        # Generate token to include custom claims
        self.get_token(self.user)
        
        # Add user details to the response
        data['user'] = {
            'id': self.user.id,
            'email': self.user.email,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'is_staff': self.user.is_staff,
        }
        return data


class UserDetailsSerializer(serializers.ModelSerializer):
    """Serializer for user details"""
    class Meta:
        model = User
        fields = ('id', 'email', 'first_name', 'last_name', 'is_staff')
        read_only_fields = ('id', 'is_staff', 'email')
