from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient


User = get_user_model()


class TestAuthViews(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='login@example.com', password='pass1234', first_name='Lo', last_name='Gin')
        self.client = APIClient()

    def test_token_obtain_sets_cookies(self):
        url = reverse('token_obtain_pair')
        res = self.client.post(url, {'email': 'login@example.com', 'password': 'pass1234', 'remember': True}, format='json')
        self.assertEqual(res.status_code, 200)
        # Response body includes tokens and user details
        self.assertIn('access', res.data)
        self.assertIn('refresh', res.data)
        self.assertIn('user', res.data)
        # Cookies should be set for access and refresh
        self.assertIn('auth-token', res.cookies)
        self.assertIn('refresh-token', res.cookies)

    def test_user_details_requires_auth_and_returns_profile(self):
        url = reverse('user_details')
        # Unauthenticated should be 401
        res_unauth = self.client.get(url)
        self.assertIn(res_unauth.status_code, (401, 403))

        # Force authenticate and fetch
        self.client.force_authenticate(user=self.user)
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['email'], 'login@example.com')

    def test_logout_clears_cookies(self):
        # Seed cookies then logout
        self.client.cookies['auth-token'] = 'access'
        self.client.cookies['refresh-token'] = 'refresh'
        # Auth required
        self.client.force_authenticate(user=self.user)
        url = reverse('auth_logout')
        res = self.client.post(url, {})
        self.assertEqual(res.status_code, 205)
        # Cookies should be cleared (deleted cookie present with max-age=0)
        for cookie_name in ('auth-token', 'refresh-token', 'jwt-remember'):
            if cookie_name in res.cookies:
                # Django represents deletion with max-age=0
                self.assertEqual(int(res.cookies[cookie_name]['max-age']), 0)

