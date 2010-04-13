# -*- coding: utf-8 -*-
import heapq

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

# Taken from http://code.activestate.com/recipes/119466-dijkstras-algorithm-for-shortest-paths/
def shortest_path(G, start, end):
   def flatten(L):       # Flatten linked list of form [0,[1,[2,[]]]]
      while len(L) > 0:
         yield L[0]
         L = L[1]

   q = [(0, start, ())]  # Heap of (cost, path_head, path_rest).
   visited = set()       # Visited vertices.
   while True:
      (cost, v1, path) = heapq.heappop(q)
      if v1 not in visited:
         visited.add(v1)
         if v1 == end:
            return list(flatten(path))[::-1] + [v1]
         path = (v1, path)
         for (v2, cost2) in G[v1].iteritems():
            if v2 not in visited:
               heapq.heappush(q, (cost + cost2, v2, path))
