from ninja import Router, Schema
from django.contrib.auth import login, logout
from django.http import HttpRequest
from django.conf import settings
from typing import List
import httpx
import secrets

router = Router()


class UserSchema(Schema):
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    is_approved: bool
    is_staff: bool
    avatar_url: str | None = None


class PendingUserSchema(Schema):
    id: int
    username: str
    email: str
    github_username: str | None
    date_joined: str


class MessageSchema(Schema):
    message: str


class ErrorSchema(Schema):
    error: str


@router.post('/logout', response={200: MessageSchema})
def logout_view(request: HttpRequest):
    """Logout current user"""
    logout(request)
    return {'message': 'Logged out successfully'}


@router.get('/me', response={200: UserSchema, 401: ErrorSchema, 403: ErrorSchema})
def get_current_user(request: HttpRequest):
    """Get current logged-in user"""
    if request.user.is_authenticated:
        if not request.user.is_approved:
            return 403, {'error': 'Account pending approval'}
        return 200, request.user
    return 401, {'error': 'Not authenticated'}


class UpdateProfileSchema(Schema):
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None


@router.put('/me', response={200: UserSchema, 401: ErrorSchema, 403: ErrorSchema})
def update_current_user(request: HttpRequest, data: UpdateProfileSchema):
    """Update current user's profile"""
    if not request.user.is_authenticated:
        return 401, {'error': 'Not authenticated'}
    if not request.user.is_approved:
        return 403, {'error': 'Account pending approval'}

    user = request.user
    if data.first_name is not None:
        user.first_name = data.first_name
    if data.last_name is not None:
        user.last_name = data.last_name
    if data.email is not None:
        user.email = data.email
    user.save()

    return 200, user


class GitHubAuthUrlSchema(Schema):
    url: str


class GitHubCallbackSchema(Schema):
    code: str
    state: str


class GitHubCallbackResponseSchema(Schema):
    user: UserSchema | None = None
    pending: bool = False
    message: str | None = None


@router.get('/github/auth-url', response=GitHubAuthUrlSchema)
def github_auth_url(request: HttpRequest):
    """Generate GitHub OAuth authorization URL"""
    state = secrets.token_urlsafe(32)
    request.session['github_oauth_state'] = state

    client_id = settings.GITHUB_CLIENT_ID
    redirect_uri = f"{settings.PRODUCTION_URL}/auth/github/callback"
    scope = 'user:email'

    url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&scope={scope}"
        f"&state={state}"
    )
    return {'url': url}


@router.post('/github/callback', response={200: GitHubCallbackResponseSchema, 400: ErrorSchema, 401: ErrorSchema})
def github_callback(request: HttpRequest, data: GitHubCallbackSchema):
    """Handle GitHub OAuth callback"""
    # Verify state
    stored_state = request.session.get('github_oauth_state')
    if not stored_state or stored_state != data.state:
        return 401, {'error': 'Invalid state parameter'}

    # Exchange code for access token
    try:
        token_response = httpx.post(
            'https://github.com/login/oauth/access_token',
            data={
                'client_id': settings.GITHUB_CLIENT_ID,
                'client_secret': settings.GITHUB_CLIENT_SECRET,
                'code': data.code,
            },
            headers={'Accept': 'application/json'},
            timeout=10.0
        )
        token_data = token_response.json()

        if 'error' in token_data:
            return 400, {'error': token_data.get('error_description', 'Failed to get access token')}

        access_token = token_data.get('access_token')
        if not access_token:
            return 400, {'error': 'No access token received'}

        # Get user info from GitHub
        user_response = httpx.get(
            'https://api.github.com/user',
            headers={
                'Authorization': f'Bearer {access_token}',
                'Accept': 'application/json',
            },
            timeout=10.0
        )
        github_user = user_response.json()

        # Get primary email from GitHub
        emails_response = httpx.get(
            'https://api.github.com/user/emails',
            headers={
                'Authorization': f'Bearer {access_token}',
                'Accept': 'application/json',
            },
            timeout=10.0
        )
        emails = emails_response.json()

        # Find primary email
        primary_email = None
        if isinstance(emails, list):
            for email in emails:
                if isinstance(email, dict) and email.get('primary'):
                    primary_email = email.get('email')
                    break

            if not primary_email and emails:
                first_email = emails[0]
                if isinstance(first_email, dict):
                    primary_email = first_email.get('email')
                elif isinstance(first_email, str):
                    primary_email = first_email

        github_username = github_user.get('login')
        github_name = github_user.get('name', '')
        github_avatar = github_user.get('avatar_url')

        # Try to find existing user by GitHub username first
        from django.contrib.auth import get_user_model
        User = get_user_model()

        user = User.objects.filter(github_username=github_username).first()

        if not user and primary_email:
            # Try to find by email
            user = User.objects.filter(email=primary_email).first()
            if user:
                # Link GitHub username and avatar to existing user
                user.github_username = github_username
                user.avatar_url = github_avatar
                user.save()

        is_new_user = False
        if not user:
            # Create new user (not approved yet)
            is_new_user = True
            user = User.objects.create_user(
                username=github_username,
                email=primary_email or f'{github_username}@github.local',
                password=None,
                is_approved=False,
            )
            user.github_username = github_username
            user.avatar_url = github_avatar
            # Set name if available
            if github_name:
                name_parts = github_name.split(' ', 1)
                user.first_name = name_parts[0]
                if len(name_parts) > 1:
                    user.last_name = name_parts[1]
            user.save()
        else:
            # Update avatar for existing user on each login
            if github_avatar and user.avatar_url != github_avatar:
                user.avatar_url = github_avatar
                user.save()

        # Clean up session state
        if 'github_oauth_state' in request.session:
            del request.session['github_oauth_state']

        # Check if user is approved
        if not user.is_approved:
            return 200, {
                'user': None,
                'pending': True,
                'message': 'Your account is pending admin approval.' if is_new_user else 'Your account has not been approved yet.'
            }

        # Log in the approved user
        login(request, user)

        return 200, {
            'user': user,
            'pending': False,
            'message': None
        }

    except httpx.RequestError as e:
        return 400, {'error': f'GitHub API error: {str(e)}'}


