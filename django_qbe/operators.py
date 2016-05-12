from builtins import object
from django.conf import settings
from django.db import connections
from django.db.models.fields import Field
try:
    from importlib import import_module
except ImportError:
    # Backward compatibility for Django prior to 1.7
    from django.utils.importlib import import_module
from future.utils import with_metaclass

DATABASES = settings.DATABASES

BACKEND_TO_OPERATIONS = {
    'mysql': 'MySQLOperations',
    'oracle': 'OracleOperations',
    'postgis': 'PostGISOperations',
    'spatialite': 'SpatiaLiteOperations',
}


"""
Plugin infrastructure based on
http://martyalchin.com/2008/jan/10/simple-plugin-framework/
"""


class OperatorMount(type):
    def __init__(cls, *args, **kwargs):
        if not hasattr(cls, 'operators'):
            # This branch only executes when processing the mount point itself.
            # So, since this is a new operator type, not an implementation,
            # this class shouldn't be registered as a operator. Instead, it
            # sets up a list where operators can be registered later.
            cls.operators = {}
        else:
            # This must be a operator implementation, which should be
            # registered.
            # Simply appending it to the list is all that's needed to keep
            # track of it later.
            if hasattr(cls, 'slug') and hasattr(cls, 'label'):
                cls.operators[cls.slug] = cls

    def get_operators(self):
        return self.operators


class CustomOperator(with_metaclass(OperatorMount, object)):
    """
    Mount point for operators which refer to actions that can be performed.

    Operators implementing this reference should provide the following
    attributes:

    ========  ========================================================
    slug      A unique slug that must identify this operator

    label     The label that will be displayed in the criteria dropdown
    ========  ========================================================
    """

    def __init__(self, db_field, operator, value, db_alias="default"):
        self.params = []
        self.wheres = []

        self.db_field = db_field
        self.operator = operator
        self.value = value
        self._db_alias = db_alias
        self._db_connection = connections["default"]

        database_properties = DATABASES.get(self._db_alias, "default")
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

    def _get_lookup(self, operator, over):
        lookup = Field().get_db_prep_lookup(operator, over,
                                            connection=self._db_connection,
                                            prepared=True)
        if isinstance(lookup, (tuple, list)):
            return lookup[0]
        return lookup

    def get_params(self):
        """
        returns a list
        """
        value = self._get_lookup(self.operator, self.value)
        self.params.append(self.value)
        return self.params

    def get_wheres(self):
        """
        returns a list
        """
        self.wheres.append(u"%s %s"
                           % (lookup_cast(operator) % self.db_field,
                              self.operator))
        return self.wheres
