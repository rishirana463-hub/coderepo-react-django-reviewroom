import math

from apps.shared.errors import invalid
from apps.shared.validation import integer


def anchor_input(data, asset, version):
    anchor = data.get("anchor", {})
    if not isinstance(anchor, dict):
        invalid("anchor", "Feedback anchors must be an object.")
    if not anchor:
        return {}
    if anchor.get("type") == "text" and asset.type == "copy":
        start = integer(anchor.get("start"), "anchor.start", 0, len(version.content))
        end = integer(anchor.get("end"), "anchor.end", 1, len(version.content))
        if end <= start:
            invalid("anchor", "Select a nonempty text range in this version.")
        return {"type": "text", "start": start, "end": end, "quote": version.content[start:end]}
    if anchor.get("type") == "image" and asset.type == "image":
        coords = []
        for field in ("x", "y"):
            value = anchor.get(field)
            if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not 0 <= value <= 1:
                invalid("anchor", "Image anchor coordinates must be between zero and one.")
            coords.append(value)
        return {"type": "image", "x": coords[0], "y": coords[1]}
    invalid("anchor", "Choose a text or image anchor matching this asset.")
