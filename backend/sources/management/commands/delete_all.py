from django.core.management.base import BaseCommand, CommandError
from django.apps import apps

class Command(BaseCommand):
    help = "Delete all objects of a given model"

    def add_arguments(self, parser):
        parser.add_argument("app_label", type=str, help="App label (e.g. 'sources')")
        parser.add_argument("model_name", type=str, help="Model name (case-insensitive)")

    def handle(self, *args, **options):
        app_label = options["app_label"]
        model_name = options["model_name"]

        try:
            model = apps.get_model(app_label, model_name)
        except LookupError:
            raise CommandError(f"Model '{app_label}.{model_name}' not found.")

        count = model.objects.count()
        if count == 0:
            self.stdout.write(self.style.WARNING(f"No objects found in {app_label}.{model_name}"))
            return

        # Confirm deletion
        self.stdout.write(self.style.WARNING(
            f"This will permanently delete {count} objects from {app_label}.{model_name}."
        ))
        confirm = input("Are you sure? [y/N]: ")

        if confirm.lower() == "y":
            deleted, _ = model.objects.all().delete()
            self.stdout.write(self.style.SUCCESS(
                f"Successfully deleted {deleted} objects from {app_label}.{model_name}"
            ))
        else:
            self.stdout.write(self.style.NOTICE("Aborted."))