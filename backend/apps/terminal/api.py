import subprocess
import shlex
import os
from ninja import Router, Schema
from django.http import HttpRequest

router = Router()

# Allowed commands for safety (can be expanded)
ALLOWED_COMMANDS = {
    'help', 'ls', 'pwd', 'cat', 'head', 'tail', 'grep', 'find', 'wc',
    'echo', 'date', 'whoami', 'hostname', 'uptime', 'df', 'du', 'free',
    'ps', 'top', 'env', 'python', 'pip', 'django-admin',
    'cd', 'mkdir', 'touch', 'cp', 'mv', 'rm',
}

# Django management commands that are allowed
DJANGO_COMMANDS = {
    'help', 'check', 'showmigrations', 'sqlmigrate', 'dbshell',
    'shell', 'createsuperuser', 'changepassword',
    'makemigrations', 'migrate', 'collectstatic',
    'clearsessions', 'flush', 'dumpdata', 'loaddata',
}

HELP_TEXT = """
Available commands:

  System:
    ls, pwd, cat, head, tail, grep, find, wc
    echo, date, whoami, hostname, uptime
    df, du, free, ps, env
    mkdir, touch, cp, mv, rm

  Django:
    python manage.py <command>

  Django management commands:
    help, check, showmigrations, sqlmigrate
    makemigrations, migrate, collectstatic
    createsuperuser, changepassword
    shell, dbshell, dumpdata, loaddata

  Terminal:
    clear - Clear terminal
    help  - Show this help

Note: Commands run in the backend directory.
"""


class CommandSchema(Schema):
    command: str


class CommandResponseSchema(Schema):
    stdout: str = ''
    stderr: str = ''
    returncode: int = 0
    error: str = ''


@router.post('/execute', response=CommandResponseSchema)
def execute_command(request: HttpRequest, data: CommandSchema):
    """Execute a shell command on the server (admin only)"""

    # Check if user is authenticated and is staff
    if not request.user.is_authenticated:
        return CommandResponseSchema(error='Authentication required', returncode=1)

    if not request.user.is_staff:
        return CommandResponseSchema(error='Admin access required', returncode=1)

    command = data.command.strip()

    if not command:
        return CommandResponseSchema(stdout='', returncode=0)

    # Handle help command
    if command == 'help':
        return CommandResponseSchema(stdout=HELP_TEXT, returncode=0)

    # Get the backend directory
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

    # Parse the command
    try:
        parts = shlex.split(command)
    except ValueError as e:
        return CommandResponseSchema(error=f'Invalid command syntax: {e}', returncode=1)

    if not parts:
        return CommandResponseSchema(stdout='', returncode=0)

    base_cmd = parts[0]

    # Handle Django management commands
    if base_cmd == 'python' and len(parts) >= 3 and parts[1] == 'manage.py':
        django_cmd = parts[2]
        if django_cmd not in DJANGO_COMMANDS:
            return CommandResponseSchema(
                error=f'Django command "{django_cmd}" is not allowed. Allowed: {", ".join(sorted(DJANGO_COMMANDS))}',
                returncode=1
            )
    elif base_cmd not in ALLOWED_COMMANDS:
        return CommandResponseSchema(
            error=f'Command "{base_cmd}" is not allowed. Type "help" for available commands.',
            returncode=1
        )

    # Block dangerous patterns
    dangerous_patterns = ['rm -rf /', 'rm -rf ~', '> /dev/', 'mkfs', 'dd if=']
    for pattern in dangerous_patterns:
        if pattern in command:
            return CommandResponseSchema(error='This command is not allowed for safety reasons.', returncode=1)

    try:
        # Execute the command
        result = subprocess.run(
            command,
            shell=True,
            cwd=backend_dir,
            capture_output=True,
            text=True,
            timeout=30,  # 30 second timeout
            env={**os.environ, 'TERM': 'xterm-256color'}
        )

        return CommandResponseSchema(
            stdout=result.stdout,
            stderr=result.stderr,
            returncode=result.returncode
        )

    except subprocess.TimeoutExpired:
        return CommandResponseSchema(error='Command timed out (30s limit)', returncode=1)
    except Exception as e:
        return CommandResponseSchema(error=str(e), returncode=1)
