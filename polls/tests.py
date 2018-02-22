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


class JoinPollTest(TestCase):

    def setUp(self):
        self.question = Question(
            question_text="Friday Dinner",
            pub_date=date.today(),
            creator_email="chris@gmail.com",
            creator_name='Chris'
        )
        self.question.save()
        self.client = Client()

    def test_join_poll_new_user(self):
        response = self.client.get('/join_poll')
        self.assertTemplateUsed(response, 'polls/join_poll.html')

        response = self.client.post('/join_poll', {
            'poll_id': self.question.id,
            'user_name': 'Andria',
        })
        session = self.client.session
        self.assertTrue('poll_question_id' in session)
        self.assertTrue(session['poll_question_id'] == self.question.id)
        self.assertRedirects(response, '/polls/{}'.format(self.question.id))
        self.assertTrue(not session['user_voted'])
        self.assertTrue('user_name' in session)
        self.assertTrue(session['user_name'] == 'Andria')

        try:
            Voter.objects.get(name='Andria', question=self.question)
        except Voter.DoesNotExist:
            self.assertTrue(False)

    def test_join_poll_existing_user_voted(self):
        voter = Voter(name='Andria', question=self.question, voted=True)
        voter.save()

        response = self.client.post('/join_poll', {
            'user_name': 'Andria',
            'poll_id': self.question.id,
        })
        self.assertRedirects(response, '/polls/{}'.format(self.question.id))
        session = self.client.session
        self.assertTrue(session['user_name'] == 'Andria')
        self.assertTrue(session['user_voted'])
        self.assertTrue(session['poll_question_id'] == self.question.id)

    def test_join_poll_existing_user_not_voted(self):
        voter = Voter(name='Andria', question=self.question, voted=False)
        voter.save()

        response = self.client.post('/join_poll', {
            'user_name': 'Andria',
            'poll_id': self.question.id,
        })
        self.assertRedirects(response, '/polls/{}'.format(self.question.id))
        session = self.client.session
        self.assertTrue(session['user_name'] == 'Andria')
        self.assertTrue(not session['user_voted'])
        self.assertTrue(session['poll_question_id'] == self.question.id)

    def test_join_poll_invalid_poll_id(self):
        self.client.post('/join_poll', {
            'user_name': 'Andria',
            'poll_id': (self.question.id + 1),
        })
        session = self.client.session
        self.assertTrue('user_name' not in session)
        self.assertTrue('poll_question_id' not in session)
        self.assertTrue('user_voted' not in session)
        self.assertTemplateUsed('polls/join_poll.html')


class ConfirmVotesTest(TestCase):

    def setUp(self):
        self.client = Client()
        self.question = Question(question_text='Friday Dinner',
                                 creator_name='Chris',
                                 creator_email='chris@gmail.com',
                                 pub_date=date.today())
        self.question.save()
        self.choice_one = Choice(question=self.question,
                                 venue_name='Saku Sushi',
                                 venue_category='Japanese',
                                 venue_picture_url='www.yelp.ca/sku.jpg',
                                 price_range='$$',
                                 avg_rating=4,
                                 yelp_page_url='www.yelp.ca/sku',
                                 rating_is_integer=True,
                                 )
        self.choice_one.save()
        self.choice_two = Choice(question=self.question,
                                 venue_name='Slab Burgers',
                                 venue_category='American',
                                 venue_picture_url='www.yelp.ca/slab.jpg',
                                 price_range='$$',
                                 avg_rating=4,
                                 yelp_page_url='www.yelp.ca/slab',
                                 rating_is_integer=True)
        self.choice_two.save()
        voter_one = Voter(question=self.question,
                          name='Michael',
                          voted=False)
        voter_one.save()
        voter_two = Voter(question=self.question,
                          name='Andria',
                          voted=True)
        voter_two.save()
        session = self.client.session
        session['poll_question_id'] = self.question.id
        session.save()

    def test_confirm_votes_user_not_voted(self):
        session = self.client.session
        session['user_name'] = 'Michael'
        session.save()

        voter = Voter.objects.get(question=Question.objects.get(id=self.question.id),
                                  name='Michael')
        self.assertTrue(not voter.voted)
        response = self.client.post('/confirm_votes', json.dumps([self.choice_one.id]), content_type='text/json')
        voter = Voter.objects.get(question=Question.objects.get(id=self.question.id),
                                  name='Michael')
        self.assertTrue(voter.voted)
        choice = Choice.objects.get(question=self.question, venue_name='Saku Sushi')
        self.assertTrue(voter in choice.voters.all())

        decoded_response = json.loads(response.content)
        self.assertTrue(not decoded_response['user_already_voted'])

    def test_confirm_votes_user_already_voted(self):
        session = self.client.session
        session['user_name'] = 'Andria'
        session.save()

        voter = Voter.objects.get(question=Question.objects.get(id=self.question.id),
                                  name='Andria')
        self.assertTrue(voter.voted)
        response = self.client.post('/confirm_votes', json.dumps([self.choice_one.id]), content_type='text/json')
        voter = Voter.objects.get(question=Question.objects.get(id=self.question.id),
                                  name='Andria')
        self.assertTrue(voter.voted)
        choice = Choice.objects.get(question=self.question, venue_name='Saku Sushi')
        self.assertTrue(voter not in choice.voters.all())

        decoded_response = json.loads(response.content)
        self.assertTrue(decoded_response['user_already_voted'])

    def test_confirm_two_votes(self):
        session = self.client.session
        session['user_name'] = 'Michael'
        session.save()

        voter = Voter.objects.get(question=Question.objects.get(id=self.question.id),
                                  name='Michael')
        self.assertTrue(not voter.voted)
        response = self.client.post('/confirm_votes',
                                    json.dumps([self.choice_one.id,
                                                self.choice_two.id]),
                                    content_type='text/json')
        voter = Voter.objects.get(question=Question.objects.get(id=self.question.id),
                                  name='Michael')
        self.assertTrue(voter.voted)
        choice = Choice.objects.get(question=self.question, venue_name='Saku Sushi')
        self.assertTrue(voter in choice.voters.all())

        choice = Choice.objects.get(question=self.question, venue_name='Slab Burgers')
        self.assertTrue(voter in choice.voters.all())

        decoded_response = json.loads(response.content)
        self.assertTrue(not decoded_response['user_already_voted'])


