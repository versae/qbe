from django.core.urlresolvers import reverse
from django.utils.translation import ugettext_lazy as _
from django.contrib import admin
from django.contrib.admin.util import unquote
from django.conf.urls.defaults import patterns, url
from django.shortcuts import redirect
from django.utils.functional import update_wrapper

from django_qbe.utils import pickle_encode, get_query_hash
from django_qbe.utils import admin_site

from .models import SavedQuery


class SavedQueryAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'date_created', 'run_link')

    def run_link(self, obj):
        info = self.model._meta.app_label, self.model._meta.module_name
        pickled = pickle_encode(obj.query_data)
        query_hash = get_query_hash(pickled)
        return u'<span class="nowrap"><a href="%s">%s</a> | <a href="%s">%s</a></span>' % \
            (reverse("admin:%s_%s_run" % info, args=(obj.pk,)), _("Run"),
             reverse("qbe_form", kwargs={'query_hash': query_hash}), _("Edit"))
    run_link.short_description = _("query")
    run_link.allow_tags = True

    def get_urls(self):
        def wrap(view):
            def wrapper(*args, **kwargs):
                return self.admin_site.admin_view(view)(*args, **kwargs)
            return update_wrapper(wrapper, view)
        info = self.model._meta.app_label, self.model._meta.module_name
        urlpatterns = patterns('',
            url(r'^(.+)/run/$', wrap(self.run_view), name='%s_%s_run' % info),
        )
        return urlpatterns + super(SavedQueryAdmin, self).get_urls()

    def save_model(self, request, obj, form, change):
        query_hash = request.GET.get("hash", "")
        obj.query_hash = query_hash
        obj.query_data = request.session["qbe_query_%s" % query_hash]
        obj.save()

    def add_view(self, request, *args, **kwargs):
        query_hash = request.GET.get("hash", "")
        query_key = "qbe_query_%s" % query_hash
        if not query_key in request.session:
            return redirect("qbe_form")
        return super(SavedQueryAdmin, self).add_view(request, *args, **kwargs)

    def run_view(self, request, object_id, extra_context=None):
        obj = self.get_object(request, unquote(object_id))
        data = obj.query_data
        pickled = pickle_encode(data)
        query_hash = get_query_hash(pickled)
        query_key = "qbe_query_%s" % query_hash
        if not query_key in request.session:
            request.session[query_key] = data
        return redirect("qbe_results", query_hash)

admin_site.register(SavedQuery, SavedQueryAdmin)
