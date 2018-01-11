from django import forms
from django.contrib import admin
from import_export.admin import ImportExportModelAdmin
from ordered_model.admin import OrderedModelAdmin

from .models import SavedReport


class SavedReportForm(forms.ModelForm):
    model = SavedReport


class SavedReportAdmin(ImportExportModelAdmin, OrderedModelAdmin):
    form = SavedReportForm
    fields = [str(f).split('.')[-1] for f in SavedReport._meta.get_fields() if f.name not in ['id', 'order']]
    list_display = ['title', 'description', 'report_type', 'move_up_down_links', 'created', 'modified']
    readonly_fields = ['created', 'modified']
    list_filter = ['report_type']

    def save_form(self, request, form, change):
        return super(SavedReportAdmin, self).save_form(request, form, change)


admin.site.register(SavedReport, SavedReportAdmin)
