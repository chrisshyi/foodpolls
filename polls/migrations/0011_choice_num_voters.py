# -*- coding: utf-8 -*-
# Generated by Django 1.11.4 on 2018-03-11 20:09
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('polls', '0010_auto_20180206_2158'),
    ]

    operations = [
        migrations.AddField(
            model_name='choice',
            name='num_voters',
            field=models.PositiveSmallIntegerField(default=0),
        ),
    ]
