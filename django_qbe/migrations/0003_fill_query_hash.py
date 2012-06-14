# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import DataMigration
from django.db import models

from ..utils import get_query_hash, pickle_encode

class Migration(DataMigration):

    def forwards(self, orm):
        for saved_query in orm['django_qbe.SavedQuery'].objects.all():
            saved_query.query_hash = get_query_hash(pickle_encode(saved_query.query_data))
            saved_query.save()

    def backwards(self, orm):
        "Write your backwards methods here."


    models = {
        'django_qbe.savedquery': {
            'Meta': {'object_name': 'SavedQuery'},
            'date_created': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'date_updated': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'query_data': ('picklefield.fields.PickledObjectField', [], {}),
            'query_hash': ('django.db.models.fields.CharField', [], {'max_length': '32', 'null': 'True', 'blank': 'True'})
        }
    }

    complete_apps = ['django_qbe']
    symmetrical = True
