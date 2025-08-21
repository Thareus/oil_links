from django.test import TestCase
from django.contrib.auth import get_user_model


User = get_user_model()


class TestCustomUserModel(TestCase):
    def test_create_user_requires_email(self):
        with self.assertRaisesMessage(ValueError, 'The Email must be set'):
            User.objects.create_user(email=None, password='x')

    def test_create_user_success(self):
        user = User.objects.create_user(email='test@example.com', password='secret', first_name='A', last_name='B')
        self.assertEqual(user.email, 'test@example.com')
        self.assertTrue(user.check_password('secret'))
        self.assertEqual(str(user), 'test@example.com')

    def test_create_superuser_flags(self):
        admin = User.objects.create_superuser(email='admin@example.com', password='secret')
        self.assertTrue(admin.is_staff)
        self.assertTrue(admin.is_superuser)
        self.assertTrue(admin.is_active)

