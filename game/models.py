from django.db import models
import json


class GameRoom(models.Model):
    """Represents a game room where players can join"""
    room_code = models.CharField(max_length=10, unique=True)
    max_players = models.IntegerField(default=2)
    created_at = models.DateTimeField(auto_now_add=True)
    started = models.BooleanField(default=False)
    game_state = models.JSONField(default=dict, blank=True)
    
    def __str__(self):
        return f"Room {self.room_code} ({self.players.count()}/{self.max_players})"
    
    def is_full(self):
        return self.players.count() >= self.max_players
    
    def can_start(self):
        return self.players.count() == self.max_players and not self.started


class Player(models.Model):
    """Represents a player in a game room"""
    PLANET_CHOICES = [
        ('Earth', 'Earth 🌍'),
        ('Mars', 'Mars 🔴'),
        ('Belt', 'Belt ☄️'),
        ('Jupiter', 'Jupiter 🪐'),
    ]
    
    room = models.ForeignKey(GameRoom, on_delete=models.CASCADE, related_name='players')
    name = models.CharField(max_length=50)
    home_planet = models.CharField(max_length=20, choices=PLANET_CHOICES)
    player_index = models.IntegerField()
    joined_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['room', 'home_planet']
        ordering = ['player_index']
    
    def __str__(self):
        return f"{self.name} ({self.home_planet})"
