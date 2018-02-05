from django.shortcuts import render, redirect
from django.http import HttpResponse
from .forms import CreatorInfoForm, QuestionInfoForm, JoinPollForm
from datetime import date
from django.contrib import messages
import json
import requests
from django.conf import settings
from .models import Question, Choice


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
            new_question.all_voters.append(new_question.creator_name)
            new_question.save()
            # save the creator's name in a session variable, so that the creator can vote as a user as well
            request.session['user_name'] = new_question.creator_name
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

    headers = {'Authorization': "Bearer " + settings.YELP_API_KEY,
               'User-agent': 'foodpolls; contact: chrisshyi13@gmail.com'}
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
        venues[i] = {
                     'name': business['name'],
                     'img_url': business['image_url'],
                     'category': business['categories'][0]['title'],
                     'rating': business['rating'],
                     'yelp_url': business['url'],
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
    headers = {'Authorization': "Bearer " + settings.YELP_API_KEY,
               'User-agent': 'foodpolls; contact: chrisshyi13@gmail.com'}

    response = requests.get(request_string, headers=headers).json()
    return HttpResponse(json.dumps(response))


def generate_poll(request):
    """
    Generates a poll based on creator information (name and email), as well as 
    venue choices
    :param request: the HTTP request object
    :return: a redirection to display the newly created poll
    """
    # If user decides not to add anything
    # Edge case
    if 'venues_to_add' not in request.session:
        return redirect('view_poll', poll_id=request.session['poll_question_id'])
    venues = request.session['venues_to_add']
    poll_question = Question.objects.get(id=request.session['poll_question_id'])

    # Create Choice objects and save them to database
    for venue in venues:
        choice = Choice(question=poll_question,
                        venue_name=venue['name'],
                        venue_category=venue['category'],
                        venue_picture_url=venue['img_url'],
                        avg_rating=int(venue['rating']),
                        yelp_page_url=venue['yelp_url'],
                        )
        if 'price' in venue:
            choice.price_range = venue['price']
        choice.rating_is_integer = venue['rating'].is_integer()
        choice.save()
    # clear these two session variables so that they won't conflict with additional choices that users
    # might want to add
    del request.session['venues_to_add']
    del request.session['venue_list']
    return redirect('view_poll', poll_id=request.session['poll_question_id'])


def add_or_delete_venue(request):
    """
    Receives an AJAX request from the frontend to add/delete venues during the poll creation process
    Uses a session variable to get a hold of a list of venues
    :param request: the HTTP request object
    :return: a response object indicating if the addition/deletion was successful
    """
    # json.loads(request.body) returns a Python dictionary
    add_or_delete_data = json.loads(request.body)
    venue_index = str(add_or_delete_data['index'])
    venue = request.session['venue_list'][venue_index]

    if "venues_to_add" not in request.session:
        request.session['venues_to_add'] = []
    venues_to_add = request.session['venues_to_add']
    if add_or_delete_data['add']:
        venues_to_add.append(venue)
    else:
        venues_to_add.remove(venue)
    # need to reassign the session variable since Django only saves session information when
    # any of the session dictionary values have been assigned to deleted.
    request.session['venues_to_add'] = venues_to_add
    return HttpResponse("venue successfully added/deleted")


def view_poll(request, poll_id):
    """
    Displays a poll based on the poll_id that's passed in
    :param request: the HTTP request
    :param poll_id: the id of the poll to be rendered
    :return: HTTP response displaying the desired poll
    """
    poll_question = Question.objects.get(id=poll_id)

    choices_list = Choice.objects.filter(question=poll_question)
    context = {
        'question': poll_question,
        'choices_list': choices_list,
        'question_id': poll_id,
    }
    return render(request, 'polls/poll_display.html', context)


def additional_choice_search(request):
    """
    Allows the user to add more choices to the poll, renders a page very similar to the search page during poll creation
    :param request: the HTTP request
    :return: renders a search page
    """
    return render(request, 'polls/additional_search.html')


def join_poll(request):
    """
    Displays a form that allows a user to join an existing poll
    :param request: the HTTP request
    :return: renders an HTML page with a form where the user can enter a poll id
    """
    if request.method == 'POST':
        form = JoinPollForm(request.POST)
        if form.is_valid():
            poll_id = form.cleaned_data['poll_id']
            request.session['poll_question_id'] = poll_id
            user_name = form.cleaned_data['user_name']
            try:
                question = Question.objects.get(id=poll_id)
                request.session['user_name'] = user_name
                question.all_voters.append(user_name)
                question.save()
                print(request.session['user_name'])
                return redirect('view_poll', poll_id=poll_id)
            except Question.DoesNotExist:
                messages.error(request, 'The poll ID does not exist.')
        else:
            messages.error(request, "Invalid information entered")
    else:
        form = JoinPollForm()
    return render(request, 'polls/join_poll.html', {'form': form})


def confirm_votes(request):
    """
    Registers the votes for a user
    :param request: the HTTP request
    :return: redirection to the poll results page
    """
    # TODO: json doesn't decode properly
    votes_data = json.loads(request.body)
    # set of venue ids that represent the venues a user voted for
    venue_ids = votes_data['voted_choices']
    for venue_id in venue_ids:
        choice = Choice.objects.get(id=venue_id)
        choice.voters.append(request.session['user_name'])
        choice.save()
    return HttpResponse()

