# -*- coding: utf-8 -*-
from django.conf import settings

# admin
QBE_ADMIN = getattr(settings, "QBE_ADMIN", "admin")
QBE_ADMIN_SITE = getattr(settings,
                         "QBE_ADMIN_SITE", "%s.admin_site" % QBE_ADMIN)

# auth
QBE_ACCESS_FOR = getattr(settings, "QBE_ACCESS_FOR", lambda u: u.is_staff)

# formats to export
QBE_FORMATS_EXPORT = getattr(settings, "QBE_FORMATS_EXPORT", "qbe_formats")

# custom operators
QBE_CUSTOM_OPERATORS = getattr(settings,
                               "QBE_CUSTOM_OPERATORS", "qbe_operators")

# query form
QBE_ALIASES = getattr(settings, "QBE_ALIASES", False)
QBE_GROUP_BY = getattr(settings, "QBE_GROUP_BY", False)
QBE_SHOW_ROW_NUMBER = getattr(settings, "QBE_SHOW_ROW_NUMBER", True)

# saved queries
QBE_SAVED_QUERIES = 'django_qbe.savedqueries' in settings.INSTALLED_APPS
