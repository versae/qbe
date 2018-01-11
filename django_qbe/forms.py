# -*- coding: utf-8 -*-

import re
import MySQLdb as Database
import collections
import pytz
from MySQLdb.constants import FIELD_TYPE
from django import forms
from django.conf import settings
from django.contrib import messages
from django.db import connections
from django.db.models.expressions import ExpressionWrapper
from django.db.models.fields import Field
from django.forms.formsets import BaseFormSet, formset_factory
from django.utils.translation import ugettext as _
from importlib import import_module

from django_qbe.operators import BACKEND_TO_OPERATIONS, CustomOperator
from django_qbe.utils import get_models, table_to_model_name
from django_qbe.widgets import CriteriaInput

DATABASES = settings.DATABASES

SORT_CHOICES = (("", ""),
                ("asc", _("Ascending")),
                ("desc", _("Descending")),)


class QueryByExampleForm(forms.Form):
    show = forms.BooleanField(label=_("Show"), required=False)
    alias = forms.CharField(label=_("Show as"), required=False)
    model = forms.CharField(label=_("Model"))
    field = forms.CharField(label=_("Field"))
    criteria = forms.CharField(label=_("Criteria"), required=False)
    sort = forms.ChoiceField(label=_("Sort"), choices=SORT_CHOICES, required=False)
    group_by = forms.BooleanField(label=_("Group by"), required=False)

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
            return operator, over
        except:
            return None, None


