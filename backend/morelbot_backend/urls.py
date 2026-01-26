from django.contrib import admin
from django.urls import path, include
from chatbot import views

urlpatterns = [
    path('', views.index, name='index'),
    path('chat/', views.index, name='chat_index'),
    path('admin/', admin.site.urls),
    path('api/', include('chatbot.urls')),
]