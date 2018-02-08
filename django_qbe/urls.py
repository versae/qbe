# -*- coding: utf-8 -*-
try:
    from django.conf.urls import url
except ImportError:
    # Backward compatibility for Django prior to 1.6
    from django.conf.urls.defaults import url
from django_qbe.exports import formats
from . import views

urlpatterns = [
    url(r'^$', views.qbe_form, name="qbe_form"),
    url(r'^qbe.js$', views.qbe_js, name="qbe_js"),
    url(r'^bookmark/$', views.qbe_bookmark, name="qbe_bookmark"),
    url(r'^proxy/$', views.qbe_proxy, name="qbe_proxy"),
    url(r'^auto/$', views.qbe_autocomplete, name="qbe_autocomplete"),
    url(r'^(?P<query_hash>(.*))/results\.(?P<format>(%s))$' % "|".join(formats.keys()), views.qbe_export, name="qbe_export"),
    url(r'^(?P<query_hash>(.*))/results/$', views.qbe_results, name="qbe_results"),
    url(r'^(?P<query_hash>(.*))/$', views.qbe_form, name="qbe_form"),
]
