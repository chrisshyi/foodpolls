from django.db import models
from django.contrib.postgres.fields import ArrayField


class Question(models.Model):
    question_text = models.CharField(max_length=60)
    pub_date = models.DateField('date published')
    creator_email = models.EmailField(default='')
    creator_name = models.CharField(max_length=25, default='')
    
    def __str__(self):
        return "{} created by {} on {}".format(self.question_text, self.creator_name, str(self.pub_date))


# Need Voter model to make sure each voter in a poll only votes once
class Voter(models.Model):
    name = models.CharField(max_length=25)
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    voted = models.BooleanField()

    # each name-question combination should be unique. There shouldn't be two voters with the same name
    # in one question/poll
    class Meta:
        unique_together = ("name", "question")


class Choice(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    # The fields below pertain to the restaurant/venue this choice is associated with
    # Each of these can be obtained using the Yelp Fusion API
    venue_name = models.CharField(max_length=150)
    venue_category = models.CharField(max_length=200)
    venue_picture_url = models.CharField(max_length=250)
    # Range of 1 ~ 4, corresponding to Yelp price levels
    # can be blank
    price_range = models.CharField(max_length=4, blank=True)
    avg_rating = models.PositiveSmallIntegerField()
    yelp_page_url = models.CharField(max_length=250)
    # End of venue fields

    # Used to determine whether a Yelp star image with half stars should be used. Not optimal but can't think of a
    # better way to do it for now
    rating_is_integer = models.BooleanField(default=True)
    # List of people who voted for this choice
    voters = models.ManyToManyField(Voter)