class GetVotersTest(TestCase):

    def setUp(self):
        self.client = Client()
        self.question = Question(question_text='Friday Dinner',
                                 creator_name='Chris',
                                 creator_email='chris@gmail.com',
                                 pub_date=date.today())
        self.question.save()
        self.choice_one = Choice(question=self.question,
                                 venue_name='Saku Sushi',
                                 venue_category='Japanese',
                                 venue_picture_url='www.yelp.ca/sku.jpg',
                                 price_range='$$',
                                 avg_rating=4,
                                 yelp_page_url='www.yelp.ca/sku',
                                 rating_is_integer=True,
                                 )
        self.choice_one.save()
        voter_one = Voter(question=self.question,
                          name='Michael',
                          voted=True)
        voter_one.save()
        self.choice_one.voters.add(voter_one)
        self.choice_one.save()

    def test_get_voters(self):
        response = self.client.post('/get_voters',
                                    json.dumps(self.choice_one.id),
                                    content_type='text/json')
        decoded_response = json.loads(response.content)
        self.assertTrue(decoded_response['venue_name'] == 'Saku Sushi')
        self.assertEquals(len(decoded_response['voters_list']), 1)
        self.assertTrue('Michael' in decoded_response['voters_list'])

    def test_get_no_voters(self):
        self.choice_two = Choice(question=self.question,
                                 venue_name='Slab Burgers',
                                 venue_category='American',
                                 venue_picture_url='www.yelp.ca/slab.jpg',
                                 price_range='$$',
                                 avg_rating=4,
                                 yelp_page_url='www.yelp.ca/slab',
                                 rating_is_integer=True)
        self.choice_two.save()
        response = self.client.post('/get_voters',
                                    json.dumps(self.choice_two.id),
                                    content_type='text/json')
        decoded_response = json.loads(response.content)
        self.assertTrue(decoded_response['venue_name'] == 'Slab Burgers')
        self.assertEquals(len(decoded_response['voters_list']), 0)
        self.assertTrue('Michael' not in decoded_response['voters_list'])


class ResetVotesTest(TestCase):

    def setUp(self):
        self.client = Client()
        self.question = Question(question_text='Friday Dinner',
                                 creator_name='Chris',
                                 creator_email='chris@gmail.com',
                                 pub_date=date.today())
        self.question.save()
        self.choice_one = Choice(question=self.question,
                                 venue_name='Saku Sushi',
                                 venue_category='Japanese',
                                 venue_picture_url='www.yelp.ca/sku.jpg',
                                 price_range='$$',
                                 avg_rating=4,
                                 yelp_page_url='www.yelp.ca/sku',
                                 rating_is_integer=True,
                                 )
        self.choice_one.save()
        self.choice_two = Choice(question=self.question,
                                 venue_name='Slab Burgers',
                                 venue_category='American',
                                 venue_picture_url='www.yelp.ca/slab.jpg',
                                 price_range='$$',
                                 avg_rating=4,
                                 yelp_page_url='www.yelp.ca/slab',
                                 rating_is_integer=True)
        self.choice_two.save()
        self.voter_one = Voter(question=self.question,
                               name='Michael',
                               voted=True)
        self.voter_one.save()
        self.voter_two = Voter(question=self.question,
                               name='Andria',
                               voted=True)
        self.voter_two.save()
        self.choice_one.voters.add(self.voter_one)
        self.choice_one.save()

        self.choice_two.voters.add(self.voter_one)
        self.choice_two.save()

        session = self.client.session
        session['poll_question_id'] = self.question.id
        session.save()
        session['user_name'] = 'Michael'
        session.save()

    def test_reset_votes(self):

        self.assertTrue(self.voter_one in self.choice_one.voters.all())
        self.assertTrue(self.voter_one in self.choice_two.voters.all())
        response = self.client.post('/reset_votes')
        self.voter_one = Voter.objects.get(question=self.question,
                                           name='Michael')
        self.assertFalse(self.voter_one.voted)
        session = self.client.session
        self.assertFalse(session['user_voted'])
        self.assertFalse(self.voter_one in self.choice_one.voters.all())
        self.assertFalse(self.voter_one in self.choice_two.voters.all())
        self.assertRedirects(response, '/polls/{}'.format(self.question.id))

    def test_reset_no_votes(self):
        session = self.client.session
        session['user_name'] = 'Andria'
        session.save()

        self.assertTrue(self.voter_two not in self.choice_one.voters.all())
        self.assertTrue(self.voter_two not in self.choice_two.voters.all())
        response = self.client.post('/reset_votes')
        self.voter_two = Voter.objects.get(question=self.question,
                                           name='Andria')
        self.assertFalse(self.voter_two.voted)
        session = self.client.session
        self.assertFalse(session['user_voted'])
        self.assertFalse(self.voter_two in self.choice_one.voters.all())
        self.assertFalse(self.voter_two in self.choice_two.voters.all())
        self.assertRedirects(response, '/polls/{}'.format(self.question.id))