# Admin endpoints for user management

@router.get('/admin/pending', response={200: List[PendingUserSchema], 403: ErrorSchema})
def list_pending_users(request: HttpRequest):
    """List all users pending approval (admin only)"""
    if not request.user.is_authenticated or not request.user.is_staff:
        return 403, {'error': 'Admin access required'}

    from django.contrib.auth import get_user_model
    User = get_user_model()

    pending_users = User.objects.filter(is_approved=False).order_by('-date_joined')
    return 200, [
        {
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'github_username': u.github_username,
            'date_joined': u.date_joined.isoformat()
        }
        for u in pending_users
    ]


class ApproveUserSchema(Schema):
    user_id: int


@router.post('/admin/approve', response={200: MessageSchema, 403: ErrorSchema, 404: ErrorSchema})
def approve_user(request: HttpRequest, data: ApproveUserSchema):
    """Approve a pending user (admin only)"""
    if not request.user.is_authenticated or not request.user.is_staff:
        return 403, {'error': 'Admin access required'}

    from django.contrib.auth import get_user_model
    User = get_user_model()

    try:
        user = User.objects.get(id=data.user_id)
        user.is_approved = True
        user.save()
        return 200, {'message': f'User {user.username} approved'}
    except User.DoesNotExist:
        return 404, {'error': 'User not found'}


@router.post('/admin/reject', response={200: MessageSchema, 403: ErrorSchema, 404: ErrorSchema})
def reject_user(request: HttpRequest, data: ApproveUserSchema):
    """Reject and delete a pending user (admin only)"""
    if not request.user.is_authenticated or not request.user.is_staff:
        return 403, {'error': 'Admin access required'}

    from django.contrib.auth import get_user_model
    User = get_user_model()

    try:
        user = User.objects.get(id=data.user_id, is_approved=False)
        username = user.username
        user.delete()
        return 200, {'message': f'User {username} rejected and deleted'}
    except User.DoesNotExist:
        return 404, {'error': 'Pending user not found'}


class AdminUserSchema(Schema):
    id: int
    username: str
    email: str
    first_name: str
    last_name: str
    github_username: str | None
    avatar_url: str | None
    is_approved: bool
    is_staff: bool
    is_active: bool
    date_joined: str
    last_login: str | None


