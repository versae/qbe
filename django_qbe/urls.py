from django.conf.urls import url

from django_qbe.exports import formats
from .saved_reports import SavedReportView
from .views import (qbe_form, qbe_js, qbe_bookmark, qbe_proxy,
                    qbe_autocomplete, qbe_export, qbe_results)

app_name = 'django_qbe'
urlpatterns = [
    url(r'^$', qbe_form, name="qbe_form"),
    url(r'^qbe.js$', qbe_js, name="qbe_js"),
    url(r'^bookmark/$', qbe_bookmark, name="qbe_bookmark"),
    url(r'^proxy/$', qbe_proxy, name="qbe_proxy"),
    url(r'^auto/$', qbe_autocomplete, name="qbe_autocomplete"),
    url(r'^saved_reports/$', SavedReportView.as_view(), name="qbe_saved_reports"),
    url(r'^(?P<query_hash>(.*))/results\.(?P<format>(%s))$' % "|".join(formats.keys()), qbe_export, name="qbe_export"),
    url(r'^(?P<query_hash>(.*))/results/$', qbe_results, name="qbe_results"),
    url(r'^(?P<query_hash>(.*))/$', qbe_form, name="qbe_form"),
]
