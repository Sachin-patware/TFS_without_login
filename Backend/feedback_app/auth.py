import jwt
from datetime import datetime, timedelta
from django.conf import settings
from functools import wraps
from django.http import JsonResponse

def generate_jwt(payload, user_type='student'):
    """Generate a JWT for a specific user type"""
    expiry = datetime.utcnow() + timedelta(days=1)
    payload.update({
        'exp': expiry,
        'user_type': user_type,
        'iat': datetime.utcnow()
    })
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')

def verify_jwt(token):
    """Verify a JWT and return the payload"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def jwt_required(view_func):
    """Decorator to require a valid JWT in the Authorization header"""
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse({'status': 'error', 'error': 'authentication required'}, status=401)
        
        token = auth_header.split(' ')[1]
        payload = verify_jwt(token)
        
        if not payload:
            return JsonResponse({'status': 'error', 'error': 'invalid or expired token'}, status=401)
        
        # Attach payload to request for use in view
        request.jwt_payload = payload
        return view_func(request, *args, **kwargs)
    return wrapper

def jwt_admin_required(view_func):
    """Decorator to require a valid Admin JWT"""
    @wraps(view_func)
    def wrapper(request, *args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return JsonResponse({'status': 'error', 'error': 'admin authentication required'}, status=401)
        
        token = auth_header.split(' ')[1]
        payload = verify_jwt(token)
        
        if not payload or payload.get('user_type') != 'admin':
            return JsonResponse({'status': 'error', 'error': 'admin access required'}, status=403)
        
        request.jwt_payload = payload
        return view_func(request, *args, **kwargs)
    return wrapper
