# -*- coding: utf-8 -*-
from django.db.models import get_app, get_apps
from django.contrib.auth.decorators import user_passes_test
from django.core.urlresolvers import reverse
from django.http import HttpResponse, HttpResponseRedirect
from django.shortcuts import get_object_or_404, render_to_response
from django.template import RequestContext
from django.utils.translation import ugettext as _

from django_qbe.forms import QueryByExampleForm, QueryByExampleFormSet
from django_qbe.utils import qbe_models

from admin import admin_site

@user_passes_test(lambda u: u.is_staff)
def qbe(request):
    apps = get_apps()
    models = qbe_models(admin_site=admin_site, only_admin_models=True)
    json_models = qbe_models(admin_site=admin_site, json=True)
    form = QueryByExampleForm()
    formset = QueryByExampleFormSet()
    return render_to_response('qbe.html',
                              {'apps': apps,
                               'models': models,
                               'form': form,
                               'formset': formset,
                               'title': _(u"Query by Example"),
                               'json_models': json_models},
                              context_instance=RequestContext(request))


def qbe_js(request):
    return render_to_response('qbe_index.js',
                              {'qbe_url': reverse("django_qbe.views.qbe"),
                               'reports_label': _(u"Reports"),
                               'qbe_label': _(u"Query by Example")},
                              context_instance=RequestContext(request))
