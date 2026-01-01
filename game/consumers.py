from channels.generic.websocket import AsyncWebsocketConsumer
import json
import random


class GameConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_code = self.scope['url_route']['kwargs']['room_code']
        self.room_group_name = f'game_{self.room_code}'
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_type = data.get('type')
        
        if message_type == 'player_join':
            await self.handle_player_join(data)
        elif message_type == 'start_game':
            await self.handle_start_game(data)
        elif message_type == 'move':
            await self.handle_move(data)
        elif message_type == 'check_life':
            await self.handle_check_life(data)
        elif message_type == 'colonize':
            await self.handle_colonize(data)
        elif message_type == 'battle':
            await self.handle_battle(data)
        elif message_type == 'end_turn':
            await self.handle_end_turn(data)
    
    async def handle_player_join(self, data):
        """Handle player joining the game"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'player_joined',
                'player_name': data['player_name'],
                'home_planet': data['home_planet'],
                'player_index': data['player_index'],
                'color': data['color']
            }
        )
    
    async def handle_start_game(self, data):
        """Handle game start"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'game_started',
                'players': data['players'],
                'board_state': data['board_state']
            }
        )
    
    async def handle_move(self, data):
        """Handle player movement"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'player_moved',
                'player_index': data['player_index'],
                'position': data['position'],
                'system_name': data['system_name']
            }
        )
    
    async def handle_check_life(self, data):
        """Handle checking for life on a planet"""
        # Roll dice on server
        die1 = random.randint(1, 6)
        die2 = random.randint(1, 6)
        total = die1 + die2
        has_life = total >= 7
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'life_checked',
                'player_index': data['player_index'],
                'die1': die1,
                'die2': die2,
                'total': total,
                'has_life': has_life
            }
        )
    
    async def handle_colonize(self, data):
        """Handle planet colonization"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'planet_colonized',
                'player_index': data['player_index'],
                'system': data['system'],
                'planet_index': data['planet_index'],
                'had_life': data['had_life']
            }
        )
    
    async def handle_battle(self, data):
        """Handle battle (roll dice for both sides)"""
        # Player dice
        player_die1 = random.randint(1, 6)
        player_die2 = random.randint(1, 6)
        player_total = player_die1 + player_die2
        
        # Opponent dice
        opponent_die1 = random.randint(1, 6)
        opponent_die2 = random.randint(1, 6)
        opponent_total = opponent_die1 + opponent_die2
        
        winner = 'player' if player_total > opponent_total else ('opponent' if opponent_total > player_total else 'tie')
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'battle_result',
                'player_index': data['player_index'],
                'player_dice': [player_die1, player_die2],
                'player_total': player_total,
                'opponent_dice': [opponent_die1, opponent_die2],
                'opponent_total': opponent_total,
                'winner': winner,
                'battle_type': data.get('battle_type', 'aliens')
            }
        )
    
    async def handle_end_turn(self, data):
        """Handle end of turn"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'turn_ended',
                'next_player_index': data['next_player_index']
            }
        )
    
    # Handler methods for group messages
    async def player_joined(self, event):
        await self.send(text_data=json.dumps(event))
    
    async def game_started(self, event):
        await self.send(text_data=json.dumps(event))
    
    async def player_moved(self, event):
        await self.send(text_data=json.dumps(event))
    
    async def life_checked(self, event):
        await self.send(text_data=json.dumps(event))
    
    async def planet_colonized(self, event):
        await self.send(text_data=json.dumps(event))
    
    async def battle_result(self, event):
        await self.send(text_data=json.dumps(event))
    
    async def turn_ended(self, event):
        await self.send(text_data=json.dumps(event))
