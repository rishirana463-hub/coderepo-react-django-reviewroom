from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.shared.authentication import require_auth
from . import repository, services
from .schema import login_input, member_json


@api_view(["POST"])
def login(request):
    email, password = login_input(request.data)
    return Response({"data": services.login(email, password, request.META.get("REMOTE_ADDR", "unknown"))})


@api_view(["GET"])
@require_auth
def me(request):
    return Response({"data": member_json(request.member)})


@api_view(["POST"])
@require_auth
def logout(request):
    services.logout(request.member)
    return Response({"data": {"signedOut": True}})


@api_view(["GET"])
@require_auth
def people(request):
    return Response({"data": [member_json(member) for member in repository.all_members()]})
