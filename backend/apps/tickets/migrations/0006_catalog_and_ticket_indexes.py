from django.db import migrations, models


ISSUE_TYPES = (
    (
        "Software Error",
        "Application crashes, unexpected behavior, or error pop-ups.",
    ),
    (
        "Hardware Issue",
        "Problems with physical equipment like monitors, keyboards, or mice.",
    ),
    (
        "Network & Wi-Fi",
        "Issues connecting to the office network, or internet services.",
    ),
    (
        "Access & Permissions",
        "Account lockouts, password resets, or authorization requests.",
    ),
    (
        "Printer Issue",
        "Paper Jam, Tray Empty, Toner exhausted, Printer Network, Unable to print.",
    ),
)


def add_default_issue_types(apps, schema_editor):
    ProblemCategory = apps.get_model("tickets", "ProblemCategory")
    ProblemType = apps.get_model("tickets", "ProblemType")
    database = schema_editor.connection.alias
    category, _ = ProblemCategory.objects.using(database).update_or_create(
        name="IT Support",
        defaults={"is_active": True},
    )
    for position, (name, description) in enumerate(ISSUE_TYPES, start=1):
        ProblemType.objects.using(database).update_or_create(
            category=category,
            name=name,
            defaults={
                "description": description,
                "sort_order": position,
                "is_active": True,
            },
        )


class Migration(migrations.Migration):
    dependencies = [
        ("tickets", "0005_ticket_resolution_notes_feedbacktoken_feedback"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="ticket",
            index=models.Index(
                fields=["station", "status", "priority", "created_at"],
                name="ticket_station_queue_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="ticket",
            index=models.Index(
                fields=["user", "created_at"],
                name="ticket_user_created_idx",
            ),
        ),
        migrations.RunPython(add_default_issue_types, migrations.RunPython.noop),
    ]
