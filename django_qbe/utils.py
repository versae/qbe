# -*- coding: utf-8 -*-


import inspect
import pickle
import sys
from builtins import filter, range, zip
from json import dumps

import base64
import random
from collections import OrderedDict, deque
from copy import copy
from django.apps import apps
from django.conf import settings
from django.contrib.contenttypes.fields import GenericRelation
from django.core.exceptions import SuspiciousOperation
from django.db.models.fields.related import (ForeignKey, ManyToManyField,
                                             OneToOneField)
from functools import reduce
from hashlib import md5
from importlib import import_module
from past.builtins import cmp
from past.utils import old_div

from django_qbe.settings import (IGNORE_FIELDS, QBE_ADMIN_SITE,
                                 QBE_CUSTOM_OPERATORS, QBE_FORMATS_EXPORT)

try:
    from itertools import combinations
except ImportError:

    def combinations(items, n):
        if n == 0:
            yield []
        else:
            for i in range(len(items)):
                for cc in combinations(items[i + 1:], n - 1):
                    yield [items[i]] + cc

try:
    # Default value to backwards compatibility
    qbe_admin_site = QBE_ADMIN_SITE
    qbe_admin_site_splits = qbe_admin_site.rsplit(".", 1)
    qbe_admin_module = qbe_admin_site_splits[0]
    qbe_admin_object = qbe_admin_site_splits[1]
    admin_site = getattr(import_module(qbe_admin_module), qbe_admin_object)
except (AttributeError, ImportError):
    from django.contrib.admin import site as admin_site
admin_site

try:
    qbe_formats = QBE_FORMATS_EXPORT
    formats = import_module(qbe_formats).formats
except ImportError:
    from django_qbe.exports import formats
formats  # Makes pyflakes happy

try:
    qbe_operators = QBE_CUSTOM_OPERATORS
    import_module(qbe_operators)
except ImportError:
    pass

get_models = apps.get_models


def get_store_db_models(name):
    if not name:
        return []
    key = 'devices.%s' % name
    if key in sys.modules:
        return [obj[1].__name__ for obj in inspect.getmembers(sys.modules[key]) if inspect.isclass(obj[1])]
    return []


def qbe_models(admin_site=None, only_admin_models=False, json=False, qbe_type=None):
    qbe_db = get_database(qbe_type)

    app_models = apps.get_models(include_auto_created=True)
    app_models_with_no_includes = apps.get_models(include_auto_created=False)
    if admin_site:
        admin_models = [m for m, a in admin_site._registry.items()]
    else:
        admin_models = []
    if only_admin_models:
        app_models = admin_models
    graphs = {}

    def make_title_if_not_title(input):
        # Verbose names begin with uppercase. If a verbose name has not been set, make one.
        return input if input[0].isupper() else input.title()

    def get_field_attributes(field):
        return {field.name: {
            'name': field.name,
            'type': type(field).__name__,
            'blank': field.blank,
            'label': make_title_if_not_title(field.verbose_name),
            'primary': field.primary_key,
        }}

    def get_target(field):
        name = field.related_model.__module__.split('.')[-2]
        target = {
            'name': name,
            'model': field.related_model.__name__,
            'field': field.related_model._meta.pk.name,
        }
        """
        if hasattr(field.rel, 'through') and field.rel.through is not None:
            name = field.rel.through.__module__.split(".")[-2]
            target.update({
                'through': {
                    'name': name,
                    'model': field.rel.through.__name__,
                    'field': field.rel.through._meta.pk.name,
                }
            })
        """
        return target

    def get_target_relation(field, extras=""):
        target = get_target(field)
        relation = {
            'target': target,
            'type': type(field).__name__,
            'source': field.name,
            'arrows': extras,
        }
        return target, relation

    def add_relation(model, field, extras=""):
        target, relation = get_target_relation(field, extras=extras)
        if relation not in model['relations']:
            model['relations'].append(relation)
        model['fields'][field.name].update({'target': target})
        return model

    db = qbe_type
    if db == 'store':
        check_models = get_store_db_models('store_models_' + qbe_db.split(',')[0])
    else:
        check_models = settings.REPORT_MODELS[db]

    for app_model in app_models:

        if app_model.__name__ not in check_models:
            continue

        model = {
            'name': app_model.__name__,
            'fields': OrderedDict(),
            'relations': [],
            'primary': app_model._meta.pk.name,
            'collapse': ((app_model not in admin_models) or
                         (app_model not in app_models_with_no_includes)),
            'is_auto': app_model not in app_models_with_no_includes,
        }

        for field in app_model._meta.fields:
            field_attributes = get_field_attributes(field)

            if list(field_attributes.values())[0]['name'] in IGNORE_FIELDS:
                continue

            model['fields'].update(field_attributes)
            if isinstance(field, ForeignKey):
                model = add_relation(model, field)
            elif isinstance(field, OneToOneField):
                model = add_relation(model, field)

        model['verbose_name'] = make_title_if_not_title(app_model._meta.verbose_name)

        if app_model._meta.many_to_many:
            for field in app_model._meta.many_to_many:
                if not hasattr(field, 'primary_key'):
                    continue

                model['fields'].update(get_field_attributes(field))

                if isinstance(field, ManyToManyField) or isinstance(field, GenericRelation):
                    model = add_relation(model, field)

        app_title = app_model._meta.app_label
        if app_title not in graphs:
            graphs[app_title] = {}
        graphs[app_title].update({app_model.__name__: model})

    if json:
        return dumps(graphs)
    else:
        return graphs


