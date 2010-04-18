# -*- coding: utf-8 -*-
from collections import deque
from itertools import combinations

from django.db.models import get_apps, get_models
from django.db.models.fields.related import (ForeignKey, OneToOneField,
                                             ManyToManyField)
from django.utils.simplejson import dumps

try:
    from django.db.models.fields.generic import GenericRelation
except ImportError:
    from django.contrib.contenttypes.generic import GenericRelation


def qbe_models(admin_site=None, only_admin_models=False, json=False):
    apps = get_apps()
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
            'collapse': app_model not in admin_models
            }

        # model attributes
        def add_attributes():
            model['fields'].update({field.name: {
                'name': field.name,
                'type': type(field).__name__,
                'blank': field.blank,
                'label': u"%s" % field.verbose_name.capitalize()
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
                    through_fields.append({
                        'name': through_field.name,
                        'type': type(through_field).__name__,
                        'blank': through_field.blank,
                        'label': u"%s" % through_field.verbose_name.capitalize()
                    })
                target.update({
                    'through': {
                        'name': field.rel.through.__module__.split(".")[-2].capitalize(),
                        'model': field.rel.through.__name__,
                        'fields': through_fields,
                    }
                })
            _rel = {
                'target': target,
                'type': type(field).__name__,
                'source': field.name,
                'arrows': extras
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
    if not graph.has_key(start):
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
    return sorted(valid_paths, cmp=lambda x,y: cmp(len(x), len(y)))
