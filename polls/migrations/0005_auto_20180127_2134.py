# -*- coding: utf-8 -*-
# Generated by Django 1.11.4 on 2018-01-28 02:34
from __future__ import unicode_literals

import django.contrib.postgres.fields
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('polls', '0004_question_creator_name'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='choice',
            name='votes',
        ),
        migrations.RemoveField(
            model_name='question',
            name='voters',
        ),
        migrations.AddField(
            model_name='choice',
            name='voters',
            field=django.contrib.postgres.fields.ArrayField(base_field=models.CharField(max_length=25), default=list, size=None),
        ),
        migrations.AlterField(
            model_name='choice',
            name='price_range',
            field=models.PositiveSmallIntegerField(blank=True, default=1),
        ),
        migrations.AlterField(
            model_name='question',
            name='creator_name',
            field=models.CharField(default='', max_length=25),
        ),
    ]
