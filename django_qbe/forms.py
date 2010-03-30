# -*- coding: utf-8 -*-
from django import forms
from django.db import connection
from django.conf import settings
from django.forms.formsets import BaseFormSet, formset_factory
from django.utils.importlib import import_module
from django.utils.translation import ugettext as _

from django_qbe.widgets import CriteriaInput

try:
    module = "django.db.backends.%s" % settings.DATABASE_ENGINE
    base_mod = import_module("%s.base" % module)
    OPERATORS = base_mod.DatabaseWrapper.operators
    intros_mod = import_module("%s.introspection" % module)
    TABLE_NAMES = intros_mod.DatabaseIntrospection(connection).table_names()
except ImportError:
    OPERATORS = {}
    TABLE_NAMES = []

SORT_CHOICES = (
    ("", ""),
    ("asc", _("Ascending")),
    ("des", _("Descending")),
)


class QueryByExampleForm(forms.Form):
    show = forms.BooleanField(label=_("Show"), required=False)
    model = forms.CharField(label=_("Model"), required=True)
    field = forms.CharField(label=_("Field"), required=False)
    criteria = forms.CharField(label=_("Criteria"), required=False)
    sort = forms.ChoiceField(label=_("Sort"), choices=SORT_CHOICES,
                             required=False)

    def __init__(self, *args, **kwargs):
        super(QueryByExampleForm, self).__init__(*args, **kwargs)
        model_widget = forms.Select(attrs={'class': "qbeFillModels to:field"})
        self.fields['model'].widget = model_widget
        sort_widget = forms.Select(attrs={'disabled': "disabled",
                                          'class': 'submitIfChecked'},
                                   choices=SORT_CHOICES)
        self.fields['sort'].widget = sort_widget
        criteria_widget = CriteriaInput(attrs={'disabled': "disabled"})
        self.fields['criteria'].widget = criteria_widget
        criteria_widgets = getattr(criteria_widget, "widgets", [])
        if criteria_widgets:
            criteria_len = len(criteria_widgets)
            criteria_names = ",".join([("criteria_%s" % s)
                                       for s in range(0, criteria_len)])
            field_attr_class = "qbeFillFields enable:sort,%s" % criteria_names
        else:
            field_attr_class = "qbeFillFields enable:sort,criteria"
        field_widget = forms.Select(attrs={'class': field_attr_class})
        self.fields['field'].widget = field_widget

    def clean_model(self):
        model = self.cleaned_data['model']
        return model.lower().replace(".", "_")

    def clean_criteria(self):
        criteria = self.cleaned_data['criteria']
        try:
            operator, over = eval(criteria, {}, {})
            return (operator, over)
        except:
            return (None, None)


class BaseQueryByExampleFormSet(BaseFormSet):

    def sql(self):
        """
        Return SQL query for cleaned data
        """
        selects = []
        froms = []
        wheres = []
        sorts = []
        for data in self.cleaned_data:
            model = data["model"]
            field = data["field"]
            show = data["show"]
            criteria = data["criteria"]
            sort = data["sort"]
            db_field = u"%s.%s" % (model, field)
            if show:
                selects.append(db_field)
            if sort:
                sorts.append(db_field)
            if all(criteria):
                operator, over = criteria
                if operator.lower() == 'join':
                    over_split = over.lower().rsplit(".", 1)
                    join_model = over_split[0].replace(".", "_")
                    join_field = over_split[1]
                    join = u"%s.%s = %s_id" \
                           % (join_model, join_field, db_field)
                    if join not in wheres and join_model in TABLE_NAMES:
                        wheres.append(join)
                elif operator in OPERATORS:
                    db_operator = OPERATORS[operator] % over
                    wheres.append(u"%s %s" % (db_field, db_operator))
            if model not in froms and model in TABLE_NAMES:
                froms.append(model)
        if sorts:
            order_by = u"ORDER BY %s" % (", ".join(sorts))
        else:
            order_by = u""
        sql = u"""
        SELECT %s
        FROM %s
        WHERE %s
        %s ;""" % (", ".join(selects),
                   ", ".join(froms),
                   " AND ".join(wheres),
                   order_by)
        return sql


QueryByExampleFormSet = formset_factory(QueryByExampleForm,
                                        formset=BaseQueryByExampleFormSet,
                                        extra=1,
                                        can_delete=True)
