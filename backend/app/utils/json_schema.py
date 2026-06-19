import jsonschema
from jsonschema import ValidationError as SchemaValidationError


def validate_json_schema(schema: dict) -> list[str]:
    if not isinstance(schema, dict):
        return ["Schema must be a JSON object"]
    if "type" not in schema:
        return ["Schema must have a 'type' field"]
    if schema.get("type") != "object":
        return ["Schema root 'type' must be 'object'"]
    if "properties" not in schema:
        return ["Schema must have a 'properties' field"]
    if not isinstance(schema["properties"], dict):
        return ["'properties' must be an object"]

    try:
        jsonschema.Draft7Validator.check_schema(schema)
    except SchemaValidationError as e:
        return [str(e)]

    return []


def validate_data_against_schema(data: dict, schema: dict) -> list[str]:
    validator = jsonschema.Draft7Validator(schema)
    errors = list(validator.iter_errors(data))
    return [f"{'.'.join(str(p) for p in e.path)}: {e.message}" for e in errors]
