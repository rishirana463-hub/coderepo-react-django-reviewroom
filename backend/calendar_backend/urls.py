from django.http import HttpResponse
from django.urls import include, path, re_path

from apps.shared.views import health, not_found


def landing(request):
    return HttpResponse('<!doctype html><html lang="en"><meta charset="utf-8"><title>Reviewroom API</title><body><h1>Reviewroom API</h1><p>The review workspace API is running.</p><a href="/api/v1/health">Health status</a></body></html>')


urlpatterns = [path("", landing), path("health", health), path("api/v1/health", health),
               path("api/v1/", include("apps.auth.urls")), path("api/v1/", include("apps.projects.urls")),
               path("api/v1/", include("apps.assets.urls")), path("api/v1/", include("apps.reviews.urls")),
               path("api/v1/", include("apps.insights.urls")), re_path(r"^.*$", not_found)]
