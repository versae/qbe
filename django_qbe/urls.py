# -*- coding: utf-8 -*-
from django.conf.urls.defaults import patterns, url


urlpatterns = patterns('django_qbe.views',
    url(r'^$', 'qbe_form', name="qbe_form"),
    url(r'^js/$', 'qbe_js', name="qbe_js"),
    url(r'^results/$', 'qbe_results', name="qbe_results"),
    url(r'^auto/$', 'qbe_autocomplete', name="qbe_autocomplete"),
)
