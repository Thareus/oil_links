from django.db import models

class Story(models.Model):
    class Meta:
        db_table = "stories"
        app_label = "stories"
        verbose_name = "Story"
        verbose_name_plural = "Stories"
        default_related_name = "stories"
        ordering = ["-created_at", "id"]
        indexes = [
            models.Index(fields=["created_at"]),
            models.Index(fields=["title"]),
            models.Index(fields=["is_current"]),
            models.Index(fields=["user", "is_current"]),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'is_current'],
                condition=models.Q(is_current=True),
                name='unique_current_story_per_user',
            ),
        ]

    id = models.AutoField(primary_key=True)
    title = models.CharField(max_length=200, db_index=True)
    sources = models.ManyToManyField("sources.Publication", blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    user = models.ForeignKey("users.CustomUser", on_delete=models.CASCADE, related_name='stories')
    notes = models.TextField(blank=True, null=True)
    is_current = models.BooleanField(
        default=False,
        help_text="Indicates if this is the current story for the user"
    )

    def save(self, *args, **kwargs):
        # If this story is being set as current, ensure no other current story exists for this user
        if self.is_current:
            Story.objects.filter(user=self.user, is_current=True).exclude(pk=self.pk).update(is_current=False)
        super().save(*args, **kwargs)

    def set_as_current(self):
        """Set this story as the current one for the user"""
        Story.objects.filter(user=self.user, is_current=True).exclude(pk=self.pk).update(is_current=False)
        self.is_current = True
        self.save(update_fields=['is_current', 'updated_at'])

    def __str__(self):
        return f"{self.title} ({'current' if self.is_current else 'not current'})"