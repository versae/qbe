# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Changing field 'SavedQuery.query_hash'
        db.alter_column('django_qbe_savedquery', 'query_hash', self.gf('django.db.models.fields.CharField')(default='', max_length=32))

    def backwards(self, orm):
        # Changing field 'SavedQuery.query_hash'
        db.alter_column('django_qbe_savedquery', 'query_hash', self.gf('django.db.models.fields.CharField')(max_length=32, null=True))

    models = {
        'django_qbe.savedquery': {
            'Meta': {'object_name': 'SavedQuery'},
            'date_created': ('django.db.models.fields.DateTimeField', [], {'auto_now_add': 'True', 'blank': 'True'}),
            'date_updated': ('django.db.models.fields.DateTimeField', [], {'auto_now': 'True', 'blank': 'True'}),
            'description': ('django.db.models.fields.TextField', [], {'blank': 'True'}),
            'id': ('django.db.models.fields.AutoField', [], {'primary_key': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'query_data': ('picklefield.fields.PickledObjectField', [], {}),
            'query_hash': ('django.db.models.fields.CharField', [], {'max_length': '32', 'blank': 'True'})
        }
    }

    complete_apps = ['django_qbe']