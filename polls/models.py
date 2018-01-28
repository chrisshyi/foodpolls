from django.db import models
from django.contrib.postgres.fields import ArrayField


class Question(models.Model):
    question_text = models.CharField(max_length=60)
    pub_date = models.DateField('date published')
    creator_email = models.EmailField(default='')
    creator_name = models.CharField(max_length=25, default='')
    # list of all the voters, TODO: create new Voter model
    # all_voters = ArrayField(models.CharField(max_length=25), default=list)
    
    def __str__(self):
        return "{} created by {} on {}".format(self.question_text, self.creator_name, str(self.pub_date))


class Choice(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    # The fields below pertain to the restaurant/venue this choice is associated with
    # Each of these can be obtained using the Yelp Fusion API
    venue_name = models.CharField(max_length=150)
    venue_category = models.CharField(max_length=200)
    venue_picture_url = models.CharField(max_length=250)
    # Range of 1 ~ 4, corresponding to Yelp price levels
    price_range = models.PositiveSmallIntegerField(default=1, blank=True)
    avg_rating = models.PositiveSmallIntegerField()
    yelp_page_url = models.CharField(max_length=250)
    # End of venue fields
    
    # List of people who voted for this choice
    voters = ArrayField(models.CharField(max_length=25), default=list)

# empty for now. Work on this later. 
# class Voter(models.Model):
    
