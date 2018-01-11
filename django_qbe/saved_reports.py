from django.views.generic import ListView

from .models import SavedReport


class SavedReportView(ListView):
    model = SavedReport

    def get_queryset(self):
        return self.model.objects.filter(report_type=self.kwargs['qbe_type'])
