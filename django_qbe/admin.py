from hashlib import md5
from django.conf import settings
from django.http import HttpResponseRedirect
from django.core.urlresolvers import reverse
from django.utils.translation import ugettext_lazy as _
from django.contrib import admin
from django.contrib.admin.util import unquote
from django_qbe.utils import pickle_encode
from django_qbe.models import SavedQuery

class SavedQueryAdmin(admin.ModelAdmin):
    list_display = ('name', 'description', 'date_created', 'run_link')

    def run_link(self, obj):
        info = self.model._meta.app_label, self.model._meta.module_name
        pickled = pickle_encode(obj.query_data)
        query_hash = md5(pickled + settings.SECRET_KEY).hexdigest()
        return u'<span class="nowrap"><a href="%s">%s</a> | <a href="%s?hash=%s">%s</a></span>' % \
            (reverse("admin:%s_%s_run" % info, args=(obj.pk,)), _("Run"),
             reverse("qbe_form"), query_hash, _("Edit & Run"))
    run_link.short_description = _("query")
    run_link.allow_tags = True

    def get_urls(self):
        from django.conf.urls.defaults import patterns, url
        from django.utils.functional import update_wrapper

        def wrap(view):
            def wrapper(*args, **kwargs):
                return self.admin_site.admin_view(view)(*args, **kwargs)
            return update_wrapper(wrapper, view)

        info = self.model._meta.app_label, self.model._meta.module_name
        urlpatterns = patterns('',
            url(r'^(.+)/run/$',
                wrap(self.run_view),
                name='%s_%s_run' % info,
                kwargs={'extra_context': {
                    'test': 'test',
                }}),
        )
        return urlpatterns + super(SavedQueryAdmin, self).get_urls()

    def save_model(self, request, obj, form, change):
        query_hash = request.GET.get("query_hash", "")
        query_key = "qbe_query_%s" % query_hash
        obj.query_data = request.session[query_key]
        obj.save()

    def add_view(self, request, form_url='', extra_context=None):
        query_hash = request.GET.get("query_hash", "")
        query_key = "qbe_query_%s" % query_hash
        if not query_key in request.session:
            return HttpResponseRedirect(reverse("qbe_form"))
        return super(SavedQueryAdmin, self).add_view(request, form_url=form_url, extra_context=extra_context)

    def run_view(self, request, object_id, extra_context=None):
        obj = self.get_object(request, unquote(object_id))
        data = obj.query_data
        pickled = pickle_encode(data)
        query_hash = md5(pickled + settings.SECRET_KEY).hexdigest()
        query_key = "qbe_query_%s" % query_hash
        if not query_key in request.session:
            request.session[query_key] = data
        return HttpResponseRedirect(reverse("qbe_results", args=(query_hash, )))

admin.site.register(SavedQuery, SavedQueryAdmin)
