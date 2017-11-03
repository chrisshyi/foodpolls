from django.db import models

# Create your models here.

class Question(models.Model):
    question_text = models.CharField(max_length = 300)
    pub_date = models.DateField('date published')
    # voters is a JSON serialized Python list of strings
    voters = models.CharField(max_length = 300)

class Choice(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    # The fields below pertain to the restaurant/venue this choice is associated with
    venue_name = models.CharField(max_length = 150)
    venue_category = models.CharField(max_length = 200)
    venue_picture_url = models.CharField(max_length = 250)
    avg_rating = models.PositiveSmallIntegerField()
    yelp_page_url = models.CharField(max_length = 250)
    # End of venue fields
    votes = models.PositiveSmallIntegerField(default = 0)