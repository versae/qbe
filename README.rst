Django Query by Example (QBE)
=============================

:synopsis: Admin tool in order to get custom reports.

The objective of django-qbe is provide a assited and interactive way of making
complex queries with no technical knowledge (or minimal) to get custom reports
from the objects of Django models.

Based on QBE_ proposal from IBM®, django-qbe is intended to remove the
limitations of Django QuerySets objects and to use the whole expresive power of
the subjacent SQL.


Installation
------------

Using the Python Package Index (PyPI_) and easy_install script::

  $ easy_install django_qbe

Or through pip::

  $ pip install django_qbe

But you also can download the ``django_qbe`` directory using git::

  $ git clone git://github.com/versae/qbe.git
  $ cp -r qbe/django_qbe /path/to/your/project

Adding to the project settings::

  INSTALLED_APPS = (
      # [...] django builtins applications
      'django_qbe',
      # [...] Any other application
  )

And adding the urlconf in your project urls.py::

    # qbe
    url(r'^qbe/', include('django_qbe.urls')),

Add the context processor ``django.core.context_processors.static``::

  TEMPLATE_CONTEXT_PROCESSORS = (
      # [...] django context processors
      'django.core.context_processors.static',
      # [...] Any other context processors
  )

See the `Django documentation on static files`__ for details.

__ staticfiles_

That's all. Then you can access to http://host:port/qbe
However, you can add a link from your admin page changing the admin index
template fo your AdminSite::

  class AdminSite(admin.AdminSite):
      index_template = "qbe_index.html"

Or adding in your custom admin index template the next javascript::

  <script type="text/javascript" src="{% url qbe_js %}"></script>

Saved queries
^^^^^^^^^^^^^

If you optionally want to store queries in your database, feel free to
install the also included app ``django_qbe.savedqueries``::

  INSTALLED_APPS = (
      # [...] django builtins applications
      'django_qbe',
      'django_qbe.savedqueries',
      # [...] Any other application
  )

Then run the ``syncdb`` or optionally South_'s ``migrate`` management command
to create the ``savedqueries_saved_query`` table.

After that there will be a new option to save a query in a model instance and
an admin interface to browse the saved queries, or direclty from the command
line using the command ``qbe_export``::

  $ python manage.py help qbe_export
  $ python manage.py qbe_export <query_hash>
  $ python manage.py qbe_export <query_hash> --output test.csv
  $ python manage.py qbe_export <query_hash> --output test.xls --format xls
  $ python manage.py qbe_export <query_hash> --output test.xls --format xls --db-alias default

.. _South: http://south.readthedocs.org/

Settings
--------

The next lines show de available settings and its default values.

Enable autocompletion tool (work in progress, not enabled yet)::

  QBE_AUTOCOMPLETE = True

Admin module name to add admin urls in results::

  QBE_ADMIN = "admin"

Set your own admin site if it's different to usual *django.contrib.admin.site*::

  QBE_ADMIN_SITE ="admin.admin_site"

Function to control to users with access to QBE::

  QBE_ACCESS_FOR = lambda user: user.is_staff

Path to QBE formats export file, in order to add custom export formats::

  QBE_FORMATS_EXPORT = "qbe_formats"

Path to custom QBE operators for the criteria::

  QBE_CUSTOM_OPERATORS = "qbe_operators"

Custom Operators
--------

Use Custom Operators only if you know what you are doing and at your own risks!

If you need to define custom operators, in a file ``qbe_operators.py`` in your
project root, you need to create a new class that extends
``django_qbe.operators.CustomOperator``::

  import datetime
  from django.utils import timezone
  from django_qbe.operators import CustomOperator


  class SinceDaysAgo(CustomOperator):
      slug = 'since-days-ago'  # REQUIRED and must be unique
      label = 'Since Days Ago'  # REQUIRED

      def get_params(self):
          if len(self.params):
              return self.params

          now = timezone.now()
          today = now.replace(hour=0, minute=0, second=0, microsecond=0)
          tomorrow = today + datetime.timedelta(days=1)

          date_since = today - datetime.timedelta(days=int(self.value))

          operator = "gt"
          lookup_since = self._get_lookup(operator, str(date_since))
          lookup_until = self._get_lookup(operator, str(tomorrow))

          self.params.append(lookup_since)
          self.params.append(lookup_until)

          return self.params

      def get_wheres(self):
          if len(self.wheres):
              return self.wheres

          lookup_cast = self._db_operations.lookup_cast
          for operator in ["gte", "lt"]:
              db_operator = self._db_operators[operator]
              self.wheres.append(u"%s %s" % (
                  lookup_cast(operator) % self.db_field,
                  db_operator)
              )

          return self.wheres

Your custom operator must have 2 attributes, ``slug`` and ``label`` in order
to be displayed in the Criteria dropdown.

The ``get_params`` and ``get_wheres`` methods must return an iterable instance
(eg. list), otherwise it gets converted to a list.

If you dont want to write it in your ``models.py`` make sure that it is
imported in one of the files that are evaluated at runtime (eg. ``models.py``
or ``urls.py``) in order to register your Custom Operator.

.. _QBE: http://www.google.com/url?sa=t&source=web&ct=res&cd=2&ved=0CB4QFjAB&url=http%3A%2F%2Fpages.cs.wisc.edu%2F~dbbook%2FopenAccess%2FthirdEdition%2Fqbe.pdf&ei=_UD5S5WSBYP5-Qb-18i8CA&usg=AFQjCNHMv-Pua285zhWT8DevuZFj2gfYKA&sig2=-sTEDWjJhnTaixh2iJfsAw
.. _PyPI: http://pypi.python.org/pypi/django_qbe/
.. _staticfiles: http://docs.djangoproject.com/en/dev/howto/static-files/
