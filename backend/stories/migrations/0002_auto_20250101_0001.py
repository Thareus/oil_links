from django.db import migrations, models

def set_initial_current_story(apps, schema_editor):
    """
    Set the most recent story as current for each user
    """
    Story = apps.get_model('stories', 'Story')
    from django.db.models import Max
    
    # Get the most recent story ID for each user
    latest_stories = Story.objects.values('user').annotate(
        latest_id=Max('id')
    ).values_list('latest_id', flat=True)
    
    # Update all stories - set is_current based on latest story
    Story.objects.filter(id__in=latest_stories).update(is_current=True)

class Migration(migrations.Migration):

    dependencies = [
        ('stories', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='story',
            name='is_current',
            field=models.BooleanField(default=False, help_text='Indicates if this is the current story for the user'),
        ),
        migrations.RunPython(set_initial_current_story, reverse_code=migrations.RunPython.noop),
    ]
