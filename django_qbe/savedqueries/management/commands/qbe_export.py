# -*- coding: utf-8 -*-
import json

from optparse import make_option

from django.core.management.base import BaseCommand

from django_qbe.forms import QueryByExampleFormSet
from django_qbe.savedqueries.models import SavedQuery
from django_qbe.utils import formats, pickle_decode


class Command(BaseCommand):

    def add_arguments(self, parser):
        available_formats = ", ".join(formats.keys())

        parser.add_argument(
            '--output',
            dest='output',
            default=False,
            help='Export to a file. By default standard output will be used'
        )
        parser.add_argument(
            '--format',
            dest='export_format',
            default="csv",
            help='Format for the returned data: %s' % available_formats
        )
        parser.add_argument(
            '--db-alias',
            dest='db_alias',
            default="default",
            help='Database alias to run the query'
        )

        parser.add_argument(
            "query_hash",
            help="\tExports the results of the query identified by query_hash."
        )

    # can_import_settings = True  # To check db_alias?

    def handle(self, **options):
        # Checking options
        query_hash = options.get("query_hash", None)
        if not query_hash:
            self.stderr.write(u"Wrong or missing hash code\n")
            return None
        output = options.get("output", None)
        file_name = None
        file_descr = None
        if output:
            file_name = output
            try:
                file_descr = open(file_name, "w")
            except IOError:
                self.stderr.write("Unable to create a file: \"%s\"\n" \
                                  % file_name)
        export_format = options.get("export_format", "csv")
        if export_format not in formats:
            self.stderr.write(u"Wrong format to export: %s\n" % export_format)
            return None
        db_alias = options.get("db_alias", "default")
        saved_queries = SavedQuery.objects.filter(query_hash=query_hash)
        saved_queries_length = len(saved_queries)
        # Making the query
        if saved_queries_length == 1:
            data = saved_queries[0].query_data
            formset = QueryByExampleFormSet(data=data, using=db_alias)
            if formset.is_valid():
                labels = formset.get_labels()
                query = formset.get_raw_query()
                results = formset.get_results(query)
                response = formats[export_format](labels, results)
                if file_descr:
                    file_descr.writelines(response.streaming_content)
                else:
                    self.stdout.writelines(response.streaming_content)
            else:
                self.stderr.write(u"Malformed query: %s\n" % query_hash)
        else:
            self.stderr.write(u"Invalid query_hash, returned %s queries\n" \
                              % saved_queries_length)
        if output:
            file_descr.close()
