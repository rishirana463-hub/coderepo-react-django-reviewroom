from django.http import HttpResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.shared.authentication import require_auth
from . import services


@api_view(["GET"])
@require_auth
def activity(request):
    return Response({"data": services.activity(request.member, request.query_params.get("projectId"))})


@api_view(["GET"])
@require_auth
def inbox(request):
    return Response({"data": services.inbox(request.member)})


@api_view(["PATCH"])
@require_auth
def notification(request, notification_id):
    return Response({"data": services.read_notification(request.member, notification_id, request.data)})


@api_view(["POST"])
@require_auth
def reminders(request):
    return Response({"data": services.reminders(request.member)})


@api_view(["GET", "POST"])
@require_auth
def saved_views(request):
    if request.method == "POST":
        return Response({"data": services.create_saved_view(request.member, request.data)}, status=201)
    return Response({"data": services.saved_views(request.member)})


@api_view(["DELETE"])
@require_auth
def saved_view(request, view_id):
    services.delete_saved_view(request.member, view_id)
    return Response(status=204)


@api_view(["GET"])
@require_auth
def reports(request):
    return Response({"data": services.reports(request.member, request.query_params)})


@api_view(["GET"])
@require_auth
def export_csv(request):
    response = HttpResponse(services.export_csv(request.member, request.query_params), content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="reviewroom-assets.csv"'
    return response
