import pickle
from django.db import models
from django.utils.translation import ugettext_lazy as _
from picklefield.fields import PickledObjectField

class SavedQuery(models.Model):
    name = models.CharField(_("name"), max_length=100)
    description = models.TextField(_("description"), blank=True)
    query_data = PickledObjectField(protocol=pickle.HIGHEST_PROTOCOL)
    date_created = models.DateTimeField(_("date created"), auto_now_add=True)
    date_updated = models.DateTimeField(_("date updated"), auto_now=True)

    class Meta:
        verbose_name = _("Saved query")
        verbose_name_plural = _("Saved queries")

    def __unicode__(self):
        return self.name
