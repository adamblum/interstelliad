from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import ensure_csrf_cookie
from .models import GameRoom, Player
import random
import string


@ensure_csrf_cookie
def index(request):
    """Main game page"""
    return render(request, 'game/index.html')


def create_room(request):
    """Create a new game room"""
    if request.method == 'POST':
        max_players = int(request.POST.get('max_players', 2))
        
        # Generate unique room code
        room_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        while GameRoom.objects.filter(room_code=room_code).exists():
            room_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        
        room = GameRoom.objects.create(
            room_code=room_code,
            max_players=max_players
        )
        
        return JsonResponse({
            'success': True,
            'room_code': room_code
        })
    
    return JsonResponse({'success': False, 'error': 'Invalid request'})


def join_room(request):
    """Join an existing game room"""
    if request.method == 'POST':
        room_code = request.POST.get('room_code')
        player_name = request.POST.get('player_name')
        home_planet = request.POST.get('home_planet')
        
        try:
            room = GameRoom.objects.get(room_code=room_code)
            
            if room.is_full():
                return JsonResponse({'success': False, 'error': 'Room is full'})
            
            if room.started:
                return JsonResponse({'success': False, 'error': 'Game already started'})
            
            # Check if planet is taken
            if room.players.filter(home_planet=home_planet).exists():
                return JsonResponse({'success': False, 'error': 'Planet already taken'})
            
            player_index = room.players.count()
            player = Player.objects.create(
                room=room,
                name=player_name,
                home_planet=home_planet,
                player_index=player_index
            )
            
            return JsonResponse({
                'success': True,
                'room_code': room_code,
                'player_index': player_index,
                'can_start': room.can_start()
            })
            
        except GameRoom.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Room not found'})
    
    return JsonResponse({'success': False, 'error': 'Invalid request'})


def room_status(request, room_code):
    """Get current room status"""
    try:
        room = get_object_or_404(GameRoom, room_code=room_code)
        players = [
            {
                'name': p.name,
                'home_planet': p.home_planet,
                'player_index': p.player_index
            }
            for p in room.players.all()
        ]
        
        return JsonResponse({
            'success': True,
            'room_code': room_code,
            'max_players': room.max_players,
            'current_players': len(players),
            'players': players,
            'is_full': room.is_full(),
            'can_start': room.can_start(),
            'started': room.started
        })
    except GameRoom.DoesNotExist:
        return JsonResponse({'success': False, 'error': 'Room not found'})


def start_game(request, room_code):
    """Start the game"""
    if request.method == 'POST':
        try:
            room = get_object_or_404(GameRoom, room_code=room_code)
            
            if not room.can_start():
                return JsonResponse({'success': False, 'error': 'Cannot start game yet'})
            
            room.started = True
            room.save()
            
            return JsonResponse({'success': True})
        except GameRoom.DoesNotExist:
            return JsonResponse({'success': False, 'error': 'Room not found'})
    
    return JsonResponse({'success': False, 'error': 'Invalid request'})
