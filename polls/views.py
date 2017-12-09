from django.shortcuts import render, redirect
from django.http import HttpResponse
from .forms import CreatorInfoForm, QuestionInfoForm
from datetime import date
from django.contrib import messages
import json
import requests
from django.conf import settings


def index(request):
    return render(request, 'polls/index.html')


def create_poll(request):
    if request.method == 'POST':
        form = CreatorInfoForm(request.POST)
        if form.is_valid():
            # Store the creator's information in session variables
            # so it can be retrieved later
            creator_info = {
                'creator_name': form.cleaned_data['creator_name'],
                'creator_email': form.cleaned_data['creator_email'],
            }
            request.session['creator_info'] = creator_info
            return redirect('create_question')
        else:
            messages.error(request, 'Invalid information entered')

    else:
        form = CreatorInfoForm()
    return render(request, 'polls/user_info.html',{'form': form})


def create_question(request):
    if request.method == 'POST':
        form = QuestionInfoForm(request.POST)
        if form.is_valid():
            new_question = form.save(commit = False)
            new_question.pub_date = date.today()
            # Populate creator information
            new_question.creator_name = request.session['creator_info']['creator_name']
            new_question.creator_email = request.session['creator_info']['creator_email']
            
            new_question.voters = ''
            new_question.save()
            return redirect('choices_search')
        else:
            messages.error(request, 'Invalid information entered')
    else:
        form = QuestionInfoForm()
    return render(request, 'polls/create_question.html', {'form': form})


def choices_search(request):
    return render(request, 'polls/choices_search.html')


def populate_search_box(request):
    """
    Populates
    :param request:
    :return:
    """

    # search_data is a Python dictionary
    search_data = json.loads(request.body)

    search_term = search_data['search_term']
    city = search_data['city']

    headers = {'Authorization': yelp_authenticate()}
    params = {
        'term': search_term,
        'location': city,
        'limit': 10,
    }
    print(city)
    yelp_search_response = requests.get('https://api.yelp.com/v3/businesses/search', headers=headers, params=params).json()

    return HttpResponse(json.dumps(yelp_search_response))


def yelp_authenticate():
    """
    Handles authentication when using the Yelp Fusion API
    :return: token string that is used to access Yelp Fusion API endpoints
    """
    yelp_data = {
        "grant_type": "client_credentials",
        "client_id": settings.YELP_CLIENT_ID,
        "client_secret": settings.YELP_CLIENT_SECRET,
    }
    yelp_auth_response = requests.post("https://api.yelp.com/oauth2/token", yelp_data).json()
    
    yelp_token = yelp_auth_response['access_token']
    token_type = yelp_auth_response['token_type']

    token_string = token_type + " " + yelp_token 
    return token_string

