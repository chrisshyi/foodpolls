from django.conf.urls import url
from . import views

urlpatterns = [
    url(r'^$', views.index, name='index'),
    url(r'^create_poll$', views.create_poll, name='create_poll'),
    url(r'^create_poll/question$', views.create_question, name='create_question'),
    url(r'^choices/search$', views.choices_search, name='choices_search'),
    url(r'^search_for_venues$', views.search_for_venues, name='search_for_venues'),
    url(r'^get_reviews$', views.get_reviews, name='get_reviews'),
    url(r'^generate_poll$', views.generate_poll, name='generate_poll'),
    url(r'^add_or_delete_venue$', views.add_or_delete_venue, name='add_or_delete_venue'),
    url(r'^polls/(?P<poll_id>[0-9]+)$', views.view_poll, name='view_poll'),
    url(r'^additional_choice_search$', views.additional_choice_search, name='additional_choice_search'),
    url(r'^join_poll$', views.join_poll, name='join_poll'),
    url(r'^confirm_votes$', views.confirm_votes, name='confirm_votes'),
    url(r'^poll_results/(?P<poll_id>[0-9]+)$', views.poll_results, name='poll_results'),
    url(r'^get_voters', views.get_voters, name='get_voters'),
]