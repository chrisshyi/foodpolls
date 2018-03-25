from django import forms
from django.forms import ModelForm
from .models import Question


class CreatorInfoForm(forms.Form):
    creator_name = forms.CharField(label="Your Name", max_length=70)


class QuestionInfoForm(ModelForm):
    class Meta:
        model = Question
        fields = ['question_text',]
        labels = {'question_text': 'What\'s the occasion?'}


class JoinPollForm(forms.Form):
    poll_id = forms.IntegerField(label="Enter Poll ID", max_value=1000, min_value=0)
    user_name = forms.CharField(label="Your name is?", max_length=30)
