from django.db import models

# Create your models here.

class Question(models.Model):
    question_text = models.CharField(max_length = 60)
    pub_date = models.DateField('date published')
    # voters is a JSON serialized Python list of strings
    voters = models.CharField(max_length = 200)
    creator_email = models.EmailField(default = '')
    creator_name = models.CharField(max_length = 30, default='')
    
    def __str__(self):
        return "{} created by {} on {}".format(self.question_text, self.creator_name, str(self.pub_date))


class Choice(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    # The fields below pertain to the restaurant/venue this choice is associated with
    # Each of these can be obtained using the Yelp Fusion API
    venue_name = models.CharField(max_length = 150)
    venue_category = models.CharField(max_length = 200)
    venue_picture_url = models.CharField(max_length = 250)
    # Range of 1 ~ 4, corresponding to Yelp price levels
    price_range = models.PositiveSmallIntegerField(default = 1)
    avg_rating = models.PositiveSmallIntegerField()
    yelp_page_url = models.CharField(max_length = 250)
    # End of venue fields
    votes = models.PositiveSmallIntegerField(default = 0)