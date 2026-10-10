from django.urls import path
from . import views

urlpatterns = [path("activity", views.activity), path("inbox", views.inbox), path("inbox/<str:notification_id>", views.notification),
               path("reminders/process", views.reminders), path("saved-views", views.saved_views), path("saved-views/<str:view_id>", views.saved_view),
               path("reports", views.reports), path("reports/export.csv", views.export_csv)]
