# -*- coding: utf-8 -*-
# Generated by Django 1.11.4 on 2017-11-05 21:10
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('polls', '0003_auto_20171104_1337'),
    ]

    operations = [
        migrations.AddField(
            model_name='question',
            name='creator_name',
            field=models.CharField(default='', max_length=30),
        ),
    ]