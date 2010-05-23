# -*- coding: utf-8 -*-
from datetime import datetime
from hashlib import md5

from django.db.models import get_apps
from django.conf import settings
from django.contrib.auth.decorators import user_passes_test
from django.core.urlresolvers import reverse
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import render_to_response
from django.template import RequestContext
from django.utils.simplejson import dumps
from django.utils.translation import ugettext as _

from django_qbe.forms import QueryByExampleFormSet
from django_qbe.utils import autocomplete_graph, qbe_models, formats

from admin import admin_site

qbe_access_for = getattr(settings, "QBE_ACCESS_FOR", lambda u: u.is_staff)


@user_passes_test(qbe_access_for)
def qbe_form(request):
    apps = get_apps()
    models = qbe_models(admin_site=admin_site, only_admin_models=False)
    json_models = qbe_models(admin_site=admin_site, json=True)
    formset = QueryByExampleFormSet()
    return render_to_response('qbe.html',
                              {'apps': apps,
                               'models': models,
                               'formset': formset,
                               'title': _(u"Query by Example"),
                               'json_models': json_models},
                              context_instance=RequestContext(request))


@user_passes_test(qbe_access_for)
def qbe_results(request):
    if request.POST:
        data = request.POST.copy()
        formset = QueryByExampleFormSet(data=data)
        if formset.is_valid():
            row_number = True
            admin_name = getattr(settings, "QBE_ADMIN", "admin")
            labels = formset.get_labels(row_number=row_number)
            query = formset.get_raw_query()
            results = formset.get_results(admin_name=admin_name,
                                          row_number=row_number)
            query_hash = md5(datetime.today().isoformat()).hexdigest()
            query_key = "qbe_query_%s" % query_hash
            request.session[query_key] = data
            return render_to_response('qbe_results.html',
                                      {'formset': formset,
                                       'title': _(u"Query by Example"),
                                       'results': results,
                                       'labels': labels,
                                       'query': query,
                                       'query_hash': query_hash,
                                       'admin_urls': (admin_name != None),
                                       'formats': formats},
                                      context_instance=RequestContext(request))
    else:
        return HttpResponseRedirect(reverse("qbe_form"))


@user_passes_test(qbe_access_for)
def qbe_export(request, format=None):
    query_hash = request.GET.get("hash", None)
    if format and format in formats and query_hash:
        query_key = "qbe_query_%s" % query_hash
        data = request.session[query_key]
        formset = QueryByExampleFormSet(data=data)
        if formset.is_valid():
            labels = formset.get_labels()
            query = formset.get_raw_query()
            results = formset.get_results(query)
            return formats[format](labels, results)
    return HttpResponseRedirect(reverse("qbe_form"))


@user_passes_test(qbe_access_for)
def qbe_js(request):
    return render_to_response('qbe_index.js',
                              {'qbe_url': reverse("qbe_form"),
                               'reports_label': _(u"Reports"),
                               'qbe_label': _(u"Query by Example")},
                              context_instance=RequestContext(request))


@user_passes_test(qbe_access_for)
def qbe_autocomplete(request):
    nodes = None
    if request.is_ajax() and request.POST:
        models = request.POST.get('models', []).split(",")
        nodes = autocomplete_graph(admin_site, models)
    json_nodes = dumps(nodes)
    return HttpResponse(json_nodes, mimetype="application/json")
