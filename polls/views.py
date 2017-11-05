from django.shortcuts import render, redirect
from django.http import HttpResponse, HttpResponseRedirect
from .forms import CreatorInfoForm
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
                'creator_name' = form.cleaned_data['creator_name'],
                'creator_email' = form.cleaned_data['creator_email'],
            }
            request.session['creator_info'] = creator_info
            return redirect()
    else:
        form = CreatorInfoForm()
    return render(request, 'polls/user_info.html',{'form': form})