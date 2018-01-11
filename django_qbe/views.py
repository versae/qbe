# -*- coding: utf-8 -*-
import json

from collections import OrderedDict
from django.apps import apps as django_apps
from django.contrib import messages
from django.http import HttpResponse
from django.shortcuts import redirect, render
from django.template.loader import render_to_string
from django.urls import reverse
from django.utils.translation import ugettext as _
from django.views.decorators.cache import never_cache

from SupportLink import helpers
from django_qbe.forms import DATABASES, QueryByExampleFormSet
from django_qbe.settings import (QBE_ADMIN, QBE_ALIASES, QBE_GROUP_BY,
                                 QBE_SAVED_QUERIES, QBE_SHOW_ROW_NUMBER)
from django_qbe.utils import (admin_site, formats, get_query_hash,
                              pickle_decode, pickle_encode, qbe_models, get_database)


# Don't cache so we get the chance to load a previous report
@never_cache
def qbe_form(request, qbe_type, query_hash=None):
    if request.GET.get('resetq'):
        if request.session.get('last_hash'):
            del request.session['last_hash']
        query_hash = None

    if not query_hash:
        hashed_last = request.session.get('last_hash')
        if hashed_last and '|' in hashed_last:
            report_type, hash = hashed_last.split('|')
            if report_type == qbe_type:
                query_hash = hash

    def sort_models(data):

        for key in data.keys():
            data[key] = OrderedDict(sorted(data[key].items(), key=lambda x: x[1]['verbose_name']))

        return data

    query_key = "qbe_query_%s" % query_hash
    db_alias = get_database(qbe_type)

    if not db_alias:
        messages.error(request, 'Select the report you wish to run from the main menu.')
        return redirect('dashboard')

    formset = QueryByExampleFormSet(using=db_alias)
    json_data = None
    if query_key in request.session:
        data = request.session[query_key]
        db_alias = data.get("database_alias", "slave")
        formset = QueryByExampleFormSet(data=data, using=db_alias)
        json_data = json.dumps(data)
    apps = django_apps.get_models()
    models = qbe_models(admin_site=admin_site, only_admin_models=False, qbe_type=qbe_type)
    json_models = qbe_models(admin_site=admin_site, json=True, qbe_type=qbe_type)

    title_url = reverse("%s:qbe_form" % qbe_type)
    saved_query = None

    context = {
        'apps': apps,
        'models': sort_models(models),
        'formset': formset,
        'databases': DATABASES,
        'database_alias': db_alias,
        'title_url': title_url,
        'saved_query': saved_query,
        'json_models': json_models,
        'json_data': json_data,
        'query_hash': query_hash,
        'savedqueries_installed': QBE_SAVED_QUERIES,
        'aliases_enabled': QBE_ALIASES,
        'group_by_enabled': QBE_GROUP_BY,
        'no_select2': True,
        'checkbox': True,
        'js': ['SupportLink/js/confirm.js'],
    }
    return render(request, 'qbe.html', context)


def qbe_proxy(request, qbe_type):
    data = request.POST.copy()
    pickled = pickle_encode(data)
    query_hash = get_query_hash(pickled)
    query_key = "qbe_query_%s" % query_hash
    request.session[query_key] = data

    # Limit the amount of queries stored in the session
    if 'saved_qbe' not in request.session:
        request.session['saved_qbe'] = [query_key]
    elif query_key not in request.session['saved_qbe']:
        request.session['saved_qbe'].append(query_key)

        if len(request.session['saved_qbe']) > 5:
            del request.session[request.session['saved_qbe'].pop(0)]

    if request.POST:
        db_alias = get_database(qbe_type)
        formset = QueryByExampleFormSet(data=request.POST, using=db_alias)

        if formset.is_valid():
            request.session['last_hash'] = '%s|%s' % (qbe_type, query_hash)
            return redirect("%s:qbe_results" % qbe_type, query_hash=query_hash)

        else:
            query_errors = formset.non_form_errors()
            if isinstance(query_errors, list):
                for error in query_errors:
                    messages.warning(request, error)

    return redirect("%s:qbe_form" % qbe_type, query_hash)


def qbe_results(request, qbe_type, query_hash):
    query_key = "qbe_query_%s" % (query_hash or "")
    if query_key in request.session:
        query_key = "qbe_query_%s" % query_hash
        data = request.session[query_key]
    else:
        return redirect("%s:qbe_form" % qbe_type)

    db_alias = get_database(qbe_type)
    formset = QueryByExampleFormSet(data=data, using=db_alias)
    if formset.is_valid() and formset._froms:
        row_number = QBE_SHOW_ROW_NUMBER
        admin_name = QBE_ADMIN
        aliases = QBE_ALIASES
        labels = formset.get_labels(row_number=row_number, aliases=aliases)
        count = formset.get_count()
        if count is not False:
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

            helpers.write_log(
                request.user,
                '%s Reporting' % qbe_type,
                'User ran a report. The result was %s.' % ('successful' if results else 'unsuccessful')
            )

            if results is not False:
                query = formset.get_raw_query(add_params=True)
                pickled = pickle_encode(data)
                title_url = reverse("%s:qbe_form" % qbe_type)
                saved_query = None

                context = {
                    'formset': formset,
                    'title': _("Custom Report"),
                    'title_url': title_url,
                    'saved_query': saved_query,
                    'results': results,
                    'labels': labels,
                    'query': query,
                    'count': count,
                    'limit': limit,
                    'page': page,
                    'offset': offset,
                    'offset_limit': offset + limit,
                    'pickled': pickled.replace(b"\n", b"").decode('ascii'),
                    'query_hash': query_hash,
                    'formats': formats,
                    'savedqueries_installed': QBE_SAVED_QUERIES,
                    'aliases_enabled': QBE_ALIASES,
                    'group_by_enabled': QBE_GROUP_BY,
                }

                return render(request, 'qbe_results.html', context)

    elif not formset._froms:
        messages.error(request, 'The database on this server does not appear to have an appropriate schema.')

    return redirect("%s:qbe_form" % qbe_type, query_hash)


def qbe_bookmark(request, qbe_type):
    data = request.GET.get("data", None)
    if data:
        query_hash = get_query_hash(data)
        query_key = "qbe_query_%s" % query_hash
        decoded = pickle_decode(data)
        if decoded:
            request.session[query_key] = decoded
            return redirect("%s:qbe_form" % qbe_type, query_hash)
        else:
            messages.error(request, 'Unable to decode the report you supplied.')
    return redirect("%s:qbe_form" % qbe_type)


def qbe_export(request, qbe_type, query_hash, format):
    query_key = "qbe_query_%s" % query_hash
    if format in formats and query_key in request.session:
        data = request.session[query_key]
        db_alias = get_database(qbe_type)
        formset = QueryByExampleFormSet(data=data, using=db_alias)
        if formset.is_valid():
            aliases = QBE_ALIASES
            labels = formset.get_labels(aliases=aliases)
            query = formset.get_raw_query()
            results = formset.get_results(query)
            helpers.write_log(request.user, '%s Reporting' % qbe_type, 'User exported a report.')
            return formats[format](labels, results)
    return redirect("%s:qbe_form" % qbe_type)


def qbe_js(request):
    user_passed_test = request.user and request.user.is_authenticated
    return HttpResponse(render_to_string('qbe_index.js', {
        'qbe_url': reverse("qbe_form"),
        'reports_label': _("Reports"),
        'qbe_label': _("Query by Example"),
        'user_passes_test': user_passed_test,
    }), mimetype="text/javascript")


def qbe_autocomplete(request):
    pass
