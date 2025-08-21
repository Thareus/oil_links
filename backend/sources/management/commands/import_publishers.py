import json
from django.core.management.base import BaseCommand
from sources.models import Publisher
import re

class Command(BaseCommand):
    help = "Import publishers from a publishers.json dump"

    def format_website(self, website):
        return re.sub(r"^https?://", "", website)

    def add_arguments(self, parser):
        parser.add_argument("json_path", type=str)

    def handle(self, *args, **opts):
        path = opts["json_path"]
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        publishers = data.get("publishers", [])

        created = 0
        for p in publishers:
            # Search by name
            obj, was_created = Publisher.objects.get_or_create(
                name=p.get("name"),
            )
            if was_created:
                created += 1
                # Add website
                obj.website = self.format_website(p.get("website"))
                obj.save()
            else:
                # Update website if not Google news
                if 'news.google' not in p.get("website"):
                    obj.website = self.format_website(p.get("website"))
                    obj.save()
        self.stdout.write(self.style.SUCCESS(f"Imported {created} new publishers."))