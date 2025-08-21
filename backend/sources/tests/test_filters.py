from django.test import TestCase
from django.utils import timezone
from sources.models import Publisher, Publication
from sources.filters import PublicationFilter


class TestPublicationFilter(TestCase):
    def setUp(self):
        self.pub1 = Publisher.objects.create(name='AlphaPub', website='https://alpha.pub')
        self.pub2 = Publisher.objects.create(name='BetaPub', website='https://beta.pub')

        # Create publications with tokens across title/link/publisher
        Publication.objects.create(title='Oil Market Update', link='https://news.com/oil-market', publisher=self.pub1,
                                   published_at=timezone.now() - timezone.timedelta(days=1))
        Publication.objects.create(title='Gas Price Report', link='https://example.com/gas-report', publisher=self.pub2,
                                   published_at=timezone.now() - timezone.timedelta(days=2))
        Publication.objects.create(title='Oil and Gas Outlook', link='https://example.com/outlook', publisher=self.pub2,
                                   published_at=timezone.now() - timezone.timedelta(days=5))

    def test_filter_q_and_semantics(self):
        # oil AND gas should match only the third
        f = PublicationFilter({'q': 'oil gas'}, queryset=Publication.objects.all())
        titles = list(f.qs.values_list('title', flat=True))
        self.assertEqual(titles, ['Oil and Gas Outlook'])

    def test_days_old_filter(self):
        # last 2 days should include 2 items
        f = PublicationFilter({'days_old': '2'}, queryset=Publication.objects.all())
        self.assertEqual(f.qs.count(), 2)

