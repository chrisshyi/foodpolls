from django.shortcuts import render, redirect
from django.http import HttpResponse
from .forms import CreatorInfoForm, QuestionInfoForm
from datetime import date
from django.contrib import messages
import json
import requests
from django.conf import settings
from .models import Question, Choice

class Venue:
    def __init__(self, name, category, image_url, rating, yelp_url, price=''):
        self.name = name
        self.category = category
        self.image_url = image_url
        self.price = price
        self.rating = rating
        self.yelp_url = yelp_url
    
    def __str__(self):
        return "{}, category: {}".format(self.name, self.category)

    def __eq__(self, obj):
        return isinstance(obj, Venue) and obj.name == self.name and obj.yelp_url == self.yelp_url


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
    return render(request, 'polls/user_info.html', {'form': form})


def create_question(request):
    if request.method == 'POST':
        form = QuestionInfoForm(request.POST)
        if form.is_valid():
            new_question = form.save(commit=False)
            new_question.pub_date = date.today()
            # Populate creator information
            new_question.creator_name = request.session['creator_info']['creator_name']
            new_question.creator_email = request.session['creator_info']['creator_email']
            
            new_question.voters = ''
            new_question.save()
            request.session['poll_question_id'] = new_question.id
            return redirect('choices_search')
        else:
            messages.error(request, 'Invalid information entered')
    else:
        form = QuestionInfoForm()
    return render(request, 'polls/create_question.html', {'form': form})


def choices_search(request):
    return render(request, 'polls/choices_search.html')


def search_for_venues(request):
    """
    Searches for venues based on data in the request object, using the Yelp Fusion API
    :param request: the request object
    :return: a response encapsulating the Yelp search results
    """

    # search_data is a Python dictionary
    search_data = json.loads(request.body)

    optional_params = ['categories', 'price', 'sort_by']

    search_term = search_data['search_term']
    city = search_data['city']

    headers = {'Authorization': "Bearer " + settings.YELP_API_KEY}
    params = {
        'term': search_term,
        'location': city,
        'limit': 15,
    }
    # Add optional parameters only if they're in the AJAX request
    for param in optional_params:
        if param in search_data:
            params[param] = search_data[param]

    yelp_search_response = \
        requests.get('https://api.yelp.com/v3/businesses/search', headers=headers, params=params).json()
    businesses_list = yelp_search_response['businesses']
    venues = {}

    for i in range(len(businesses_list)):
        business = businesses_list[i]
        print("venue number: " + str(i))
        venues[i] = { \
                     'name': business['name'], \
                     'image_url': business['image_url'], \
                     'category': business['categories'][0]['title'], \
                     'rating': business['rating'], \
                     'yelp_url': business['url'], \
                    }
        if 'price' in business:
            venues[i]['price'] = business['price']
    request.session['venue_list'] = venues
    for key, value in request.session['venue_list'].items():
        print(value['name'])
        print(value['rating'])
    return HttpResponse(json.dumps(yelp_search_response))


def get_reviews(request):
    """
    Retrieves three reviews for a certain venue
    :param request: the HTTP request
    :return: a response object encapsulating the reviews
    """
    business_id = json.loads(request.body)['business_id']
    # form the request string
    request_string = "https://api.yelp.com/v3/businesses/{}/reviews".format(business_id)
    # put authorization tokens in the header
    headers = {'Authorization': "Bearer " + settings.YELP_API_KEY}

    response = requests.get(request_string, headers=headers).json()
    return HttpResponse(json.dumps(response))

def generate_poll(request):
    """
    Generates a poll based on creator information (name and email), as well as 
    venue choices
    :param request: the HTTP request object
    :return: a response object rendering the poll display page
    """
    return render(request, 'polls/poll_display.html', \
                   {'question': Question.objects.get(id=request.session['poll_question_id'])})

def add_or_delete_venue(request):
    """
    Receives an AJAX request from the frontend to add/delete venues during the poll creation process
    Uses a session variable to get a hold of a list of venues
    :param request: the HTTP request object
    :return: a response object indicating if the addition/deletion was successful
    """
    # json.loads(request.body) returns a Python dictionary
    add_or_delete_data = json.loads(request.body)
    index = add_or_delete_data['index']
    venue = request.session['venue_list'][index]
    venue_obj = Venue(venue['name'], venue['category'], venue['img_url'], venue['rating'], venue['yelp_url'])

    if 'price' in venue:
        venue_obj.price = venue['price']

    if "venues_to_add" not in request.session:
        request.session['venues_to_add'] = []
    if add_or_delete_data['add']:
        request.session['venues_to_add'].append(venue_obj)
    else:
        request.session['venues_to_add'].remove(venue_obj)
    return HttpResponse("venue successfully added/deleted")