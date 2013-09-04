# -*- coding: utf-8 -*-
try:
    from django.conf.urls import patterns, url
except ImportError:
    # Backward compatibility for Django prior to 1.6
    from django.conf.urls.defaults import patterns, url
from django_qbe.exports import formats

urlpatterns = patterns('django_qbe.views',
    url(r'^$', 'qbe_form', name="qbe_form"),
    url(r'^qbe.js$', 'qbe_js', name="qbe_js"),
    url(r'^bookmark/$', 'qbe_bookmark', name="qbe_bookmark"),
    url(r'^proxy/$', 'qbe_proxy', name="qbe_proxy"),
    url(r'^auto/$', 'qbe_autocomplete', name="qbe_autocomplete"),
    url(r'^(?P<query_hash>(.*))/results\.(?P<format>(%s))$' % "|".join(formats.keys()), 'qbe_export', name="qbe_export"),
    url(r'^(?P<query_hash>(.*))/results/$', 'qbe_results', name="qbe_results"),
    url(r'^(?P<query_hash>(.*))/$', 'qbe_form', name="qbe_form"),
)
