from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('create-room/', views.create_room, name='create_room'),
    path('join-room/', views.join_room, name='join_room'),
    path('room/<str:room_code>/status/', views.room_status, name='room_status'),
    path('room/<str:room_code>/start/', views.start_game, name='start_game'),
]
