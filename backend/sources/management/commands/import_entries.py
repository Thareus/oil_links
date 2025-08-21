import json
from django.core.management.base import BaseCommand
from django.utils.dateparse import parse_datetime
from django.db.utils import DataError
from sources.models import Publication, Publisher
import re

class Command(BaseCommand):
    help = "Import entries from a feeds.json dump"

    def get_base_url(self, url):
        url = re.sub(r"^https?://", "", url)
        return url.split("/")[0]
    
    def prepare_title(self, title):
        if not len(title) > 200:
            return title
        for i in ['?', '!', '.', ':']:
            title = title.rsplit(i, 1)[0]
            if not len(title) > 200:
                return title
        return title[:200]

    def add_arguments(self, parser):
        parser.add_argument("json_path", type=str)

    def handle(self, *args, **opts):
        path = opts["json_path"]
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        entries = data.get("entries", [])
        created = 0
        for e in entries:
            published = e.get("published")
            # Try ISO parse; tolerate None
            dt = parse_datetime(published) if published else None
            dt.astimezone()
            title = self.prepare_title(e.get("title"))
            try:
                publisher = Publisher.objects.get(name=e.get("source_name"))
            except Publisher.DoesNotExist:
                publisher = Publisher.objects.create(name=e.get("source_name"), website=self.get_base_url(e.get("source_url")))
                publisher.save()
            try:
                obj, was_created = Publication.objects.get_or_create(
                    title=title,
                    link=e.get("link"),
                    published_at=dt,
                    publisher_id=publisher.id
                )
            except DataError:
                print(
                    "TITLE", title, len(title),
                    "LINK", e.get("link"), len(e.get("link")),
                )
                raise
            if was_created:
                created += 1
        self.stdout.write(self.style.SUCCESS(f"Imported {created} new entries."))