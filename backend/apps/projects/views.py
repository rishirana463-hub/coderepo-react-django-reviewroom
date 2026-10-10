from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.shared.authentication import require_auth
from . import repository, services
from .schema import project_json


@api_view(["GET", "POST"])
@require_auth
def collection(request):
    if request.method == "POST":
        return Response({"data": services.create(request.member, request.data)}, status=201)
    return Response({"data": [project_json(project) for project in repository.accessible(request.member).order_by("created_at")]})


@api_view(["PATCH"])
@require_auth
def detail(request, project_id):
    return Response({"data": services.update(request.member, project_id, request.data)})
