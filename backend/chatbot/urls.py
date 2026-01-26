from django.urls import path
from . import views

urlpatterns = [
    path('', views.api_root, name='api_root'),
    path('chat/', views.chat, name='chat'),
    path('models/', views.get_models, name='models'),
]