class BaseQueryByExampleFormSet(BaseFormSet):
    check_mappings = re.compile(r'^(?P<from>[a-z_]+)\.[a-z_]+\ =\ `(?P<to>[a-z_]+)')

    def __init__(self, *args, **kwargs):
        self._selects = []
        self._aliases = []
        self._froms = []
        self._wheres = []
        self._sorts = []
        self._groups_by = []
        self._params = []
        self._models = {}
        self._raw_query = None
        self._db_alias = "devices"
        self._db_operators = {}
        self._db_table_names = []
        self._db_operations = None
        self._custom_operators = CustomOperator.get_operators()

        self._db_alias = kwargs.pop("using")

        self._db_connection = connections[self._db_alias]
        database_properties = DATABASES.get(self._db_alias, "devices")

        module = database_properties['ENGINE']
        try:
            base_mod = import_module("%s.base" % module)
            intros_mod = import_module("%s.introspection" % module)
        except ImportError:
            pass
        if base_mod and intros_mod:
            self._db_operators = base_mod.DatabaseWrapper.operators

            if module.startswith('django.contrib.gis'):
                operations_name = BACKEND_TO_OPERATIONS[module.split('.')[-1]]
                DatabaseOperations = getattr(base_mod, operations_name)
            else:
                DatabaseOperations = base_mod.DatabaseOperations
            try:
                self._db_operations = DatabaseOperations(self._db_connection)
            except TypeError:
                # Some engines have no params to instance DatabaseOperations
                self._db_operations = DatabaseOperations()

            cursor = connections[self._db_alias].cursor()
            cursor.execute("SHOW FULL TABLES")
            rows = cursor.fetchall()
            tables = []
            for row in rows:
                tables.append(row[0])

            self._db_table_names = tables
        super(BaseQueryByExampleFormSet, self).__init__(*args, **kwargs)

    def clean(self):
        """
        Checks that there is almost one field to select
        """
        if any(self.errors):
            # Don't bother validating the formset unless each form is valid on
            # its own
            return
        (selects, aliases, froms, wheres, sorts, groups_by, params) = self.get_query_parts()
        if self._non_form_errors:
            return
        if not selects:
            validation_message = _("You must check at least one row.")
            raise forms.ValidationError(validation_message)
        self._selects = selects
        self._aliases = aliases
        self._froms = froms
        self._wheres = wheres
        self._sorts = sorts
        self._groups_by = groups_by
        self._params = params

    def get_query_parts(self):
        """
        Return SQL query for cleaned data
        """
        selects = []
        aliases = []
        froms = []
        wheres = []
        sorts = []
        groups_by = []
        params = []
        app_model_labels = None
        lookup_cast = self._db_operations.lookup_cast
        qn = self._db_operations.quote_name

        for data in self.cleaned_data:
            if not ("model" in data and "field" in data):
                break
            model = data["model"]
            # HACK: Workaround to handle tables created
            #       by django for its own
            if not app_model_labels:
                app_models = get_models(include_auto_created=True)
                app_model_labels = ["%s_%s" % (a._meta.app_label, a._meta.model_name) for a in app_models]
            if model in app_model_labels:
                position = app_model_labels.index(model)
                model = app_models[position]._meta.db_table
                self._models[model] = app_models[position]
            field = self._models[model]._meta.get_field(data['field']).column
            show = data["show"]
            alias = data["alias"]
            criteria = data["criteria"]
            sort = data["sort"]
            group_by = data["group_by"]
            db_field = "%s.%s" % (qn(model), qn(field))
            operator, over = criteria
            olower = operator.lower()
            if 'contains' in olower:
                over = '%' + over + '%'
            elif 'endswith' in olower:
                over = '%' + over
            elif 'startswith' in olower:
                over += '%'

            is_join = operator.lower() == 'join'
            if show and not is_join:
                selects.append(db_field)
            if alias is not None and not is_join:
                aliases.append(alias)
            if sort:
                sorts.append(db_field + ' ' + sort)
            if group_by:
                groups_by.append(db_field)
            if criteria and criteria[0]:
                if is_join:
                    joined_field_obj = self._models[model]._meta.get_field(field).remote_field
                    join2 = joined_field_obj.model._meta.db_table
                    join_field = joined_field_obj.field.target_field.column

                    join = "%s.%s = %s" % (join2, join_field, db_field)
                    if join not in wheres and join2 in self._db_table_names:
                        wheres.append(join)
                        join2 = '`' + join2 + '`'
                        if join2 not in froms:
                            froms.append(join2)
                            # join_select = u"%s.%s" % (join_model, join_field)
                            # if join_select not in selects:
                            #     selects.append(join_select)
                elif operator in self._db_operators:
                    # db_operator = self._db_operators[operator] % over
                    db_operator = self._db_operators[operator]
                    lookup = self._get_lookup(operator, over)
                    params.append(lookup)
                    wheres.append("%s %s"
                                  % (lookup_cast(operator) % db_field,
                                     db_operator))
                elif operator in self._custom_operators:
                    CustOperator = self._custom_operators[operator]
                    custom_operator = CustOperator(db_field, operator, over)

                    # make sure the operators params are iterable:
                    custom_params = custom_operator.get_params()
                    if isinstance(custom_params, collections.Iterable):
                        params += custom_params
                    else:
                        params += [custom_params, ]

                    # make sure the operators wheres are iterable:
                    custom_wheres = custom_operator.get_wheres()
                    if isinstance(custom_wheres, collections.Iterable):
                        wheres += custom_wheres
                    else:
                        wheres += [custom_wheres, ]

            if qn(model) not in froms and model in self._db_table_names:
                froms.append(qn(model))

        # There needs to be at least 2 tables to check joins
        if len(froms) > 1:
            self.check_errors(froms, wheres)

        return selects, aliases, froms, wheres, sorts, groups_by, params

    def check_errors(self, froms, wheres):
        error_footer = """\
            Look at the graph below to see how tables are connected. By adding a blue field
            to your report under the "Field" dropdown, the tables will be linked.\n
            If the tables can't be related, either directly or though intermediary tables, you 
            will need to run separate queries. For more information click the help icon."""

        # Get the joined tables as a list of tuples
        maps = [self.check_mappings.match(r).groups() for r in wheres if '%' not in r]
        froms_fixed = set((table[1:-1] for table in froms))

        if not maps:
            self._non_form_errors = [
                "You have multiple tables but they are not joined. "
                "Select a field in blue to join tables together. \n\n" + error_footer
            ]
            return False

        def next_map(items, i):
            return items[:i] + items[i + 1:]

        def link_out(items, current, found_matches):
            found_matches.add(current)

            if not items:
                return found_matches

            for i, item in enumerate(items):
                if current == item[0]:
                    link_out(next_map(items, i), item[1], found_matches)
                if current == item[1]:
                    link_out(next_map(items, i), item[0], found_matches)

            return found_matches

        def start_link_out():
            matched = set(link_out(maps, maps[0][0], set()))

            if len(matched) == len(froms_fixed):
                return True

            return min(froms_fixed - matched, matched)

        all_matched = start_link_out()

        if all_matched is not True:
            linked = 'one of the following tables: {matched}' if len(all_matched) > 1 else 'the table {matched}'
            self._non_form_errors = ["""\
                All of the tables in the report do not appear to be joined. \
                There must be a join between {matched} and the other tables \
                in the report.
                \n\n {footer}""".format(
                    matched=linked.format(
                        matched=', '.join(table_to_model_name(all_matched))
                    ),
                    footer=error_footer
                )
            ]
            return False

    def get_raw_query(self, limit=None, offset=None, count=False, add_params=False):
        if self._raw_query:
            return self._raw_query
        if self._sorts:
            order_by = "ORDER BY %s" % (", ".join(self._sorts))
        else:
            order_by = ""
        if self._groups_by:
            group_by = "GROUP BY %s" % (", ".join(self._groups_by))
        else:
            group_by = ""
        if self._wheres:
            wheres = "WHERE %s" % (" AND ".join(self._wheres))
        else:
            wheres = ""
        if count:
            selects = ("COUNT(1) as count",)
            order_by = ""
        else:
            selects = self._selects
        limits = ""
        if limit:
            try:
                limits = "LIMIT %s" % int(limit)
            except ValueError:
                pass
        offsets = ""
        if offset:
            try:
                offsets = "OFFSET %s" % int(offset)
            except ValueError:
                pass
        sql = """SELECT DISTINCT %s FROM %s %s %s %s %s %s;""" \
              % (", ".join(selects),
                 ", ".join(self._froms),
                 wheres,
                 group_by,
                 order_by,
                 limits,
                 offsets)
        if add_params:
            return "%s /* %s */" % (sql, ", ".join(self._params))
        else:
            return sql

    def get_results(self, limit=None, offset=None, query=None, admin_name=None,
                    row_number=False):

        def make_connection_dt_aware(connection):
            """
            This is all to add conversions to get the dates into the user's timezone
            :param connection: The old connection
            :return: A new connection with a special datetime conversion function
            """

            if not hasattr(connection, 'is_copied'):
                timezone_str = connection.settings_dict.get('TIME_ZONE')
                all_conversions = connection.get_connection_params()['conv']
                parse_datetime = all_conversions[FIELD_TYPE.DATETIME]
                copied_conversions = all_conversions.copy()

                if timezone_str:
                    use_tz = pytz.timezone(timezone_str)
                else:
                    use_tz = pytz.utc

                def parse_datetime_with_timezone_support(value):
                    if not value:
                        return None

                    return use_tz.localize(parse_datetime(value), is_dst=None)

                copied_conversions[FIELD_TYPE.DATETIME] = parse_datetime_with_timezone_support
                connection_params = connection.get_connection_params().copy()
                connection_params['conv'] = copied_conversions

                connection = Database.connect(cursorclass=Database.cursors.SSCursor, **connection_params)
                connection.is_copied = True

            return connection

        self._db_connection = make_connection_dt_aware(self._db_connection)

        """
        Fetch all results after perform SQL query and
        """
        if not query:
            sql = self.get_raw_query(limit=limit, offset=offset)
        else:
            sql = query
        if settings.DEBUG:
            print(sql)
        cursor = self._db_connection.cursor()
        try:
            cursor.execute(sql, tuple(self._params))
        except Exception as e:
            msg = 'There was an error returning the report you requested: %s.' % str(e)
            self._non_form_errors = [msg]
            return False

        return cursor

    def get_count(self):
        query = self.get_raw_query(count=True)
        results = self.get_results(query=query)
        if results:
            return float(results.fetchall()[0][0])
        else:
            res = self.get_results()
            if res is False:
                return False
            return len(res)

    def get_labels(self, add_extra_ids=False, row_number=False, aliases=False):
        if row_number:
            labels = [_("#")]
        else:
            labels = []
        if add_extra_ids:
            selects = self._get_selects_with_extra_ids()
        else:
            selects = self._selects
        if selects and isinstance(selects, (tuple, list)):
            for i, select in enumerate(selects):
                label = self._aliases[i]
                if not aliases or label.strip() == "":
                    label_splits = select.replace("_", ".").split(".")
                    label_splits_field = " ".join(label_splits[2:])
                    label = "%s.%s: %s" % (label_splits[0].capitalize(),
                                           label_splits[1].capitalize(),
                                           label_splits_field.capitalize())
                labels.append(label)
        return labels

    def has_admin_urls(self):
        return False

    def _unquote_name(self, name):
        quoted_space = self._db_operations.quote_name("")
        if name.startswith(quoted_space[0]) and name.endswith(quoted_space[1]):
            return name[1:-1]
        return name

    def _get_lookup(self, operator, over):
        lookup = Field().get_lookup(operator)(ExpressionWrapper(operator, ''), over)
        return lookup.rhs

    def _get_selects_with_extra_ids(self):
        qn = self._db_operations.quote_name
        selects = []
        for select in self._selects:
            appmodel, field = select.split(".")
            appmodel = self._unquote_name(appmodel)
            field = self._unquote_name(field)
            selects.append(select)
            if appmodel in self._models:
                pk_name = self._models[appmodel]._meta.pk.name
            else:
                pk_name = "id"
            selects.append("%s.%s" % (qn(appmodel), qn(pk_name)))
        return selects


QueryByExampleFormSet = formset_factory(QueryByExampleForm,
                                        formset=BaseQueryByExampleFormSet,
                                        extra=1,
                                        can_delete=True)
