from django.urls import path
from . import views

urlpatterns = [path("assets/<str:asset_id>/decisions", views.decisions), path("assets/<str:asset_id>/comments", views.comments),
               path("assets/<str:asset_id>/comments/<str:comment_id>", views.comment),
               path("assets/<str:asset_id>/comments/<str:comment_id>/replies", views.replies)]
