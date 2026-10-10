from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.shared.authentication import require_auth
from . import services


@api_view(["POST"])
@require_auth
def decisions(request, asset_id):
    return Response({"data": services.decide(request.member, asset_id, request.data)})


@api_view(["POST"])
@require_auth
def comments(request, asset_id):
    return Response({"data": services.add_comment(request.member, asset_id, request.data)}, status=201)


@api_view(["POST"])
@require_auth
def replies(request, asset_id, comment_id):
    return Response({"data": services.reply(request.member, asset_id, comment_id, request.data)}, status=201)


@api_view(["PATCH"])
@require_auth
def comment(request, asset_id, comment_id):
    return Response({"data": services.resolve(request.member, asset_id, comment_id, request.data)})
