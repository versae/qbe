# -*- coding: utf-8 -*-
from django.db.models import get_apps
from django.conf import settings
from django.contrib.auth.decorators import user_passes_test
from django.core.urlresolvers import reverse
from django.http import HttpResponse
from django.shortcuts import render, redirect
from django.template.loader import render_to_string
from django.utils import simplejson
from django.utils.translation import ugettext as _

from django_qbe.forms import QueryByExampleFormSet, DATABASES
from django_qbe.utils import (autocomplete_graph, qbe_models, formats,
                              pickle_encode, pickle_decode, get_query_hash,
                              admin_site)


qbe_access_for = getattr(settings, "QBE_ACCESS_FOR", lambda u: u.is_staff)


@user_passes_test(qbe_access_for)
def qbe_form(request, query_hash=None):
    query_key = "qbe_query_%s" % query_hash
    db_alias = request.session.get("qbe_database", "default")
    formset = QueryByExampleFormSet(using=db_alias)
    json_data = None
    if query_key in request.session:
        data = request.session[query_key]
        db_alias = data.get("database_alias", "default")
        formset = QueryByExampleFormSet(data=data, using=db_alias)
        if not formset.is_valid():
            formset = QueryByExampleFormSet(using=db_alias)
        else:
            json_data = simplejson.dumps(data)
    apps = get_apps()
    models = qbe_models(admin_site=admin_site, only_admin_models=False)
    json_models = qbe_models(admin_site=admin_site, json=True)
    context = {
        'apps': apps,
        'models': models,
        'formset': formset,
        'databases': DATABASES,
        'database_alias': db_alias,
        'title': _(u"Query by Example"),
        'json_models': json_models,
        'json_data': json_data,
        'query_hash': query_hash,
        'savedqueries_installed': 'django_qbe.savedqueries' in settings.INSTALLED_APPS,
    }
    return render(request, 'qbe.html', context)


@user_passes_test(qbe_access_for)
def qbe_proxy(request):
    if request.POST:
        data = request.POST.copy()
        db_alias = request.session.get("qbe_database", "default")
        formset = QueryByExampleFormSet(data=data, using=db_alias)
        if formset.is_valid():
            pickled = pickle_encode(data)
            query_hash = get_query_hash(pickled)
            query_key = "qbe_query_%s" % query_hash
            request.session[query_key] = data
            return redirect("qbe_results", query_hash=query_hash)
    return redirect("qbe_form")


@user_passes_test(qbe_access_for)
def qbe_results(request, query_hash):
    query_key = "qbe_query_%s" % (query_hash or "")
    if query_key in request.session:
        query_key = "qbe_query_%s" % query_hash
        data = request.session[query_key]
    else:
        return redirect("qbe_form")
    db_alias = data.get("database_alias", "default")
    if db_alias in DATABASES:
        request.session["qbe_database"] = db_alias
    else:
        db_alias = request.session.get("qbe_database", "default")
    formset = QueryByExampleFormSet(data=data, using=db_alias)
    if formset.is_valid():
        row_number = True
        admin_name = getattr(settings, "QBE_ADMIN", "admin")
        labels = formset.get_labels(row_number=row_number)
        count = formset.get_count()
        limit = count
        try:
            page = int(request.GET.get("p", 0))
        except ValueError:
            page = 0
        if not request.GET.get("show", None):
            try:
                limit = int(data.get("limit", 100))
            except ValueError:
                limit = 100
        offset = limit * page
        results = formset.get_results(limit=limit, offset=offset,
                                      admin_name=admin_name,
                                      row_number=row_number)
        query = formset.get_raw_query(add_params=True)
        pickled = pickle_encode(data)
        context = {
            'formset': formset,
            'title': _(u"Query by Example"),
            'results': results,
            'labels': labels,
            'query': query,
            'count': count,
            'limit': limit,
            'page': page,
            'offset': offset + 1,
            'offset_limit': offset + limit,
            'pickled': pickled,
            'query_hash': query_hash,
            'admin_urls': (admin_name != None),
            'formats': formats,
            'savedqueries_installed': 'django_qbe.savedqueries' in settings.INSTALLED_APPS,
        }
        return render(request, 'qbe_results.html', context)
    return redirect("qbe_form")


@user_passes_test(qbe_access_for)
def qbe_bookmark(request):
    data = request.GET.get("data", None)
    if data:
        query_hash = get_query_hash(data)
        query_key = "qbe_query_%s" % query_hash
        request.session[query_key] = pickle_decode(data)
        return redirect("qbe_results", query_hash)
    else:
        return redirect("qbe_form")


@user_passes_test(qbe_access_for)
def qbe_export(request, query_hash, format):
    query_key = "qbe_query_%s" % query_hash
    if format in formats and query_key in request.session:
        data = request.session[query_key]
        db_alias = request.session.get("qbe_database", "default")
        formset = QueryByExampleFormSet(data=data, using=db_alias)
        if formset.is_valid():
            labels = formset.get_labels()
            query = formset.get_raw_query()
            results = formset.get_results(query)
            return formats[format](labels, results)
    return redirect("qbe_form")


# @user_passes_test(qbe_access_for)
def qbe_js(request):
    user_passed_test = request.user and qbe_access_for(request.user)
    return HttpResponse(render_to_string('qbe_index.js', {
        'qbe_url': reverse("qbe_form"),
        'reports_label': _(u"Reports"),
        'qbe_label': _(u"Query by Example"),
        'user_passes_test': user_passed_test,
    }), mimetype="text/javascript")


@user_passes_test(qbe_access_for)
def qbe_autocomplete(request):
    nodes = None
    if request.is_ajax() and request.POST:
        models = request.POST.get('models', []).split(",")
        nodes = autocomplete_graph(admin_site, models)
    return HttpResponse(simplejson.dumps(nodes), mimetype="application/json")