@router.get('/admin/users', response={200: List[AdminUserSchema], 403: ErrorSchema})
def list_all_users(request: HttpRequest):
    """List all users (admin only)"""
    if not request.user.is_authenticated or not request.user.is_staff:
        return 403, {'error': 'Admin access required'}

    from django.contrib.auth import get_user_model
    User = get_user_model()

    users = User.objects.all().order_by('-date_joined')
    return 200, [
        {
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'first_name': u.first_name,
            'last_name': u.last_name,
            'github_username': u.github_username,
            'avatar_url': u.avatar_url,
            'is_approved': u.is_approved,
            'is_staff': u.is_staff,
            'is_active': u.is_active,
            'date_joined': u.date_joined.isoformat(),
            'last_login': u.last_login.isoformat() if u.last_login else None,
        }
        for u in users
    ]


class ToggleUserSchema(Schema):
    user_id: int


@router.post('/admin/toggle-staff', response={200: MessageSchema, 403: ErrorSchema, 404: ErrorSchema})
def toggle_staff(request: HttpRequest, data: ToggleUserSchema):
    """Toggle staff status of a user (admin only)"""
    if not request.user.is_authenticated or not request.user.is_staff:
        return 403, {'error': 'Admin access required'}

    from django.contrib.auth import get_user_model
    User = get_user_model()

    try:
        user = User.objects.get(id=data.user_id)
        if user.id == request.user.id:
            return 403, {'error': 'Cannot change own staff status'}
        user.is_staff = not user.is_staff
        user.save()
        status = 'Admin' if user.is_staff else 'User'
        return 200, {'message': f'{user.username} is now {status}'}
    except User.DoesNotExist:
        return 404, {'error': 'User not found'}


@router.post('/admin/delete-user', response={200: MessageSchema, 403: ErrorSchema, 404: ErrorSchema})
def delete_user(request: HttpRequest, data: ToggleUserSchema):
    """Delete a user (admin only)"""
    if not request.user.is_authenticated or not request.user.is_staff:
        return 403, {'error': 'Admin access required'}

    from django.contrib.auth import get_user_model
    User = get_user_model()

    try:
        user = User.objects.get(id=data.user_id)
        if user.id == request.user.id:
            return 403, {'error': 'Cannot delete yourself'}
        if user.is_superuser:
            return 403, {'error': 'Cannot delete superuser'}
        username = user.username
        user.delete()
        return 200, {'message': f'User {username} deleted'}
    except User.DoesNotExist:
        return 404, {'error': 'User not found'}


# ==================== API Key Management ====================

class APIKeyStatusSchema(Schema):
    has_openrouter_key: bool
    key_preview: str | None = None  # Shows last 4 chars if set
    has_server_fallback: bool = False  # True if server has a default key


class SetAPIKeySchema(Schema):
    openrouter_key: str


@router.get('/api-keys', response={200: APIKeyStatusSchema, 401: ErrorSchema})
def get_api_key_status(request: HttpRequest):
    """Check if user has API keys configured"""
    import os

    if not request.user.is_authenticated:
        return 401, {'error': 'Not authenticated'}

    has_key = request.user.has_openrouter_key()
    preview = None
    has_server_fallback = bool(os.getenv('OPENROUTER_API_KEY', ''))

    if has_key:
        # Show masked preview (last 4 characters)
        key = request.user.get_openrouter_key()
        if key and len(key) > 4:
            preview = f"...{key[-4:]}"

    return 200, {
        'has_openrouter_key': has_key,
        'key_preview': preview,
        'has_server_fallback': has_server_fallback
    }


@router.post('/api-keys', response={200: MessageSchema, 400: ErrorSchema, 401: ErrorSchema})
def set_api_key(request: HttpRequest, data: SetAPIKeySchema):
    """Set or update the OpenRouter API key"""
    if not request.user.is_authenticated:
        return 401, {'error': 'Not authenticated'}

    key = data.openrouter_key.strip()

    # Basic validation
    if not key:
        return 400, {'error': 'API key cannot be empty'}

    if not key.startswith('sk-or-'):
        return 400, {'error': 'Invalid OpenRouter API key format (should start with sk-or-)'}

    if len(key) < 20:
        return 400, {'error': 'API key seems too short'}

    # Encrypt and store
    request.user.set_openrouter_key(key)

    return 200, {'message': 'API key saved successfully'}


@router.delete('/api-keys', response={200: MessageSchema, 401: ErrorSchema})
def delete_api_key(request: HttpRequest):
    """Remove the stored OpenRouter API key"""
    if not request.user.is_authenticated:
        return 401, {'error': 'Not authenticated'}

    request.user.clear_openrouter_key()

    return 200, {'message': 'API key removed'}
