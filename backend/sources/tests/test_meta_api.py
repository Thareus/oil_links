from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from sources.models import Publisher, Publication


class TestSourcesMetaAPI(APITestCase):
    def setUp(self):
        p1 = Publisher.objects.create(name='A', website='https://a.test')
        p2 = Publisher.objects.create(name='B', website='https://b.test', hidden=True)
        Publication.objects.create(title='T1', link='https://a.test/1', publisher=p1, published_at=timezone.now())
        Publication.objects.create(title='T2', link='https://a.test/2', publisher=p1,
                                   published_at=timezone.now() - timezone.timedelta(days=10), hidden=True)
        Publication.objects.create(title='T3', link='https://b.test/3', publisher=p2, published_at=timezone.now())

    def test_meta_returns_expected_shape(self):
        url = reverse('meta')
        res = self.client.get(url)
        self.assertEqual(res.status_code, 200)
        body = res.json()
        for key in [
            'total_publications', 'total_publishers', 'visible_publications', 'hidden_publications',
            'active_publishers', 'hidden_publishers', 'latest_published', 'publications_today',
            'publications_this_week', 'publications_this_month', 'top_publishers', 'database_stats']:
            self.assertIn(key, body)
        # basic sanity checks
        self.assertEqual(body['total_publishers'], 2)
        self.assertEqual(body['total_publications'], 3)

