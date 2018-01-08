# -*- coding: utf-8 -*-
import csv
import six
from builtins import object, str

import collections
import six
from collections import OrderedDict as SortedDict
from django.http import StreamingHttpResponse
from future import standard_library
from io import StringIO, BytesIO

standard_library.install_aliases()


__all__ = ("formats", )


class FormatsException(Exception):
    pass


class Formats(SortedDict):

    def add(self, format):
        parent = self

        def decorator(func):
            if isinstance(func, collections.Callable):
                parent.update({format: func})
            else:
                raise FormatsException("func is not a function.")

        return decorator


formats = Formats()


# Taken from http://docs.python.org/library/csv.html#csv-examples
class UnicodeWriter:
    """
    A CSV writer which will write rows to CSV file "f",
    which is encoded in the given encoding.
    """

    def __init__(self, dialect=csv.excel_tab, encoding="utf-8", **kwds):
        # Redirect output to a queue
        self.queue = BytesIO() if six.PY2 else StringIO()
        self.writer = csv.writer(self.queue, dialect=dialect, **kwds)

    def writerow(self, row):
        self.writer.writerow([str(s) for s in row])

    def get_values(self):
        # Fetch UTF-8 output from the queue ...
        ret = self.queue.getvalue()
        # empty queue
        self.queue.truncate(0)
        return ret.encode('utf-8').lstrip(b'\0')

    def writerows(self, rows):
        for row in rows:
            self.writerow(row)


def base_export(labels, results, dialect=csv.excel_tab):
    w = UnicodeWriter(dialect=dialect)
    count = 0
    w.writerow(labels)
    for row in results:
        count += 1
        w.writerow(row)

        if count % 200 == 0:
            yield w.get_values()

    yield w.get_values()


def make_attachment(response, ext):
    response['Content-Disposition'] = 'attachment; filename=export.%s' % ext
    return response


@formats.add("csv")
def csv_format(labels, results):
    content_type = "text/csv"
    return make_attachment(StreamingHttpResponse(base_export(labels, results, dialect=csv.excel), content_type=content_type), "csv")


@formats.add("ods")
def ods_format(labels, results):
    content_type = "application/vnd.oasis.opendocument.spreadsheet"
    return make_attachment(StreamingHttpResponse(base_export(labels, results, dialect=csv.excel), content_type=content_type), "ods")


@formats.add("xls")
def xls_format(labels, results):
    content_type = "application/vnd.ms-excel"
    return make_attachment(StreamingHttpResponse(base_export(labels, results, dialect=csv.excel), content_type=content_type), "xls")
