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
            return redirect()
    else:
        form = CreatorInfoForm()
    return render(request, 'polls/user_info.html',{'form': form})