def qbe_graph(admin_site=None, directed=False):
    models = qbe_models(admin_site)
    graph = {}
    for k, v in models.items():
        for l, w in v.items():
            key = "%s.%s" % (k, l)
            if key not in graph:
                graph[key] = []
            for relation in w['relations']:
                source = relation['source']
                target = relation['target']
                if "through" in target:
                    through = target["through"]
                    model = "%s.%s" % (through['name'], through['model'])
                    value = (source, model, through['field'])
                else:
                    model = "%s.%s" % (target['name'], target['model'])
                    value = (source, model, target['field'])
                if value not in graph[key]:
                    graph[key].append(value)
                if not directed:
                    if model not in graph:
                        graph[model] = []
                    target_field = target['field']
                    target_value = (target_field, key, source)
                    if target_value not in graph[model]:
                        graph[model].append(target_value)
            if not graph[key]:
                del graph[key]
    return graph


def qbe_tree(graph, nodes, root=None):
    """
    Given a graph, nodes to explore and an optional root, do a breadth-first
    search in order to return the tree.
    """
    if root:
        start = root
    else:
        index = random.randint(0, len(nodes) - 1)
        start = nodes[index]
    # A queue to BFS instead DFS
    to_visit = deque()
    cnodes = copy(nodes)
    visited = set()
    # Format is (parent, parent_edge, neighbor, neighbor_field)
    to_visit.append((None, None, start, None))
    tree = {}
    while len(to_visit) != 0 and nodes:
        parent, parent_edge, v, v_edge = to_visit.pop()
        # Prune
        if v in nodes:
            nodes.remove(v)
        node = graph[v]
        if v not in visited and len(node) > 1:
            visited.add(v)
            # Preorder process
            if all((parent, parent_edge, v, v_edge)):
                if parent not in tree:
                    tree[parent] = []
                if (parent_edge, v, v_edge) not in tree[parent]:
                    tree[parent].append((parent_edge, v, v_edge))
                if v not in tree:
                    tree[v] = []
                if (v_edge, parent, parent_edge) not in tree[v]:
                    tree[v].append((v_edge, parent, parent_edge))
            # Iteration
            for node_edge, neighbor, neighbor_edge in node:
                value = (v, node_edge, neighbor, neighbor_edge)
                to_visit.append(value)
    remove_leafs(tree, cnodes)
    return tree, (len(nodes) == 0)


def remove_leafs(tree, nodes):
    def get_leafs(tree, nodes):
        return [node for node, edges in tree.items()
                if len(edges) < 2 and node not in nodes]

    def delete_edge_leafs(tree, leaf):
        for node, edges in list(tree.items()):
            for node_edge, neighbor, neighbor_edge in edges:
                if leaf == neighbor:
                    edge = (node_edge, neighbor, neighbor_edge)
                    tree[node].remove(edge)
        del tree[leaf]

    leafs = get_leafs(tree, nodes)
    iterations = 0
    while leafs or iterations > len(tree) ^ 2:
        for node in leafs:
            if node in tree:
                delete_edge_leafs(tree, node)
        leafs = get_leafs(tree, nodes)
        iterations += 0
    return tree


def qbe_forest(graph, nodes):
    forest = []
    for node, edges in graph.items():
        tree, are_all = qbe_tree(graph, copy(nodes), root=node)
        if are_all and tree not in forest:
            forest.append(tree)
    return sorted(forest, cmp=lambda x, y: cmp(len(x), len(y)))


def find_all_paths(graph, start_node, end_node, path=None):
    if not path:
        path = []
    path = path + [start_node]
    if start_node == end_node:
        return [path]
    if start_node not in graph:
        return []
    paths = []
    for source_edge, target_node, target_edge in graph[start_node]:
        if target_node not in path:
            newpaths = find_all_paths(graph, target_node, end_node, path)
            for newpath in newpaths:
                paths.append(newpath)
    return paths


