from rest_framework.decorators import api_view
from rest_framework.response import Response

from apps.shared.authentication import require_auth
from . import repository, services
from .schema import asset_json, members_map


@api_view(["GET", "POST"])
@require_auth
def collection(request):
    if request.method == "POST":
        return Response({"data": services.create(request.member, request.data)}, status=201)
    query = repository.filtered(request.member, request.query_params)
    page, size = repository.pagination(request.query_params)
    total = query.count()
    members = members_map()
    projects = repository.project_map(query)
    items = [asset_json(asset, projects[str(asset.project_id)], request.member, members=members) for asset in query.skip((page - 1) * size).limit(size)]
    return Response({"data": {"items": items, "total": total, "page": page, "pageSize": size}})


@api_view(["GET", "PATCH"])
@require_auth
def detail(request, asset_id):
    result = services.detail(request.member, asset_id) if request.method == "GET" else services.update(request.member, asset_id, request.data)
    return Response({"data": result})


@api_view(["POST"])
@require_auth
def versions(request, asset_id):
    return Response({"data": services.add_version(request.member, asset_id, request.data)}, status=201)


@api_view(["POST"])
@require_auth
def submit(request, asset_id):
    return Response({"data": services.submit(request.member, asset_id, request.data)})


@api_view(["GET"])
@require_auth
def export(request, asset_id):
    return Response({"data": services.export_manifest(request.member, asset_id)})
