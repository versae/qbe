# -*- coding: utf-8 -*-
import datetime
from south.db import db
from south.v2 import SchemaMigration
from django.db import models


class Migration(SchemaMigration):

    def forwards(self, orm):
        # Adding model 'SavedQuery'
        db.create_table('savedqueries_savedquery', (
            ('query_hash', self.gf('django.db.models.fields.CharField')(max_length=32, primary_key=True)),
            ('name', self.gf('django.db.models.fields.CharField')(max_length=100)),
            ('description', self.gf('django.db.models.fields.TextField')(blank=True)),
            ('query_data', self.gf('picklefield.fields.PickledObjectField')()),
            ('date_created', self.gf('django.db.models.fields.DateTimeField')(default=datetime.datetime.now)),
            ('date_updated', self.gf('django.db.models.fields.DateTimeField')()),
        ))
        db.send_create_signal('savedqueries', ['SavedQuery'])

    def backwards(self, orm):
        # Deleting model 'SavedQuery'
        db.delete_table('savedqueries_savedquery')

    models = {
        'savedqueries.savedquery': {
            'Meta': {'object_name': 'SavedQuery'},
            'date_created': ('django.db.models.fields.DateTimeField', [], {'default': 'datetime.datetime.now'}),
            'date_updated': ('django.db.models.fields.DateTimeField', [], {}),
            'description': ('django.db.models.fields.TextField', [], {'blank': 'True'}),
            'name': ('django.db.models.fields.CharField', [], {'max_length': '100'}),
            'query_data': ('picklefield.fields.PickledObjectField', [], {}),
            'query_hash': ('django.db.models.fields.CharField', [], {'max_length': '32', 'primary_key': 'True'})
        }
    }

    complete_apps = ['savedqueries']