import pickle
from django.db import models
from django.utils.translation import ugettext_lazy as _

try:
    from django.utils.timezone import now
except ImportError:
    from datetime import datetime
    now = datetime.now

from picklefield.fields import PickledObjectField


class SavedQuery(models.Model):
    query_hash = models.CharField(_("hash"), max_length=32, primary_key=True, editable=False)
    name = models.CharField(_("name"), max_length=100)
    description = models.TextField(_("description"), blank=True)
    query_data = PickledObjectField(protocol=pickle.HIGHEST_PROTOCOL)
    date_created = models.DateTimeField(_("date created"), default=now, editable=False)
    date_updated = models.DateTimeField(_("date updated"), editable=False)

    class Meta:
        verbose_name = _("Saved query")
        verbose_name_plural = _("Saved queries")

    def __unicode__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.date_updated = now()
        super(SavedQuery, self).save(*args, **kwargs)
