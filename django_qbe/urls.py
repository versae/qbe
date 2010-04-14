# -*- coding: utf-8 -*-
from django.conf.urls.defaults import *


urlpatterns = patterns('django_qbe.views',
    (r'^$', 'qbe'),
    (r'^js/$', 'qbe_js'),
    (r'^auto/$', 'qbe_autocomplete'),
)
