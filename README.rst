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

But you also can download the *django_qbe* directory using git::

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

If you are using Django 1.2 or any previous version you must link or copy the
*django_qbe/static/django_qbe* directory in your project media directory::

  $ ln -s django_qbe/static/django_qbe /path/to/your/project/media/

And enable the context processor *django.core.context_processors.media*::

  TEMPLATE_CONTEXT_PROCESSORS = (
      # [...] django context processors
      'django.core.context_processors.media',
      # [...] Any other context processors
  )

But if you're using Django 1.3 or later the static files will be found and served
automatically, you don't need to do anything except adding the context processor
*django.core.context_processors.static*::

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


Settings
--------

The next lines show de available settings and its default values.

Enable autocompletion tool (work in progress, not enabled yet)::

  QBE_AUTOCOMPLETE = True

Enable an Exhibit faceted navigation for results (not yet implemented)::

  QBE_EXHIBIT = False

Admin module name to add admin urls in results::

  QBE_ADMIN = "admin"

Set your own admin site if it's different to usual *django.contrib.admin.site*::

  QBE_ADMIN_SITE ="admin.admin_site"

Function to control to users with access to QBE::

  QBE_ACCESS_FOR = lambda user: user.is_staff

Path to QBE formats export file, in order to add custom export formats::

  QBE_FORMATS_EXPORT = "qbe_formats"


.. _QBE: http://www.google.com/url?sa=t&source=web&ct=res&cd=2&ved=0CB4QFjAB&url=http%3A%2F%2Fpages.cs.wisc.edu%2F~dbbook%2FopenAccess%2FthirdEdition%2Fqbe.pdf&ei=_UD5S5WSBYP5-Qb-18i8CA&usg=AFQjCNHMv-Pua285zhWT8DevuZFj2gfYKA&sig2=-sTEDWjJhnTaixh2iJfsAw
.. _PyPI: http://pypi.python.org/pypi/django_qbe/
.. _staticfiles: http://docs.djangoproject.com/en/dev/howto/static-files
