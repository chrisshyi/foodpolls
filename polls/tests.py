from django.test import TestCase, Client
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait # available since 2.4.0
from selenium.webdriver.support import expected_conditions as EC # available since 2.26.0
from .models import Question, Choice, Voter
from django.contrib.messages import get_messages
import json
from datetime import date

# class SeleniumTest(TestCase):
#     """
#     Selenium Webdriver test. Make sure the server is running first.
#     """
#     url_string = "http://127.0.0.1:8000/"
#     driver = webdriver.Chrome()
#
#     # def setUp(self):
#     #     driver = webdriver.Chrome()
#     #     driver.get("http://127.0.0.1:8000/")
#
#     def test_restaurant_search(self):
#         self.driver.get(self.url_string + "create_poll")
#         user_name_form = self.driver.find_element_by_name('creator_name')
#         user_email_form = self.driver.find_element_by_name('creator_email')
#
#         user_name_form.send_keys('Chris')
#         user_email_form.send_keys('chrisshyi13@gmail.com')
#         self.driver.find_element_by_tag_name('form').submit()
#
#         occasion_form = self.driver.find_element_by_name('question_text')
#         occasion_form.send_keys('Friday Dinner')
#         self.driver.find_element_by_tag_name('form').submit()
#
#         search_city = self.driver.find_element_by_id('search-city')
#         search_city.send_keys('Toronto')
#
#         search_term = self.driver.find_element_by_id('search-term')
#         search_term.send_keys('Sushi')
#
#         self.driver.find_element_by_id('search-btn').click()
#
#         element = WebDriverWait(self.driver, 5).\
#             until(EC.presence_of_element_located((By.CLASS_NAME, "mr-3")))
#
#         search_city.clear()
#         search_city.send_keys('Toronto')
#
#         search_term.clear()
#         search_term.send_keys('Electric Mud Ribs')
#
#         self.driver.find_element_by_id('search-btn').click()


class QuestionCreationTest(TestCase):
    """
    Class for testing question creation, i.e. collecting creator information and
    formulating the poll question
    """
    def setUp(self):
        self.client = Client()

    def test_create_poll(self):
        self.client.post('/create_poll', {'creator_name': 'Fred', 'creator_email': 'freddy213@gmail.com'})
        req_session = self.client.session
        self.assertTrue(req_session['creator_info']['creator_name'] == 'Fred')
        self.assertTrue(req_session['creator_info']['creator_email'] == 'freddy213@gmail.com')

    def test_create_poll_invalid_email(self):
        self.client.post('/create_poll', {'creator_name': 'Fred', 'creator_email': 'freddy213germail.com'})
        req_session = self.client.session
        self.assertTrue('creator_info' not in req_session)

    def test_create_question(self):
        session = self.client.session
        session['creator_info'] = {}
        session['creator_info']['creator_name'] = 'Fred'
        session.save()

        session['creator_info']['creator_email'] = 'freddy213@gmail.com'
        session.save()
        self.client.post('/create_poll/question', {'question_text': 'Michael\'s Birthday'})
        new_question = Question.objects.get(creator_name='Fred', question_text='Michael\'s Birthday')
        session = self.client.session
        self.assertTrue(session['user_name'] == 'Fred')
        self.assertTrue(session['poll_question_id'] == new_question.id)
        self.assertTrue(not session['user_voted'])

        try:
            Voter.objects.get(name='Fred', question=new_question)
        except Voter.DoesNotExist:
            self.assertTrue(False)


