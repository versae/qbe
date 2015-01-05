from django.apps import AppConfig
from django.utils.translation import ugettext_lazy as _


class QBESavedQueriesConfig(AppConfig):
    name = 'django_qbe.savedqueries'
    verbose_name = _("Query by Example")
