from django.urls import path
from . import views

urlpatterns = [path("assets", views.collection), path("assets/<str:asset_id>", views.detail),
               path("assets/<str:asset_id>/versions", views.versions), path("assets/<str:asset_id>/submit", views.submit),
               path("assets/<str:asset_id>/export", views.export)]