class PollGenerationTest(TestCase):
    """
    Class for testing poll generation, which resolves around creating
    choices for the poll
    """

    def setUp(self):
        self.client = Client()
        venues = {
            1: {
                'name': "Saku Sushi",
                'img_url': "sakusushi.com",
                'category': "Japanese",
                'rating': 4.0,
                'yelp_url': 'www.yelp.ca/sakusushi',
                'price': '$$$'
            },
            2: {
                'name': "Burgenator",
                'img_url': 'burgenator.com',
                'category': "American",
                'rating': 5.0,
                'yelp_url': 'www.yelp.ca/burgenator',
                'price': '$$'
            }
        }
        session = self.client.session
        session['venue_list'] = venues
        session.save()

    def test_add_venue(self):
        self.client.post('/add_or_delete_venue', json.dumps({
            "index": 1,
            "add": True,
        }), content_type="application/json", HTTP_X_REQUESTED_WITH='XMLHttpRequest')

        self.assertTrue('venues_to_add' in self.client.session)
        self.assertTrue(len(self.client.session['venues_to_add']) == 1)
        venue_to_add = self.client.session['venues_to_add'][0]
        self.assertTrue(venue_to_add['name'] == 'Saku Sushi')
        self.assertTrue(venue_to_add['rating'] == 4)

    def test_delete_venue(self):
        self.client.post('/add_or_delete_venue', json.dumps({
            "index": 1,
            "add": True,
        }), content_type="application/json", HTTP_X_REQUESTED_WITH='XMLHttpRequest')

        self.client.post('/add_or_delete_venue', json.dumps({
            "index": 1,
            "add": False,
        }), content_type="application/json", HTTP_X_REQUESTED_WITH='XMLHttpRequest')
        self.assertTrue(len(self.client.session['venues_to_add']) == 0)

    def test_add_multiple_venues(self):
        self.client.post('/add_or_delete_venue', json.dumps({
            "index": 1,
            "add": True,
        }), content_type="application/json", HTTP_X_REQUESTED_WITH='XMLHttpRequest')

        self.client.post('/add_or_delete_venue', json.dumps({
            "index": 2,
            "add": True,
        }), content_type="application/json", HTTP_X_REQUESTED_WITH='XMLHttpRequest')

        self.assertTrue('venues_to_add' in self.client.session)
        self.assertTrue(len(self.client.session['venues_to_add']) == 2)
        venue_to_add = self.client.session['venues_to_add'][0]
        self.assertTrue(venue_to_add['name'] == 'Saku Sushi')
        self.assertTrue(venue_to_add['rating'] == 4)
        venue_to_add = self.client.session['venues_to_add'][1]
        self.assertTrue(venue_to_add['name'] == 'Burgenator')
        self.assertTrue(venue_to_add['price'] == '$$')

    def test_generate_poll_no_venues_to_add(self):
        question = Question(question_text="blah",
                            pub_date=date.today(),
                            creator_name='blah',
                            creator_email='blah@gmail.com')
        question.save()
        session = self.client.session
        session['poll_question_id'] = question.id
        session['user_voted'] = False
        session['user_name'] = 'blah'
        session.save()
        response = self.client.get('/generate_poll')
        self.assertRedirects(response, '/polls/{}'.format(question.id))

    def test_generate_poll_two_venues(self):
        self.client.post('/add_or_delete_venue', json.dumps({
            "index": 1,
            "add": True,
        }), content_type="application/json", HTTP_X_REQUESTED_WITH='XMLHttpRequest')

        self.client.post('/add_or_delete_venue', json.dumps({
            "index": 2,
            "add": True,
        }), content_type="application/json", HTTP_X_REQUESTED_WITH='XMLHttpRequest')

        question = Question(question_text="blah",
                            pub_date=date.today(),
                            creator_name='blah',
                            creator_email='blah@gmail.com')
        question.save()
        session = self.client.session
        session['poll_question_id'] = question.id
        session['user_voted'] = False
        session['user_name'] = 'blah'
        session.save()

        response = self.client.get('/generate_poll')
        try:
            Choice.objects.get(venue_name='Burgenator')
        except Choice.DoesNotExist:
            self.assertTrue(False)

        try:
            Choice.objects.get(venue_name='Saku Sushi')
        except Choice.DoesNotExist:
            self.assertTrue(False)
        session = self.client.session
        self.assertTrue('venues_to_add' not in session)
        self.assertTrue('venue_list' not in session)
        self.assertRedirects(response, '/polls/{}'.format(question.id))
