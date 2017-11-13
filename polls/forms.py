from django import forms
from django.forms import ModelForm
from .models import Question


class CreatorInfoForm(forms.Form):
    creator_name = forms.CharField(label="Your Name", max_length = 70)
    creator_email = forms.EmailField(label="Your Email")
    
class QuestionInfoForm(ModelForm):
    class Meta:
        model = Question
        fields = ['question_text',]
        labels = {'question_text': 'What\'s the occasion?'}
