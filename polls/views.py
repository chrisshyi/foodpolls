from django.shortcuts import render, redirect
from django.http import HttpResponse, HttpResponseRedirect
from .forms import CreatorInfoForm, QuestionInfoForm
from datetime import date
from django.contrib import messages

# Create your views here.
def index(request):
    return render(request, 'polls/index.html')

def create_poll(request):
    if request.method == 'POST':
        form = CreatorInfoForm(request.POST)
        if form.is_valid():
            # TODO: Where to redirect the user so he/she can create the question?
            # Store the creator's information in a session variable 
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
            #TODO: Remove index placeholder when next piece is implemented
            return redirect('index')
        else:
            # Add error message
            messages.error(request, 'Invalid information entered')
    else:
        form = QuestionInfoForm()
    return render(request, 'polls/create_question.html', {'form': form})