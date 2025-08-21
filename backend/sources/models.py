from django.db import models


class Publisher(models.Model):
    """
    A publisher represents an organisation that creates such content as might be used as a source.
    """
    class Meta:
        db_table = "publishers"
        app_label = "sources"
        verbose_name = "Publisher"
        verbose_name_plural = "Publishers"
        default_related_name = "publishers"
        ordering = ["-created_at", "id"]
        indexes = [
            models.Index(fields=["created_at"]),
            models.Index(fields=["name"]),
        ]
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=200, db_index=True)
    website = models.URLField(max_length=5000)
    created_at = models.DateTimeField(auto_now_add=True)
    hidden = models.BooleanField(default=False)

class Publication(models.Model):
    """
    A publication represents an article, essay, report, book,
    or otherwise piece of text that may be added to the corpus of a project.
    """
    class Meta:
        db_table = "publications"
        app_label = "sources"
        verbose_name = "Publication"
        verbose_name_plural = "Publications"
        default_related_name = "publications"
        ordering = ["-published_at", "id"]
        indexes = [
            models.Index(fields=["published_at"]),
            models.Index(fields=["title"]),
        ]

    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=250, db_index=True)
    link = models.URLField(max_length=15000)
    publisher = models.ForeignKey("Publisher", on_delete=models.CASCADE, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    hidden = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.published_at:%Y-%m-%d} — {self.title[:80]}"