# -*- coding: utf-8 -*-
from django.forms.widgets import MultiWidget, Select, TextInput
from django.utils.translation import ugettext as _


OPERATOR_CHOICES = (
    ('', ''),
    ('exact', _('is equal to')),
    ('contains', _('contains')),
    ('regex', _('matchs regex')),
    ('startswith', _('starts with')),
    ('endswith', _('ends with')),
    ('gt', _('is greater than')),
    ('gte', _('is greater than or equal to')),
    ('lt', _('is less than')),
    ('lte', _('is less than or equal to')),
    ('iexact', _('(i) is equal to')),
    ('icontains', _('(i) contains')),
    ('iregex', _('(i) matchs regex')),
    ('istartswith', _('(i) starts with')),
    ('endswith', _('(i) ends with')),
    ('join', _('joins to')),
)


class CriteriaInput(MultiWidget):

    class Media:
        js = ('django_qbe/js/qbe.widgets.js', )

    def __init__(self, *args, **kwargs):
        widgets = [Select(choices=OPERATOR_CHOICES), TextInput()]
        super(CriteriaInput, self).__init__(widgets=widgets, *args, **kwargs)

    def decompress(self, value):
        if value:
            return value
        return (None, None)
