from apps.shared.validation import text
from apps.shared.errors import invalid


def login_input(data):
    email = text(data, "email", 254, required=True).lower()
    password = data.get("password")
    if not isinstance(password, str) or not 1 <= len(password.encode()) <= 72:
        invalid("password", "Password must contain 1 to 72 bytes.")
    return email, password


def member_json(member):
    return {"id": str(member.id), "name": member.name, "email": member.email, "role": member.role,
            "initials": "".join(word[0] for word in member.name.split()[:2]).upper(), "color": member.color}