def find_minimal_paths(graph, start_node, end_node):
    def find_all_paths(graph, start_node, end_node, start_edge, end_edge,
                       path=None, minimun=float("Inf")):
        if not path:
            path = []
        path = path + [start_node]
        if start_node == end_node:
            return [path], minimun
        if start_node not in graph:
            return [], minimun
        paths = []
        if len(path) < minimun:
            for source_edge, target_node, target_edge in graph[start_node]:
                if target_node not in path:
                    newpaths, minimun = find_all_paths(graph, target_node,
                                                       end_node,
                                                       target_edge,
                                                       source_edge,
                                                       path, minimun)
                    for newpath in newpaths:
                        newpath_length = len(newpath)
                        if minimun > newpath_length:
                            minimun = newpath_length
                        if newpath not in paths:
                            paths.append(newpath)
        return paths, minimun

    paths, minimun = find_all_paths(graph, start_node, end_node,
                                    start_edge=None, end_edge=None,
                                    path=None, minimun=float("Inf"))
    return paths


def _combine(items, val=None, paths=None, length=None):
    if not paths:
        paths = []
    if not length:
        length = len(items)
    if not val:
        val = []
    if len(val) == length - 1 and len(items) == 1:
        return [(val + [i]) for i in items[0]]
    for i, item in enumerate(items[:-1]):
        for value in item:
            val.append(value)
            path = _combine(items[i + 1:], val, paths, length)
            val.pop()

            def visited_path(x):
                return x not in paths

            path = list(filter(visited_path, path))
            paths.extend(path)
    return paths


def combine(items, k=None):
    """
    Create a matrix in wich each row is a tuple containing one of solutions or
    solution k-esima.
    """
    length_items = len(items)
    lengths = [len(i) for i in items]
    length = reduce(lambda x, y: x * y, lengths)
    repeats = [reduce(lambda x, y: x * y, lengths[i:])
               for i in range(1, length_items)] + [1]
    if k is not None:
        k = k % length
        # Python division by default is integer division (~ floor(a/b))
        indices = [old_div((k % (lengths[i] * repeats[i])), repeats[i])
                   for i in range(length_items)]
        return [items[i][indices[i]] for i in range(length_items)]
    else:
        matrix = []
        for i, item in enumerate(items):
            row = []
            for subset in item:
                row.extend([subset] * repeats[i])
            times = old_div(length, len(row))
            matrix.append(row * times)
        # Transpose the matrix or return the columns instead rows
        return list(zip(*matrix))


def graphs_join(graphs):
    print("Combine % elements" % len(graphs))
    return []


def autocomplete_graph(admin_site, current_models, directed=False):
    graph = qbe_graph(admin_site, directed=directed)
    valid_paths = []
    for c, d in combinations(current_models, 2):
        paths = find_minimal_paths(graph, c, d)
    combined_sets = combine(paths)
    for combined_set in combined_sets:
        path = graphs_join(combined_set)
        valid_paths.append(path)
    # for path in paths:
    #            if all(map(lambda x: x in path, current_models)):
    #                if path not in valid_paths:
    #                    valid_paths.append(path)
    return sorted(valid_paths, cmp=lambda x, y: cmp(len(x), len(y)))


# Taken from django.contrib.sessions.backends.base
def pickle_encode(session_dict):
    """Returns the given session dictionary pickled and encoded as a string."""
    if 'csrfmiddlewaretoken' in session_dict:
        del session_dict['csrfmiddlewaretoken']
    pickled = pickle.dumps(session_dict, pickle.HIGHEST_PROTOCOL)
    return base64.encodebytes(pickled + get_query_hash(pickled).encode())


# Adapted from django.contrib.sessions.backends.base
def pickle_decode(session_data):
    # The '+' character is translated to ' ' in request
    session_data = session_data.replace(" ", "+")
    # The length of the encoded string should be a multiple of 4
    while ((old_div(len(session_data), 4.0)) - (old_div(len(session_data), 4))) != 0:
        session_data += "="
    encoded_data = base64.decodebytes(session_data.encode('ascii'))
    pickled, tamper_check = encoded_data[:-32], encoded_data[-32:]
    pickled_md5 = get_query_hash(pickled)
    try:
        if pickled_md5 != tamper_check.decode('utf-8'):
            raise SuspiciousOperation("User tampered with session cookie.")

        return pickle.loads(pickled)
    # Unpickling can cause a variety of exceptions. If something happens,
    # just return an empty dictionary (an empty session).
    except:
        return {}


def get_query_hash(data):
    if type(data) is not bytes:
        data = str.encode(data)
    return md5(data + str.encode(settings.SECRET_KEY)).hexdigest()

def table_to_model_name(table):
    if isinstance(table, (list, set, tuple)):
        return [table_to_model_name(t) for t in table]
    return '"%s"' % apps.get_model(table.replace('_', '.'))._meta.verbose_name.strip()


def get_database(qbe_type):
    return 'devices' if qbe_type == 'devices_reporting' else 'slave'
