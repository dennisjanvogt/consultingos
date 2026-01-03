from ninja import Router, Schema
from django.contrib.auth import authenticate, login, logout
from django.http import HttpRequest
from typing import Optional

router = Router()


class LoginSchema(Schema):
    username: str
    password: str


class RegisterSchema(Schema):
    username: str
    email: str
    password: str


class UserSchema(Schema):
    id: int
    username: str
    email: str
    first_name: str
    last_name: str


class MessageSchema(Schema):
    message: str


class ErrorSchema(Schema):
    error: str


@router.post('/login', response={200: UserSchema, 401: ErrorSchema})
def login_view(request: HttpRequest, data: LoginSchema):
    """Login with username and password"""
    user = authenticate(request, username=data.username, password=data.password)
    if user is not None:
        login(request, user)
        return 200, user
    return 401, {'error': 'Invalid credentials'}


@router.post('/logout', response={200: MessageSchema})
def logout_view(request: HttpRequest):
    """Logout current user"""
    logout(request)
    return {'message': 'Logged out successfully'}


@router.post('/register', response={201: UserSchema, 400: ErrorSchema})
def register_view(request: HttpRequest, data: RegisterSchema):
    """Register a new user"""
    from django.contrib.auth import get_user_model
    User = get_user_model()

    if User.objects.filter(username=data.username).exists():
        return 400, {'error': 'Username already exists'}

    if User.objects.filter(email=data.email).exists():
        return 400, {'error': 'Email already exists'}

    user = User.objects.create_user(
        username=data.username,
        email=data.email,
        password=data.password,
    )
    login(request, user)
    return 201, user


@router.get('/me', response={200: UserSchema, 401: ErrorSchema})
def get_current_user(request: HttpRequest):
    """Get current logged-in user"""
    if request.user.is_authenticated:
        return 200, request.user
    return 401, {'error': 'Not authenticated'}
