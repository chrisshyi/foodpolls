from django import forms

class CreatorInfoForm(forms.Form):
    creator_name = forms.CharField(label="Your Name", max_length = 70)
    creator_email = forms.EmailField(label="Your Email")