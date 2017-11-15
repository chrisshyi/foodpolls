from django.conf.urls import url
from . import views

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^create_poll$', views.create_poll, name='create_poll'),
    url(r'^create_poll/question$', views.create_question, name='create_question'),
    url(r'^choices/search$', views.choices_search, name='choices_search'),
    url(r'^populate_search_box$', views.populate_search_box, name='populate_search_box'),
]