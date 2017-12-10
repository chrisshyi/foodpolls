from django.test import TestCase
from selenium import webdriver


class PollCreationTest(TestCase):
    url_string = "http://127.0.0.1:8000/"
    driver = webdriver.Chrome()

    # def setUp(self):
    #     driver = webdriver.Chrome()
    #     driver.get("http://127.0.0.1:8000/")

    def test_restaurant_search(self):
        self.driver.get(self.url_string + "create_poll")
        user_name_form = self.driver.find_element_by_name('creator_name')
        user_email_form = self.driver.find_element_by_name('creator_email')

        user_name_form.send_keys('Chris')
        user_email_form.send_keys('chrisshyi13@gmail.com')
        self.driver.find_element_by_tag_name('form').submit()

        occasion_form = self.driver.find_element_by_name('question_text')
        occasion_form.send_keys('Friday Dinner')
        self.driver.find_element_by_tag_name('form').submit()

        search_city = self.driver.find_element_by_id('search-city')
        search_city.send_keys('Toronto')

        search_term = self.driver.find_element_by_id('search-term')
        search_term.send_keys('Sushi')

        self.driver.find_element_by_id('search-btn').click()


