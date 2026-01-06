from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_user_github_username_user_is_approved'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='avatar_url',
            field=models.URLField(blank=True, max_length=500, null=True),
        ),
    ]
