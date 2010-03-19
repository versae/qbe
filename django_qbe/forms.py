# -*- coding: utf-8 -*-
from django import forms
from django.forms.formsets import formset_factory
from django.utils.translation import ugettext as _


BLANK_CHOICES = (
    ("", ""),
)

SORT_CHOICES = (
    ("", ""),
    ("asc", _("Ascending")),
    ("des", _("Descending")),
)


class QueryByExampleForm(forms.Form):
    show = forms.BooleanField(label=_("Show"), required=False)
    model = forms.ChoiceField(label=_("Model"), choices=BLANK_CHOICES,
                              required=True)
    field = forms.ChoiceField(label=_("Field"), choices=BLANK_CHOICES,
                              required=False)
    criteria = forms.CharField(label=_("Criteria"), required=False)
    sort = forms.ChoiceField(label=_("Sort"), choices=SORT_CHOICES,
                             required=False)

    def __init__(self, *args, **kwargs):
        super(QueryByExampleForm, self).__init__(*args, **kwargs)
        model_widget = forms.Select(attrs={'class': "qbeFillModels to:field"})
        self.fields['model'].widget = model_widget
        field_attr_class = "qbeFillFields enable:sort,criteria"
        field_widget = forms.Select(attrs={'class': field_attr_class})
        self.fields['field'].widget = field_widget
        sort_widget = forms.Select(attrs={'disabled': "disabled"},
                                   choices=SORT_CHOICES)
        self.fields['sort'].widget = sort_widget
        criteria_widget = forms.TextInput(attrs={'disabled': "disabled"})
        self.fields['criteria'].widget = criteria_widget


QueryByExampleFormSet = formset_factory(QueryByExampleForm, extra=1,
                                        can_delete=True)
