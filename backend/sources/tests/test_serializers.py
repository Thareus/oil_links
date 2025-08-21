from django.test import TestCase
from django.utils import timezone
from sources.models import Publisher, Publication
from sources.serializers import PublisherSerializer, PublicationSerializer


class TestPublisherSerializer(TestCase):
    def test_unique_name_and_website_validation(self):
        p1 = Publisher.objects.create(name='Alpha', website='https://alpha.test')
        # Creating another with same name should error
        ser = PublisherSerializer(data={'name': 'alpha', 'website': 'https://beta.test'})
        self.assertFalse(ser.is_valid())
        self.assertIn('name', ser.errors)

        # Same website should error
        ser2 = PublisherSerializer(data={'name': 'Beta', 'website': 'https://alpha.test'})
        self.assertFalse(ser2.is_valid())
        self.assertIn('website', ser2.errors)

        # Updating existing with same values should be allowed
        ser3 = PublisherSerializer(instance=p1, data={'name': 'Alpha', 'website': 'https://alpha.test'}, partial=True)
        self.assertTrue(ser3.is_valid())


class TestPublicationSerializer(TestCase):
    def setUp(self):
        self.publisher = Publisher.objects.create(name='Gamma', website='https://gamma.test')

    def test_title_min_length_and_strip(self):
        s = PublicationSerializer(data={
            'title': '  ab  ',
            'link': 'https://example.com/x',
            'publisher': self.publisher.id,
        })
        self.assertFalse(s.is_valid())
        self.assertIn('title', s.errors)

    def test_link_unique_validation(self):
        Publication.objects.create(title='T1', link='https://dupe.test/a', publisher=self.publisher)
        s = PublicationSerializer(data={
            'title': 'Another',
            'link': 'https://dupe.test/a',
            'publisher': self.publisher.id,
        })
        self.assertFalse(s.is_valid())
        self.assertIn('link', s.errors)

    def test_published_at_cannot_be_future_and_days_since(self):
        future = timezone.now() + timezone.timedelta(days=1)
        s = PublicationSerializer(data={
            'title': 'Okay Title',
            'link': 'https://ok.test/a',
            'publisher': self.publisher.id,
            'published_at': future,
        })
        self.assertFalse(s.is_valid())
        self.assertIn('published_at', s.errors)

        # Valid object -> compute days_since_publication
        past = timezone.now() - timezone.timedelta(days=3)
        pub = Publication.objects.create(title='Old', link='https://ok.test/b', publisher=self.publisher, published_at=past)
        ser = PublicationSerializer(pub)
        self.assertEqual(ser.data['days_since_publication'], 3)

