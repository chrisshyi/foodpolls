from django.shortcuts import render, redirect
from django.http import HttpResponse
from .forms import CreatorInfoForm, QuestionInfoForm, JoinPollForm
from datetime import date
from django.contrib import messages
import json
import requests
from django.conf import settings
from .models import Question, Choice, Voter

VENUE_LIMIT = 15

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

            new_question.save()
            # the creator of the poll is a voter too
            creator = Voter(name=new_question.creator_name, question=new_question, voted=False)
            # save the creator's name in a session variable, so that the creator can vote as a user as well
            creator.save()
            request.session['user_name'] = new_question.creator_name
            request.session['poll_question_id'] = new_question.id
            request.session['user_voted'] = False
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
        'limit': VENUE_LIMIT,
    }
    # Add optional parameters only if they're in the AJAX request
    for param in optional_params:
        if param in search_data:
            params[param] = search_data[param]

    yelp_search_response = \
        requests.get('https://api.yelp.com/v3/businesses/search', headers=headers, params=params).json()
    businesses_list = yelp_search_response['businesses']
    venues_list = []

    for i in range(len(businesses_list)):
        business = businesses_list[i]
        venue_dict = {
                     'name': business['name'],
                     'img_url': business['image_url'],
                     'categories': business['categories'],
                     'rating': business['rating'],
                     'yelp_url': business['url'],
                     'review_count': business['review_count'],
                     'yelp_id': business['id'],
                    }
        if 'price' in business:
            venue_dict['price'] = business['price']
        # form the request string
        request_string = "https://api.yelp.com/v3/businesses/{}/reviews".format(business['id'])
        # put authorization tokens in the header
        headers = {'Authorization': "Bearer " + settings.YELP_API_KEY,
                   'User-agent': 'foodpolls; contact: chrisshyi13@gmail.com'}

        review_response = requests.get(request_string, headers=headers).json()
        venue_dict['reviews'] = review_response['reviews']  # list of reviews
        venues_list.append(venue_dict)

    return HttpResponse(json.dumps({'venues_list': venues_list}))


def generate_poll(request):
    """
    Generates a poll based on creator information, as well as
    venue choices
    :param request: the HTTP request object
    :return: a redirection to display the newly created poll
    """
    # Not supposed to reach this endpoint via GET request
    if request.method == 'GET':
        return redirect('view_poll', poll_id=request.session['poll_question_id'])

    venues_to_add = json.loads(request.body)
    # If user decides not to add anything
    # Edge case
    if len(venues_to_add) == 0:
        return redirect('view_poll', poll_id=request.session['poll_question_id'])
    poll_question = Question.objects.get(id=request.session['poll_question_id'])

    # Create Choice objects and save them to database
    for venue in venues_to_add:
        try:
            Choice.objects.get(question=poll_question, venue_name=venue['name'])  # see if choice already exists
        except Choice.DoesNotExist:
            choice = Choice(question=poll_question,
                            venue_name=venue['name'],
                            venue_category=venue['category'],
                            venue_picture_url=venue['img_url'],
                            avg_rating=int(venue['rating']),
                            yelp_page_url=venue['yelp_url'],
                            )
            if 'price' in venue:
                choice.price_range = venue['price']
            choice.rating_is_integer = isinstance(venue['rating'], int)
            choice.save()
    return redirect('view_poll', poll_id=request.session['poll_question_id'])


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
        'user_voted': request.session['user_voted'],
        'user_name': request.session['user_name'],
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
            user_name = form.cleaned_data['user_name']
            try:
                question = Question.objects.get(id=poll_id)
                request.session['poll_question_id'] = poll_id
                request.session['user_name'] = user_name
                try:
                    voter = Voter.objects.get(name=user_name, question=question)
                # if the voter doesn't exist, create a new Voter object and register it with the current poll question
                except Voter.DoesNotExist:
                    voter = Voter(name=user_name, question=question, voted=False)
                    voter.save()
                request.session['user_voted'] = voter.voted
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
    # set of venue ids that represent the venues a user voted for
    venue_ids = json.loads(request.body)
    voter = Voter.objects.get(question=Question.objects.get(id=request.session['poll_question_id']),
                              name=request.session['user_name'])
    # prevent the voter from voting twice, unless she resets her votes
    if not voter.voted:
        for venue_id in venue_ids:
            choice = Choice.objects.get(id=venue_id)
            if voter not in choice.voters.all():
                choice.voters.add(voter)
                choice.num_voters += 1
            choice.save()
        voter.voted = True
        voter.save()
        response_data = {
            'user_already_voted': False
        }
    else:
        response_data = {
            'user_already_voted': True
        }
    return HttpResponse(json.dumps(response_data))


def poll_results(request, poll_id):
    """
    Displays the results of the poll
    :param request: the HTTP request
    :param poll_id: the id of the poll to be displayed
    :return: renders the poll result page
    """
    poll_question = Question.objects.get(id=poll_id)
    choice_objects = Choice.objects.filter(question=poll_question).order_by('-num_voters')
    context = {
        'question': poll_question,
        'choices_list': choice_objects,
        'question_id': poll_id,
        'user_voted': request.session['user_voted'],
        'user_name': request.session['user_name'],
    }
    return render(request, 'polls/poll_results.html', context)


def get_voters(request):
    """
    Returns the list of voters for a particular venue choice to the front end
    :param request: the HTTP request
    :return: An HTTP response with the list of voters for a particular venue in its payload
    """
    choice_id = json.loads(request.body)
    voter_objects_list = Choice.objects.get(id=choice_id).voters.all()
    voters_list = []  # voters_list is a list of strings, not Voter objects
    for voter_object in voter_objects_list:
        voters_list.append(voter_object.name)
    voter_data = {
        'venue_name': Choice.objects.get(id=choice_id).venue_name,
        'voters_list': voters_list,
    }
    return HttpResponse(json.dumps(voter_data))


def reset_votes(request):
    """
    Resets a user's votes in a poll (allows them to vote again)
    :param request: the HTTP request
    :return: redirects the user to the poll display page so they may vote again
    """
    voter = Voter.objects.get(question=Question.objects.get(id=request.session['poll_question_id']),
                              name=request.session['user_name'])  # the voter whose votes need to be reset
    voted_choices = voter.choice_set.all()  # all the choices that this voter voted for
    for voted_choice in voted_choices:
        voted_choice.voters.remove(voter)
        voted_choice.num_voters -= 1
        voted_choice.save()
    voter.voted = False
    voter.save()
    request.session['user_voted'] = False
    return redirect('view_poll', request.session['poll_question_id'])
