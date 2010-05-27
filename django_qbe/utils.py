# -*- coding: utf-8 -*-
import base64
import pickle

from itertools import combinations

from django.db.models import get_models
from django.db.models.fields.related import (ForeignKey, OneToOneField,
                                             ManyToManyField)
from django.core.exceptions import SuspiciousOperation
from django.conf import settings
from django.utils.hashcompat import md5_constructor
from django.utils.importlib import import_module
from django.utils.simplejson import dumps

try:
    from django.db.models.fields.generic import GenericRelation
except ImportError:
    from django.contrib.contenttypes.generic import GenericRelation

try:
    qbe_formats = getattr(settings, "QBE_FORMATS_EXPORT", "qbe_formats")
    formats = import_module(qbe_formats).formats
except ImportError:
    from django_qbe.exports import formats
# Makes pyflakes happy
formats


def qbe_models(admin_site=None, only_admin_models=False, json=False):
    app_models = get_models()
    admin_models = admin_site and [m for m, a in admin_site._registry.items()]
    if only_admin_models:
        app_models = admin_models
    graphs = {}

    for app_model in app_models:
        model = {
            'name': app_model.__name__,
            'fields': {},
            'relations': [],
            'collapse': app_model not in admin_models,
        }

        # model attributes
        def add_attributes():
            model['fields'].update({field.name: {
                'name': field.name,
                'type': type(field).__name__,
                'blank': field.blank,
                'label': u"%s" % field.verbose_name.capitalize(),
            }})

        for field in app_model._meta.fields:
            add_attributes()

        if app_model._meta.many_to_many:
            for field in app_model._meta.many_to_many:
                add_attributes()

        # relations
        def add_relation(extras=""):
            target = {
                'name': field.rel.to.__module__.split(".")[-2].capitalize(),
                'model': field.rel.to.__name__,
                'field': field.rel.get_related_field().name}
            if hasattr(field.rel, 'through'):
                # FIXME: Treatment of ManyToMany relations and through field
                #        is not complete
                through_fields = []
                for through_field in field.rel.through._meta.fields:
                    label = through_field.verbose_name.capitalize()
                    through_fields.append({
                        'name': through_field.name,
                        'type': type(through_field).__name__,
                        'blank': through_field.blank,
                        'label': u"%s" % label,
                    })
                name = field.rel.through.__module__.split(".")[-2].capitalize()
                target.update({
                    'through': {
                        'name': name,
                        'model': field.rel.through.__name__,
                        'fields': through_fields,
                    }
                })
            _rel = {
                'target': target,
                'type': type(field).__name__,
                'source': field.name,
                'arrows': extras,
            }
            if _rel not in model['relations']:
                model['relations'].append(_rel)
            model['fields'][field.name].update({'target': target})

        for field in app_model._meta.fields:
            if isinstance(field, ForeignKey):
                add_relation()
            elif isinstance(field, OneToOneField):
                add_relation("[arrowhead=none arrowtail=none]")

        if app_model._meta.many_to_many:
            for field in app_model._meta.many_to_many:
                if isinstance(field, ManyToManyField):
                    add_relation("[arrowhead=normal arrowtail=normal]")
                elif isinstance(field, GenericRelation):
                    add_relation(
                        '[style="dotted"] [arrowhead=normal arrowtail=normal]')

        app_title = app_model._meta.app_label.title()
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
            relations = w['relations']
            if key not in graph:
                graph[key] = []
            for r in relations:
                value = "%s.%s" % (r['target']['name'], r['target']['model'])
                if value not in graph[key]:
                    graph[key].append(value)
                if not directed:
                    if value not in graph:
                        graph[value] = []
                    if key not in graph[value]:
                        graph[value].append(key)
    return graph


def find_all_paths(graph, start, end, path=[]):
    path = path + [start]
    if start == end:
        return [path]
    if start not in graph:
        return []
    paths = []
    for node in graph[start]:
        if node not in path:
            newpaths = find_all_paths(graph, node, end, path)
            for newpath in newpaths:
                paths.append(newpath)
    return paths


def autocomplete_graph(admin_site, current_models):
    if len(current_models) < 2:
        return None
    graph = qbe_graph(admin_site)
    valid_paths = []
    for c, d in combinations(current_models, 2):
        paths = find_all_paths(graph, c, d)
        for path in paths:
            if all(map(lambda x: x in path, current_models)):
                for model in current_models:
                    path.remove(model)
                if path not in valid_paths:
                    valid_paths.append(path)
    return sorted(valid_paths, cmp=lambda x, y: cmp(len(x), len(y)))


# Taken from django.contrib.sessions.backends.base
def pickle_encode(session_dict):
    "Returns the given session dictionary pickled and encoded as a string."
    pickled = pickle.dumps(session_dict, pickle.HIGHEST_PROTOCOL)
    pickled_md5 = md5_constructor(pickled + settings.SECRET_KEY).hexdigest()
    return base64.encodestring(pickled + pickled_md5)


# Taken from django.contrib.sessions.backends.base
def pickle_decode(session_data):
    encoded_data = base64.decodestring(session_data)
    pickled, tamper_check = encoded_data[:-32], encoded_data[-32:]
    pickled_md5 = md5_constructor(pickled + settings.SECRET_KEY).hexdigest()
    if pickled_md5 != tamper_check:
        raise SuspiciousOperation("User tampered with session cookie.")
    try:
        return pickle.loads(pickled)
    # Unpickling can cause a variety of exceptions. If something happens,
    # just return an empty dictionary (an empty session).
    except:
        return {}
