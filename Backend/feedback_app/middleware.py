"""
Custom middleware to exempt specific URLs from CSRF verification
"""

class CsrfExemptMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        # List of URL paths to exempt from CSRF
        self.exempt_urls = [
            '/login/',
            '/dashboard-admin/',
        ]

    def __call__(self, request):
        # Check if the request path should be exempt from CSRF
        for url in self.exempt_urls:
            if request.path.startswith(url):
                setattr(request, '_dont_enforce_csrf_checks', True)
                break
        
        response = self.get_response(request)
        return response
