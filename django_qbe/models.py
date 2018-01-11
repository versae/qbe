from django.db import models
from django_extensions.db.models import TitleDescriptionModel, TimeStampedModel
from ordered_model.models import OrderedModel

QUERY_TYPES = [
    ('devices_reporting', 'Beacons'),
    ('networking_reporting', 'Networking'),
    ('store_devices_reporting', 'Store Devices')
]


class SavedReport(OrderedModel, TitleDescriptionModel, TimeStampedModel):
    report_url = models.TextField(help_text="Enter the absolute url taken from the bookmark button on a report.")
    report_type = models.CharField(
        max_length=30,
        choices=QUERY_TYPES,
        help_text="Enter the query type that this report will be shown on."
    )

    def __str__(self):
        return self.title
